import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { createHash } from "crypto";

const API_VERSION = "v20.0";
const BASE = `https://graph.facebook.com/${API_VERSION}`;

// Allow up to 5 minutes for heavy sync (Vercel Pro)
export const maxDuration = 300;

// ── In-memory cache (per-request warm layer, backed by DB) ──────────────────
const PAGE_NAME_MEM = new Map<string, string>();

// ── Page token cache (avoids hitting /me/accounts every sync) ────────────────
let PAGE_TOKEN_CACHE: { tokens: Record<string, string>; ts: number } | null = null;
const PAGE_TOKEN_TTL = 5 * 60 * 1000; // 5 minutes

function getToken() {
  const t = process.env.META_SYSTEM_USER_TOKEN;
  if (!t) throw new Error("META_SYSTEM_USER_TOKEN ยังไม่ได้ตั้งค่าใน .env.local");
  return t;
}

class RateLimitError extends Error {
  constructor(msg: string) { super(msg); this.name = "RateLimitError"; }
}

async function metaFetch(path: string) {
  const sep = path.includes("?") ? "&" : "?";
  const url = `${BASE}/${path}${sep}access_token=${getToken()}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  if (json.error) {
    if (json.error.code === 4 || json.error.code === 17) {
      throw new RateLimitError(`Meta API rate limit reached. กรุณารอ 10-15 นาทีแล้วลองใหม่`);
    }
    throw new Error(`Meta API: ${json.error.message} (code ${json.error.code})`);
  }
  return json;
}

/** Decode HTML entities */
function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(+dec))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function isInvalidPageName(name: string): boolean {
  const lower = name.toLowerCase().trim();
  if (lower.length === 0) return true;
  const blocked = ["facebook", "log in", "login", "sign up", "sign in", "เข้าสู่ระบบ", "สมัครสมาชิก", "meta business"];
  return blocked.some(b => lower.includes(b));
}

/** Manual fallback for pages that can't be resolved */
const MANUAL_PAGE_NAMES: Record<string, string> = {
  "455981200930418": "455981200930418",
};

// ── Page Name Resolution (DB-backed) ────────────────────────────────────────
async function getPageName(pageId: string): Promise<string> {
  if (!pageId) return "";

  // 1. Check in-memory cache (warm within this request)
  if (PAGE_NAME_MEM.has(pageId)) return PAGE_NAME_MEM.get(pageId)!;

  // 2. Check manual map
  if (MANUAL_PAGE_NAMES[pageId]) {
    PAGE_NAME_MEM.set(pageId, MANUAL_PAGE_NAMES[pageId]);
    return MANUAL_PAGE_NAMES[pageId];
  }

  // 3. Check DB cache (persistent across requests)
  try {
    const cached = await prisma.pageNameCache.findUnique({ where: { pageId } });
    if (cached) {
      PAGE_NAME_MEM.set(pageId, cached.pageName);
      return cached.pageName;
    }
  } catch { /* DB read failure, continue */ }

  // 4. Resolve from Meta Graph API
  try {
    const data = await metaFetch(`${pageId}?fields=id,name`);
    if (data.name) {
      await savePageName(pageId, data.name, "api");
      return data.name;
    }
  } catch { /* fallback below */ }

  // 5. Scrape og:title from m.facebook.com
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(`https://m.facebook.com/${pageId}`, {
      headers: { "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15" },
      redirect: "follow",
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const html = await res.text();

    const ogMatch = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i);
    if (ogMatch?.[1]) {
      const decoded = decodeHtmlEntities(ogMatch[1]);
      const name = decoded.replace(/\s*\|\s*[A-Z][\w\s,]*$/i, "").trim();
      if (!isInvalidPageName(name)) {
        await savePageName(pageId, name, "scrape");
        return name;
      }
    }
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch?.[1]) {
      const raw = decodeHtmlEntities(titleMatch[1]);
      const name = raw.replace(/\s*[|\-–]\s*Facebook.*$/i, "").replace(/\s*\|\s*[A-Z][\w\s,]*$/i, "").trim();
      if (name && !isInvalidPageName(name)) {
        await savePageName(pageId, name, "scrape");
        return name;
      }
    }
  } catch { /* timeout or error */ }

  // Don't cache failures — retry next sync
  return pageId;
}

/** Save resolved page name to both in-memory and DB cache */
async function savePageName(pageId: string, pageName: string, source: string) {
  PAGE_NAME_MEM.set(pageId, pageName);
  try {
    await prisma.pageNameCache.upsert({
      where: { pageId },
      create: { pageId, pageName, source },
      update: { pageName, source },
    });
  } catch { /* non-critical */ }
}

function actionValue(actions: any[], ...types: string[]): number {
  if (!Array.isArray(actions)) return 0;
  for (const type of types) {
    const found = actions.find((a: any) => a.action_type === type);
    if (found) return Math.round(parseFloat(found.value || "0"));
  }
  return 0;
}

// ── Process one ad account (DAILY granularity) ──────────────────────────────
async function syncAccount(
  account: any,
  since: string,
  until: string,
  pageTokens: Record<string, string>
): Promise<{ name: string; rows: number; adRows: number; status: string; error?: string }> {
  const actId       = `act_${account.account_id}`;
  const accountName = account.name ?? actId;

  try {
    // ── KEY CHANGE: time_increment=1 for daily breakdown ─────────────────
    const fields    = "campaign_id,campaign_name,spend,impressions,clicks,ctr,actions";
    const adFields  = "ad_id,ad_name,campaign_id,campaign_name,spend,impressions,clicks,ctr,actions";
    const timeRange = encodeURIComponent(JSON.stringify({ since, until }));

    const [campaignsRes, adsetsRes, insightsRes, adInsightsRes] = await Promise.all([
      metaFetch(`${actId}/campaigns?fields=id,status&limit=200`),
      metaFetch(`${actId}/adsets?fields=campaign_id,promoted_object{page_id}&limit=500`),
      metaFetch(`${actId}/insights?level=campaign&time_increment=1&fields=${fields}&time_range=${timeRange}&limit=500`),
      metaFetch(`${actId}/insights?level=ad&time_increment=1&fields=${adFields}&time_range=${timeRange}&limit=500`),
    ]);

    // ── Campaign status map ──────────────────────────────────────────────
    const statusMap: Record<string, string> = {};
    for (const c of campaignsRes.data ?? []) {
      const s = (c.status ?? "").toLowerCase();
      statusMap[c.id] = s === "active" ? "active" : s === "paused" ? "paused" : "ended";
    }

    const insights: any[] = insightsRes.data ?? [];

    // ── Build campaign → page_id map ─────────────────────────────────────
    const pgIdMap: Record<string, string> = {};
    for (const adset of adsetsRes.data ?? []) {
      if (adset.promoted_object?.page_id && !pgIdMap[adset.campaign_id]) {
        pgIdMap[adset.campaign_id] = adset.promoted_object.page_id;
      }
    }

    // (Old /ads thumbnail fetch removed — now done after insights below)

    // ── Resolve page names (all unique, in parallel) ─────────────────────
    const uniquePageIds = [...new Set(Object.values(pgIdMap))];
    await Promise.all(uniquePageIds.map(pid => getPageName(pid)));

    const fallbackPageId = uniquePageIds.length > 0 ? uniquePageIds[0] : "";

    if (insights.length === 0) {
      return { name: accountName, rows: 0, adRows: 0, status: "✅" };
    }

    // ── Upsert CAMPAIGN-LEVEL daily rows ─────────────────────────────────
    const UPSERT_BATCH = 30;
    let upsertCount = 0;

    for (let i = 0; i < insights.length; i += UPSERT_BATCH) {
      await Promise.all(insights.slice(i, i + UPSERT_BATCH).map(async row => {
        const actions     = row.actions ?? [];
        const spend       = parseFloat(row.spend ?? "0");
        const impressions = parseInt(row.impressions ?? "0", 10);
        const clicks      = parseInt(row.clicks ?? "0", 10);
        const ctr         = parseFloat(row.ctr ?? "0");
        const date        = row.date_start ?? since;

        const inbox = actionValue(actions,
          "onsite_conversion.messaging_conversation_started_7d",
          "onsite_conversion.messaging_first_reply",
          "omni_initiated_checkout",
        );
        const leads = actionValue(actions,
          "lead", "onsite_conversion.lead_grouped",
          "offsite_conversion.fb_pixel_lead",
        );

        const cpi    = inbox > 0 ? spend / inbox : 0;
        const cpl    = leads > 0 ? spend / leads : 0;
        const status = statusMap[row.campaign_id] ?? "active";

        const pgId   = pgIdMap[row.campaign_id] ?? fallbackPageId;
        const pgName = pgId ? (PAGE_NAME_MEM.get(pgId) ?? pgId) : accountName;

        await prisma.adsMetricDaily.upsert({
          where: {
            campaignId_date: {
              campaignId: row.campaign_id,
              date,
            },
          },
          create: {
            campaignId: row.campaign_id,
            date,
            clinicName: accountName,
            pageName: pgName,
            pageId: pgId,
            adAccountId: account.account_id,
            campaign: row.campaign_name ?? "Untitled",
            spend, inbox, leads, cpi, cpl,
            impressions, clicks, ctr, status,
          },
          update: {
            clinicName: accountName,
            pageName: pgName,
            pageId: pgId,
            adAccountId: account.account_id,
            campaign: row.campaign_name ?? "Untitled",
            spend, inbox, leads, cpi, cpl,
            impressions, clicks, ctr, status,
          },
        });

        upsertCount++;
      }));
    }

    // ── Upsert AD-LEVEL daily rows (creative + engagement) ───────────────
    const adInsights: any[] = adInsightsRes.data ?? [];
    let adUpsertCount = 0;

    // ── Always fetch fresh thumbnails (Facebook CDN URLs expire ~1hr) ─────
    const thumbnailMap: Record<string, string> = {};
    const mediaTypeMap: Record<string, string> = {};
    const uniqueAdIds = [...new Set(adInsights.map(r => r.ad_id).filter(Boolean))];

    // Pre-load mediaType from DB (doesn't expire, saves API calls for type detection)
    try {
      const cached = await prisma.adsContentDaily.findMany({
        where: { adId: { in: uniqueAdIds }, mediaType: { not: "" } },
        select: { adId: true, mediaType: true },
        distinct: ["adId"],
      });
      for (const c of cached) {
        if (c.mediaType) mediaTypeMap[c.adId] = c.mediaType;
      }
    } catch { /* non-critical */ }

    console.log(`🖼️ Fetching fresh thumbnails for ${uniqueAdIds.length} ads`);

    // ── Fetch fresh creative thumbnails for all ads ───────────────────────
    const imageHashMap: Record<string, string> = {};
    const creativeIds: Record<string, string> = {};
    if (uniqueAdIds.length > 0) {
      // Step 1: Get creative IDs (parallel batches of 50)
      const step1Batches: string[][] = [];
      for (let b = 0; b < uniqueAdIds.length; b += 50) {
        step1Batches.push(uniqueAdIds.slice(b, b + 50));
      }
      await Promise.all(step1Batches.map(async batch => {
        try {
          const url = `${BASE}/?ids=${batch.join(",")}&fields=creative{id}&access_token=${getToken()}`;
          const res = await fetch(url, { cache: "no-store" });
          if (res.ok) {
            const json = await res.json();
            for (const adId of batch) {
              const cid = json[adId]?.creative?.id;
              if (cid) creativeIds[adId] = cid;
            }
          }
        } catch { /* continue */ }
      }));
      console.log(`🖼️ Got ${Object.keys(creativeIds).length} creative IDs`);

      // Step 2: Fetch thumbnails from creatives (parallel batches of 50)
      const uniqueCreativeIds = [...new Set(Object.values(creativeIds))];
      const creativeUrlMap: Record<string, string> = {};
      const creativeTypeMap: Record<string, string> = {};
      const creativeHashMap: Record<string, string> = {};

      const step2Batches: string[][] = [];
      for (let b = 0; b < uniqueCreativeIds.length; b += 50) {
        step2Batches.push(uniqueCreativeIds.slice(b, b + 50));
      }
       await Promise.all(step2Batches.map(async batch => {
        try {
          const url = `${BASE}/?ids=${batch.join(",")}&fields=thumbnail_url,effective_object_story_id,object_type,video_id,image_hash&thumbnail_width=1080&thumbnail_height=1080&access_token=${getToken()}`;
          const res = await fetch(url, { cache: "no-store" });
          if (res.ok) {
            const json = await res.json();
            for (const cid of batch) {
              const data = json[cid];
              if (data?.thumbnail_url) creativeUrlMap[cid] = data.thumbnail_url;
              if (data?.image_hash) creativeHashMap[cid] = data.image_hash;
              const objType = (data?.object_type || "").toUpperCase();
              if (data?.video_id || objType === "VIDEO") creativeTypeMap[cid] = "video";
              else if (objType === "PHOTO" || objType === "SHARE") creativeTypeMap[cid] = "image";
              // Page ID fallback from effective_object_story_id
              const storyId = data?.effective_object_story_id || "";
              if (typeof storyId === "string" && storyId.includes("_")) {
                const adId = Object.keys(creativeIds).find(aid => creativeIds[aid] === cid);
                if (adId) {
                  const row = adInsights.find(r => r.ad_id === adId);
                  if (row && !pgIdMap[row.campaign_id]) {
                    pgIdMap[row.campaign_id] = storyId.split("_")[0];
                  }
                }
              }
            }
          }
        } catch { /* continue */ }
      }));

      // Map back: adId → URL + mediaType + imageHash
      for (const [adId, cid] of Object.entries(creativeIds)) {
        if (creativeUrlMap[cid]) thumbnailMap[adId] = creativeUrlMap[cid];
        if (creativeTypeMap[cid]) mediaTypeMap[adId] = creativeTypeMap[cid];
        if (creativeHashMap[cid]) imageHashMap[adId] = creativeHashMap[cid];
      }
      console.log(`🖼️ Fetched ${Object.keys(creativeUrlMap).length} thumbnails, ${Object.keys(creativeHashMap).length} image_hashes`);
    }

    console.log(`🖼️ Final: ${Object.keys(thumbnailMap).length}/${uniqueAdIds.length} ads have images`);

    // ── Compute perceptual hash for ALL images (unified format for fuzzy matching)
    const needPHash = Object.entries(thumbnailMap).filter(([, url]) => url);
    if (needPHash.length > 0) {
      console.log(`🔑 Computing pHash for ${needPHash.length} images...`);
      const sharp = (await import("sharp")).default;
      async function pHash(buf: Buffer): Promise<string> {
        const { data } = await sharp(buf).resize(16, 16, { fit: "fill" }).grayscale().raw().toBuffer({ resolveWithObject: true });
        const avg = data.reduce((s, v) => s + v, 0) / data.length;
        let hex = "";
        for (let i = 0; i < data.length; i += 4) {
          let nibble = 0;
          for (let j = 0; j < 4 && i + j < data.length; j++) nibble = (nibble << 1) | (data[i + j] >= avg ? 1 : 0);
          hex += nibble.toString(16);
        }
        return hex;
      }
      const PH_BATCH = 30;
      for (let b = 0; b < needPHash.length; b += PH_BATCH) {
        await Promise.all(needPHash.slice(b, b + PH_BATCH).map(async ([adId, url]) => {
          try {
            const res = await fetch(url, { cache: "no-store" });
            if (!res.ok) return;
            const buf = Buffer.from(await res.arrayBuffer());
            imageHashMap[adId] = `ph:${await pHash(buf)}`;
          } catch { /* skip */ }
        }));
      }
      console.log(`🔑 Computed pHash for ${Object.keys(imageHashMap).filter(k => imageHashMap[k].startsWith("ph:")).length} images`);
    }

    const UPSERT_AD_BATCH = 50;
    for (let i = 0; i < adInsights.length; i += UPSERT_AD_BATCH) {
      await Promise.all(adInsights.slice(i, i + UPSERT_AD_BATCH).map(async row => {
        const actions     = row.actions ?? [];
        const spend       = parseFloat(row.spend ?? "0");
        const impressions = parseInt(row.impressions ?? "0", 10);
        const clicks      = parseInt(row.clicks ?? "0", 10);
        const ctr         = parseFloat(row.ctr ?? "0");
        const date        = row.date_start ?? since;

        const inbox = actionValue(actions,
          "onsite_conversion.messaging_conversation_started_7d",
          "onsite_conversion.messaging_first_reply",
          "omni_initiated_checkout",
        );
        const leads = actionValue(actions,
          "lead", "onsite_conversion.lead_grouped",
          "offsite_conversion.fb_pixel_lead",
        );
        const likes      = actionValue(actions, "like", "page_engagement");
        const cmts       = actionValue(actions, "comment");
        const shares     = actionValue(actions, "post");
        const videoViews = actionValue(actions, "video_view");

        const cpi    = inbox > 0 ? spend / inbox : 0;
        const pgId   = pgIdMap[row.campaign_id] ?? fallbackPageId;
        const thumb  = thumbnailMap[row.ad_id] ?? "";
        const mType  = mediaTypeMap[row.ad_id] ?? "";
        const crtId  = creativeIds[row.ad_id] ?? "";
        const imgHash = imageHashMap[row.ad_id] ?? "";

        await prisma.adsContentDaily.upsert({
          where: {
            adId_date: {
              adId: row.ad_id,
              date,
            },
          },
          create: {
            adId: row.ad_id,
            date,
            campaignId: row.campaign_id,
            adAccountId: account.account_id,
            pageId: pgId,
            adName: row.ad_name ?? "Untitled",
            campaignName: row.campaign_name ?? "Untitled",
            thumbnailUrl: thumb,
            mediaType: mType,
            creativeId: crtId,
            imageHash: imgHash,
            spend, impressions, clicks, inbox, leads, cpi,
            likes, comments: cmts, shares, videoViews, ctr,
            status: statusMap[row.campaign_id] ?? "active",
          },
          update: {
            campaignId: row.campaign_id,
            adAccountId: account.account_id,
            pageId: pgId,
            adName: row.ad_name ?? "Untitled",
            campaignName: row.campaign_name ?? "Untitled",
            ...(thumb ? { thumbnailUrl: thumb } : {}),
            ...(mType ? { mediaType: mType } : {}),
            ...(crtId ? { creativeId: crtId } : {}),
            ...(imgHash ? { imageHash: imgHash } : {}),
            spend, impressions, clicks, inbox, leads, cpi,
            likes, comments: cmts, shares, videoViews, ctr,
            status: statusMap[row.campaign_id] ?? "active",
          },
        });

        adUpsertCount++;
      }));
    }

    return { name: accountName, rows: upsertCount, adRows: adUpsertCount, status: "✅" };

  } catch (err: any) {
    console.error(`❌ ${accountName}: ${err.message}`);
    return { name: accountName, rows: 0, adRows: 0, status: "❌", error: err.message };
  }
}

// ── GET /api/cron/sync-ads ──────────────────────────────────────────────────
// ?mode=cron  → sync last 3 days (hourly, for attribution corrections)
// ?mode=daily → sync current month + last month (daily, catches name changes)
// ?since=X&until=Y → sync specific range (manual button)
export async function GET(req: NextRequest) {
  const start = Date.now();
  console.log("📊 Starting Meta Ads Sync (daily)...");

  try {
    getToken();

    const { searchParams } = req.nextUrl;
    const mode  = searchParams.get("mode") ?? "manual";
    const today = new Date();
    const toISO = (d: Date) => d.toISOString().slice(0, 10);

    let since: string;
    let until: string;

    if (mode === "cron") {
      // Hourly cron: sync last 3 days to catch attribution corrections
      const threeDaysAgo = new Date(today);
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 2);
      since = toISO(threeDaysAgo);
      until = toISO(today);
    } else if (mode === "daily") {
      // Daily cron: sync current month + last month (catches name changes, data corrections)
      const firstOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      since = toISO(firstOfLastMonth);
      until = toISO(today);
    } else {
      // Manual mode: use provided range or default to current month
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      since = searchParams.get("since") || toISO(firstDay);
      until = searchParams.get("until") || toISO(today);
    }

    console.log(`📅 Mode: ${mode} | ${since} → ${until}`);

    const accountsRes = await metaFetch(
      "me/adaccounts?fields=name,account_id,account_status&limit=100"
    );
    const adAccounts: any[] = accountsRes.data ?? [];

    if (adAccounts.length === 0) {
      return NextResponse.json({ message: "ไม่พบ Ad Account", results: [] });
    }

    // ── Cleanup: remove data from accounts that lost access ──────────────
    const activeAccountIds = new Set(adAccounts.map((a: any) => a.account_id));
    const deleted = await prisma.adsMetricDaily.deleteMany({
      where: {
        adAccountId: { notIn: [...activeAccountIds] },
      },
    });
    if (deleted.count > 0) {
      console.log(`🧹 Cleaned up ${deleted.count} daily rows from revoked accounts`);
    }

    // ── Fetch page tokens ONCE (with 5-min cache) ───────────────────────
    let pageTokens: Record<string, string> = {};
    if (PAGE_TOKEN_CACHE && Date.now() - PAGE_TOKEN_CACHE.ts < PAGE_TOKEN_TTL) {
      pageTokens = PAGE_TOKEN_CACHE.tokens;
      console.log(`🖼️ Reusing cached ${Object.keys(pageTokens).length} page tokens`);
    } else {
      try {
        let ptUrl: string | null = `${BASE}/me/accounts?fields=id,access_token&limit=100&access_token=${getToken()}`;
        while (ptUrl) {
          const r: Response = await fetch(ptUrl, { cache: "no-store" });
          if (!r.ok) break;
          const j: any = await r.json();
          for (const p of j.data || []) pageTokens[p.id] = p.access_token;
          ptUrl = j.paging?.next || null;
        }
        if (Object.keys(pageTokens).length > 0) {
          PAGE_TOKEN_CACHE = { tokens: pageTokens, ts: Date.now() };
        }
      } catch { /* non-critical */ }
      console.log(`🖼️ Fetched ${Object.keys(pageTokens).length} page tokens (cached for 5min)`);
    }

    // ── Process accounts in parallel batches of 10 ───────────────────────
    const PARALLEL = 5;
    const results: any[] = [];

    for (let i = 0; i < adAccounts.length; i += PARALLEL) {
      const batch = adAccounts.slice(i, i + PARALLEL);
      const batchResults = await Promise.all(
        batch.map(acc => syncAccount(acc, since, until, pageTokens))
      );
      results.push(...batchResults);
    }

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    const totalRows = results.reduce((s, r) => s + r.rows, 0);
    const totalAdRows = results.reduce((s, r) => s + (r.adRows ?? 0), 0);
    console.log(`🏁 Done in ${elapsed}s — ${results.length} accounts, ${totalRows} campaign rows, ${totalAdRows} ad rows`);

    return NextResponse.json({
      message: `✅ Sync ${since} → ${until} — ${results.length} accounts, ${totalRows} campaign rows, ${totalAdRows} ad rows (${elapsed}s)`,
      results, since, until, mode,
    });

  } catch (err: any) {
    const isRateLimit = err instanceof RateLimitError || err.message?.includes("rate limit");
    console.error(isRateLimit ? "⚠️ Rate limited:" : "❌ Sync error:", err.message);
    return NextResponse.json(
      { error: err.message },
      { status: isRateLimit ? 429 : 500 }
    );
  }
}
