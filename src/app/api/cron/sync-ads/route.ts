import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";

const API_VERSION = "v20.0";
const BASE = `https://graph.facebook.com/${API_VERSION}`;

// Allow up to 5 minutes for heavy sync (Vercel Pro)
export const maxDuration = 300;

// ── In-memory cache (per-request warm layer, backed by DB) ──────────────────
const PAGE_NAME_MEM = new Map<string, string>();

function getToken() {
  const t = process.env.META_SYSTEM_USER_TOKEN;
  if (!t) throw new Error("META_SYSTEM_USER_TOKEN ยังไม่ได้ตั้งค่าใน .env.local");
  return t;
}

// ── Page Name Resolution (DB-backed) ────────────────────────────────────────
async function getPageName(pageId: string): Promise<string> {
  if (!pageId) return "";
  if (PAGE_NAME_MEM.has(pageId)) return PAGE_NAME_MEM.get(pageId)!;

  // Check DB cache
  try {
    const cached = await prisma.pageNameCache.findUnique({ where: { pageId } });
    if (cached) { PAGE_NAME_MEM.set(pageId, cached.pageName); return cached.pageName; }
  } catch { /* continue */ }

  // Resolve from Meta Graph API
  try {
    const res = await fetch(`${BASE}/${pageId}?fields=id,name&access_token=${getToken()}`, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      if (data.name) {
        PAGE_NAME_MEM.set(pageId, data.name);
        try {
          await prisma.pageNameCache.upsert({
            where: { pageId },
            create: { pageId, pageName: data.name, source: "api" },
            update: { pageName: data.name, source: "api" },
          });
        } catch { /* non-critical */ }
        return data.name;
      }
    }
  } catch { /* fallback below */ }

  return pageId; // fallback: use ID
}

function actionValue(actions: any[], ...types: string[]): number {
  if (!Array.isArray(actions)) return 0;
  for (const type of types) {
    const found = actions.find((a: any) => a.action_type === type);
    if (found) return Math.round(parseFloat(found.value || "0"));
  }
  return 0;
}

// ── Korrakot-DB style: single API call per account ──────────────────────────
interface AccountInsight {
  accountId: string;
  accountName: string;
  adId: string;
  adName: string;
  campaignId: string;
  campaignName: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  inbox: number;
  cpi: number;
  leads: number;
  cpl: number;
  likes: number;
  comments: number;
  shares: number;
  videoViews: number;
  date: string;
}

async function fetchInsightsForAccount(
  accountId: string,
  accountName: string,
  since: string,
  until: string
): Promise<AccountInsight[]> {
  const fields = "ad_id,ad_name,campaign_id,campaign_name,spend,impressions,clicks,ctr,actions";
  const timeRange = encodeURIComponent(JSON.stringify({ since, until }));
  // Single call: level=ad + time_increment=1 gives daily ad-level breakdown
  const url = `${BASE}/act_${accountId}/insights?level=ad&time_increment=1&fields=${fields}&time_range=${timeRange}&limit=500&access_token=${getToken()}`;

  const insights: AccountInsight[] = [];
  let nextUrl: string | null = url;
  let pages = 0;

  while (nextUrl && pages < 10) {
    const res: Response = await fetch(nextUrl, { cache: "no-store" });
    if (!res.ok) {
      console.warn(`⚠️ ${accountName}: HTTP ${res.status}`);
      break;
    }
    const data = await res.json();
    if (data.error) {
      console.warn(`⚠️ ${accountName}: ${data.error.message}`);
      break;
    }

    for (const row of data.data || []) {
      if (!row.ad_id) continue;
      const actions = row.actions ?? [];
      const spend = parseFloat(row.spend || "0");
      const impressions = parseInt(row.impressions || "0");
      const clicks = parseInt(row.clicks || "0");
      const ctr = parseFloat(row.ctr || "0");

      const inbox = actionValue(actions,
        "onsite_conversion.messaging_conversation_started_7d",
        "onsite_conversion.messaging_first_reply",
        "omni_initiated_checkout",
      );
      const leads = actionValue(actions,
        "lead", "onsite_conversion.lead_grouped",
        "offsite_conversion.fb_pixel_lead",
      );

      insights.push({
        accountId,
        accountName,
        adId: row.ad_id,
        adName: row.ad_name || "Untitled",
        campaignId: row.campaign_id,
        campaignName: row.campaign_name || "Untitled",
        spend,
        impressions,
        clicks,
        ctr,
        inbox,
        cpi: inbox > 0 ? spend / inbox : 0,
        leads,
        cpl: leads > 0 ? spend / leads : 0,
        likes: actionValue(actions, "like", "page_engagement"),
        comments: actionValue(actions, "comment"),
        shares: actionValue(actions, "post"),
        videoViews: actionValue(actions, "video_view"),
        date: row.date_start || since,
      });
    }

    nextUrl = data.paging?.next || null;
    pages++;
  }

  return insights;
}

// ── GET /api/cron/sync-ads ──────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const start = Date.now();
  console.log("📊 Starting Meta Ads Sync...");

  try {
    getToken();

    const { searchParams } = req.nextUrl;
    const today = new Date();
    const toISO = (d: Date) => d.toISOString().slice(0, 10);

    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const since = searchParams.get("since") || toISO(firstDay);
    const until = searchParams.get("until") || toISO(today);

    console.log(`📅 ${since} → ${until}`);

    // ── Step 1: Get all ad accounts ─────────────────────────────────────
    const accountsRes = await fetch(
      `${BASE}/me/adaccounts?fields=name,account_id,account_status&limit=100&access_token=${getToken()}`,
      { cache: "no-store" }
    );
    if (!accountsRes.ok) throw new Error(`HTTP ${accountsRes.status}`);
    const accountsJson = await accountsRes.json();
    if (accountsJson.error) throw new Error(accountsJson.error.message);

    const adAccounts: any[] = (accountsJson.data ?? []).filter(
      (a: any) => a.account_status !== 2 // Skip DISABLED accounts
    );

    if (adAccounts.length === 0) {
      return NextResponse.json({ message: "ไม่พบ Ad Account", results: [] });
    }

    console.log(`📋 Found ${adAccounts.length} ad accounts`);

    // ── Step 2: Fetch insights for ALL accounts in parallel (Korrakot-DB style) ─
    const results = await Promise.allSettled(
      adAccounts.map((acc) =>
        fetchInsightsForAccount(acc.account_id, acc.name ?? acc.account_id, since, until)
      )
    );

    // Flatten all insights
    const allInsights: AccountInsight[] = [];
    const accountSummary: any[] = [];

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const accName = adAccounts[i].name ?? adAccounts[i].account_id;
      if (result.status === "fulfilled") {
        allInsights.push(...result.value);
        accountSummary.push({ name: accName, rows: result.value.length, status: "✅" });
      } else {
        console.warn(`❌ ${accName}: ${result.reason}`);
        accountSummary.push({ name: accName, rows: 0, status: "❌", error: String(result.reason) });
      }
    }

    const fetchElapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`⚡ Fetched ${allInsights.length} rows from ${adAccounts.length} accounts in ${fetchElapsed}s`);

    // ── Step 3: Build pageId map from adsets (parallel for all accounts) ──
    const pgIdMap: Record<string, string> = {};
    const uniqueAccountIds = [...new Set(adAccounts.map((a: any) => a.account_id))];

    await Promise.allSettled(
      uniqueAccountIds.map(async (accId) => {
        try {
          const res = await fetch(
            `${BASE}/act_${accId}/adsets?fields=campaign_id,promoted_object{page_id}&limit=500&access_token=${getToken()}`,
            { cache: "no-store" }
          );
          if (!res.ok) return;
          const json = await res.json();
          for (const adset of json.data ?? []) {
            if (adset.promoted_object?.page_id && !pgIdMap[adset.campaign_id]) {
              pgIdMap[adset.campaign_id] = adset.promoted_object.page_id;
            }
          }
        } catch { /* non-critical */ }
      })
    );

    // ── Step 4: Resolve page names ──────────────────────────────────────
    const uniquePageIds = [...new Set(Object.values(pgIdMap))];
    await Promise.all(uniquePageIds.map((pid) => getPageName(pid)));

    // ── Step 5: Aggregate campaign-level data from ad insights ───────────
    type CampaignKey = string; // "campaignId|date"
    const campaignAgg = new Map<CampaignKey, {
      campaignId: string; date: string; campaignName: string;
      accountId: string; accountName: string;
      spend: number; impressions: number; clicks: number; ctr: number;
      inbox: number; leads: number;
    }>();

    for (const row of allInsights) {
      const key = `${row.campaignId}|${row.date}`;
      const existing = campaignAgg.get(key);
      if (existing) {
        existing.spend += row.spend;
        existing.impressions += row.impressions;
        existing.clicks += row.clicks;
        existing.inbox += row.inbox;
        existing.leads += row.leads;
      } else {
        campaignAgg.set(key, {
          campaignId: row.campaignId, date: row.date,
          campaignName: row.campaignName,
          accountId: row.accountId, accountName: row.accountName,
          spend: row.spend, impressions: row.impressions, clicks: row.clicks,
          ctr: row.ctr, inbox: row.inbox, leads: row.leads,
        });
      }
    }

    // ── Step 6: Upsert campaign-level (AdsMetricDaily) ──────────────────
    const BATCH = 50;
    const campaigns = [...campaignAgg.values()];
    let campaignUpserts = 0;

    for (let i = 0; i < campaigns.length; i += BATCH) {
      await Promise.all(campaigns.slice(i, i + BATCH).map(async (c) => {
        const pgId = pgIdMap[c.campaignId] ?? "";
        const pgName = pgId ? (PAGE_NAME_MEM.get(pgId) ?? pgId) : c.accountName;
        const cpi = c.inbox > 0 ? c.spend / c.inbox : 0;
        const cpl = c.leads > 0 ? c.spend / c.leads : 0;

        await prisma.adsMetricDaily.upsert({
          where: { campaignId_date: { campaignId: c.campaignId, date: c.date } },
          create: {
            campaignId: c.campaignId, date: c.date,
            clinicName: c.accountName, pageName: pgName, pageId: pgId,
            adAccountId: c.accountId, campaign: c.campaignName,
            spend: c.spend, inbox: c.inbox, leads: c.leads, cpi, cpl,
            impressions: c.impressions, clicks: c.clicks, ctr: c.ctr,
            status: "active",
          },
          update: {
            clinicName: c.accountName, pageName: pgName, pageId: pgId,
            adAccountId: c.accountId, campaign: c.campaignName,
            spend: c.spend, inbox: c.inbox, leads: c.leads, cpi, cpl,
            impressions: c.impressions, clicks: c.clicks, ctr: c.ctr,
          },
        });
        campaignUpserts++;
      }));
    }

    // ── Step 7: Upsert ad-level (AdsContentDaily) ───────────────────────
    let adUpserts = 0;

    for (let i = 0; i < allInsights.length; i += BATCH) {
      await Promise.all(allInsights.slice(i, i + BATCH).map(async (row) => {
        const pgId = pgIdMap[row.campaignId] ?? "";

        await prisma.adsContentDaily.upsert({
          where: { adId_date: { adId: row.adId, date: row.date } },
          create: {
            adId: row.adId, date: row.date,
            campaignId: row.campaignId, adAccountId: row.accountId,
            pageId: pgId, adName: row.adName, campaignName: row.campaignName,
            spend: row.spend, impressions: row.impressions, clicks: row.clicks,
            inbox: row.inbox, leads: row.leads, cpi: row.cpi,
            likes: row.likes, comments: row.comments, shares: row.shares,
            videoViews: row.videoViews, ctr: row.ctr,
            status: "active",
          },
          update: {
            campaignId: row.campaignId, adAccountId: row.accountId,
            pageId: pgId, adName: row.adName, campaignName: row.campaignName,
            spend: row.spend, impressions: row.impressions, clicks: row.clicks,
            inbox: row.inbox, leads: row.leads, cpi: row.cpi,
            likes: row.likes, comments: row.comments, shares: row.shares,
            videoViews: row.videoViews, ctr: row.ctr,
          },
        });
        adUpserts++;
      }));
    }

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`🏁 Done in ${elapsed}s — ${adAccounts.length} accounts, ${campaignUpserts} campaigns, ${adUpserts} ads`);

    return NextResponse.json({
      message: `✅ Sync ${since} → ${until} — ${adAccounts.length} accounts, ${campaignUpserts} campaign rows, ${adUpserts} ad rows (${elapsed}s)`,
      results: accountSummary, since, until,
    });

  } catch (err: any) {
    console.error("❌ Sync error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
