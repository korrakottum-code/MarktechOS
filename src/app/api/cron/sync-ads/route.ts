import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { Prisma } from "@prisma/client";

const API_VERSION = "v20.0";
const BASE = `https://graph.facebook.com/${API_VERSION}`;

// Allow up to 5 minutes for heavy sync (Vercel Pro)
export const maxDuration = 300;

function getToken() {
  const t = process.env.META_SYSTEM_USER_TOKEN;
  if (!t) throw new Error("META_SYSTEM_USER_TOKEN ยังไม่ได้ตั้งค่าใน .env.local");
  return t;
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
  const url = `${BASE}/act_${accountId}/insights?level=ad&time_increment=1&fields=${fields}&time_range=${timeRange}&limit=1000&access_token=${getToken()}`;

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

// ── Bulk Upsert helpers ─────────────────────────────────────────────────────
function escSql(v: any): string {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "number") return isFinite(v) ? String(v) : "0";
  return `'${String(v).replace(/'/g, "''")}'`;
}

async function bulkUpsertMetricDaily(rows: any[]) {
  if (rows.length === 0) return;
  const BATCH = 500;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const values = batch.map(c =>
      `(${escSql(c.campaignId)},${escSql(c.date)},${escSql(c.clinicName)},${escSql(c.pageName)},${escSql(c.pageId)},${escSql(c.adAccountId)},${escSql(c.campaign)},${c.spend},${c.inbox},${c.leads},${c.cpl},${c.cpi},${c.impressions},${c.clicks},${c.ctr},${escSql(c.status)},NOW(),NOW())`
    ).join(",\n");

    await prisma.$executeRawUnsafe(`
      INSERT INTO "AdsMetricDaily" ("campaignId","date","clinicName","pageName","pageId","adAccountId","campaign","spend","inbox","leads","cpl","cpi","impressions","clicks","ctr","status","createdAt","updatedAt")
      VALUES ${values}
      ON CONFLICT ("campaignId","date") DO UPDATE SET
        "clinicName"=EXCLUDED."clinicName","pageName"=EXCLUDED."pageName","pageId"=EXCLUDED."pageId",
        "adAccountId"=EXCLUDED."adAccountId","campaign"=EXCLUDED."campaign",
        "spend"=EXCLUDED."spend","inbox"=EXCLUDED."inbox","leads"=EXCLUDED."leads",
        "cpl"=EXCLUDED."cpl","cpi"=EXCLUDED."cpi",
        "impressions"=EXCLUDED."impressions","clicks"=EXCLUDED."clicks","ctr"=EXCLUDED."ctr",
        "updatedAt"=NOW()
    `);
  }
}

async function bulkUpsertContentDaily(rows: any[]) {
  if (rows.length === 0) return;
  const BATCH = 500;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const values = batch.map(r =>
      `(${escSql(r.adId)},${escSql(r.date)},${escSql(r.campaignId)},${escSql(r.adAccountId)},${escSql(r.pageId)},${escSql(r.adName)},${escSql(r.campaignName)},${r.spend},${r.impressions},${r.clicks},${r.inbox},${r.leads},${r.cpi},${r.likes},${r.comments},${r.shares},${r.videoViews},${r.ctr},${escSql(r.status)},NOW(),NOW())`
    ).join(",\n");

    await prisma.$executeRawUnsafe(`
      INSERT INTO "AdsContentDaily" ("adId","date","campaignId","adAccountId","pageId","adName","campaignName","spend","impressions","clicks","inbox","leads","cpi","likes","comments","shares","videoViews","ctr","status","createdAt","updatedAt")
      VALUES ${values}
      ON CONFLICT ("adId","date") DO UPDATE SET
        "campaignId"=EXCLUDED."campaignId","adAccountId"=EXCLUDED."adAccountId","pageId"=EXCLUDED."pageId",
        "adName"=EXCLUDED."adName","campaignName"=EXCLUDED."campaignName",
        "spend"=EXCLUDED."spend","impressions"=EXCLUDED."impressions","clicks"=EXCLUDED."clicks",
        "inbox"=EXCLUDED."inbox","leads"=EXCLUDED."leads","cpi"=EXCLUDED."cpi",
        "likes"=EXCLUDED."likes","comments"=EXCLUDED."comments","shares"=EXCLUDED."shares",
        "videoViews"=EXCLUDED."videoViews","ctr"=EXCLUDED."ctr",
        "updatedAt"=NOW()
    `);
  }
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

    // Default: last 3 days (Meta attribution window)
    const threeDaysAgo = new Date(today.getTime() - 3 * 86400000);
    const since = searchParams.get("since") || toISO(threeDaysAgo);
    const until = searchParams.get("until") || toISO(today);

    console.log(`📅 ${since} → ${until}`);

    // ── Pre-load caches from DB ─────────────────────────────────────────
    // 1. campaign→pageId cache (avoid adset API calls for known campaigns)
    const existingMappings = await prisma.$queryRaw<{ campaignId: string; pageId: string }[]>(
      Prisma.sql`SELECT DISTINCT "campaignId", "pageId" FROM "AdsMetricDaily" WHERE "pageId" != ''`
    );
    const pgIdMap: Record<string, string> = {};
    for (const m of existingMappings) pgIdMap[m.campaignId] = m.pageId;
    console.log(`📦 Loaded ${existingMappings.length} cached campaign→pageId mappings`);

    // 2. Page name cache (batch load all)
    const allPageNames = await prisma.pageNameCache.findMany();
    const pageNameMap = new Map<string, string>();
    for (const p of allPageNames) pageNameMap.set(p.pageId, p.pageName);
    console.log(`📦 Loaded ${allPageNames.length} cached page names`);

    // ── Step 1: Get all ad accounts ─────────────────────────────────────
    const accountsRes = await fetch(
      `${BASE}/me/adaccounts?fields=name,account_id,account_status&limit=100&access_token=${getToken()}`,
      { cache: "no-store" }
    );
    if (!accountsRes.ok) throw new Error(`HTTP ${accountsRes.status}`);
    const accountsJson = await accountsRes.json();
    if (accountsJson.error) throw new Error(accountsJson.error.message);

    const adAccounts: any[] = (accountsJson.data ?? []).filter(
      (a: any) => a.account_status !== 2
    );

    if (adAccounts.length === 0) {
      return NextResponse.json({ message: "ไม่พบ Ad Account", results: [] });
    }

    console.log(`📋 Found ${adAccounts.length} ad accounts`);

    // ── Step 2: Fetch insights for ALL accounts in parallel ─────────────
    const results = await Promise.allSettled(
      adAccounts.map((acc) =>
        fetchInsightsForAccount(acc.account_id, acc.name ?? acc.account_id, since, until)
      )
    );

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

    // ── Step 3: Build pageId map from adsets (only for NEW campaigns) ───
    const newCampaignIds = new Set<string>();
    for (const row of allInsights) {
      if (!pgIdMap[row.campaignId]) newCampaignIds.add(row.campaignId);
    }

    if (newCampaignIds.size > 0) {
      // Find which accounts have new campaigns
      const accountsWithNew = new Set<string>();
      for (const row of allInsights) {
        if (newCampaignIds.has(row.campaignId)) accountsWithNew.add(row.accountId);
      }

      console.log(`🔍 ${newCampaignIds.size} new campaigns in ${accountsWithNew.size} accounts — fetching adsets`);

      await Promise.allSettled(
        [...accountsWithNew].map(async (accId) => {
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
    } else {
      console.log(`✅ All campaigns already have pageId cached — skipping adset fetch`);
    }

    // ── Step 4: Resolve page names (batch) ──────────────────────────────
    const uniquePageIds = [...new Set(Object.values(pgIdMap))];
    const unknownPageIds = uniquePageIds.filter(id => !pageNameMap.has(id));

    if (unknownPageIds.length > 0) {
      // Batch Graph API: /?ids=id1,id2,id3&fields=name
      try {
        const batchRes = await fetch(
          `${BASE}/?ids=${unknownPageIds.join(",")}&fields=name&access_token=${getToken()}`,
          { cache: "no-store" }
        );
        if (batchRes.ok) {
          const batchData = await batchRes.json();
          const newCacheEntries: { pageId: string; pageName: string }[] = [];
          for (const [id, info] of Object.entries(batchData) as [string, any][]) {
            if (info.name) {
              pageNameMap.set(id, info.name);
              newCacheEntries.push({ pageId: id, pageName: info.name });
            }
          }
          // Persist to DB
          if (newCacheEntries.length > 0) {
            const vals = newCacheEntries.map(e =>
              `(${escSql(e.pageId)},${escSql(e.pageName)},'api',NOW(),NOW())`
            ).join(",");
            try {
              await prisma.$executeRawUnsafe(`
                INSERT INTO "PageNameCache" ("pageId","pageName","source","createdAt","updatedAt")
                VALUES ${vals}
                ON CONFLICT ("pageId") DO UPDATE SET "pageName"=EXCLUDED."pageName","updatedAt"=NOW()
              `);
            } catch { /* non-critical */ }
          }
          console.log(`📛 Resolved ${newCacheEntries.length} new page names`);
        }
      } catch { /* non-critical */ }
    }

    // ── Step 5: Aggregate campaign-level data from ad insights ───────────
    type CampaignKey = string;
    const campaignAgg = new Map<CampaignKey, {
      campaignId: string; date: string; campaignName: string;
      accountId: string; accountName: string;
      spend: number; impressions: number; clicks: number;
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
          inbox: row.inbox, leads: row.leads,
        });
      }
    }

    // ── Step 6: Bulk upsert campaign-level (AdsMetricDaily) ─────────────
    const campaignRows = [...campaignAgg.values()].map(c => {
      const pgId = pgIdMap[c.campaignId] ?? "";
      const pgName = pgId ? (pageNameMap.get(pgId) ?? pgId) : c.accountName;
      const cpi = c.inbox > 0 ? c.spend / c.inbox : 0;
      const cpl = c.leads > 0 ? c.spend / c.leads : 0;
      const ctr = c.impressions > 0 ? (c.clicks / c.impressions) * 100 : 0;
      return {
        campaignId: c.campaignId, date: c.date,
        clinicName: c.accountName, pageName: pgName, pageId: pgId,
        adAccountId: c.accountId, campaign: c.campaignName,
        spend: c.spend, inbox: c.inbox, leads: c.leads, cpi, cpl,
        impressions: c.impressions, clicks: c.clicks, ctr,
        status: "active",
      };
    });

    await bulkUpsertMetricDaily(campaignRows);
    console.log(`📝 Upserted ${campaignRows.length} campaign rows (bulk)`);

    // ── Step 7: Bulk upsert ad-level (AdsContentDaily) ──────────────────
    const adRows = allInsights.map(row => {
      const pgId = pgIdMap[row.campaignId] ?? "";
      return {
        adId: row.adId, date: row.date,
        campaignId: row.campaignId, adAccountId: row.accountId,
        pageId: pgId, adName: row.adName, campaignName: row.campaignName,
        spend: row.spend, impressions: row.impressions, clicks: row.clicks,
        inbox: row.inbox, leads: row.leads, cpi: row.cpi,
        likes: row.likes, comments: row.comments, shares: row.shares,
        videoViews: row.videoViews, ctr: row.ctr,
        status: "active",
      };
    });

    await bulkUpsertContentDaily(adRows);
    console.log(`📝 Upserted ${adRows.length} ad rows (bulk)`);

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`🏁 Done in ${elapsed}s — ${adAccounts.length} accounts, ${campaignRows.length} campaigns, ${adRows.length} ads`);

    return NextResponse.json({
      message: `✅ Sync ${since} → ${until} — ${adAccounts.length} accounts, ${campaignRows.length} campaign rows, ${adRows.length} ad rows (${elapsed}s)`,
      results: accountSummary, since, until,
    });

  } catch (err: any) {
    console.error("❌ Sync error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
