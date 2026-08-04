import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { Prisma } from "@prisma/client";
import { createHash } from "crypto";
import sharp from "sharp";
import { createClient } from "@/utils/supabase/server";

// Compute perceptual hash (dHash 16x16) from image buffer
// dHash compares adjacent pixel brightness — much better than aHash for similar-color images
async function computePHashFromBuffer(buffer: Buffer): Promise<string | null> {
  try {
    const W = 17, H = 16; // 17 wide to get 16 horizontal differences per row
    const pixels = await sharp(buffer)
      .resize(W, H, { fit: 'fill' })
      .grayscale()
      .raw()
      .toBuffer();
    // Compare adjacent horizontal pixels → 16*16 = 256 bits
    const bits: number[] = [];
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W - 1; x++) {
        const idx = y * W + x;
        bits.push(pixels[idx] > pixels[idx + 1] ? 1 : 0);
      }
    }
    // Convert 256 bits to 64 hex chars
    let hex = '';
    for (let i = 0; i < bits.length; i += 4) {
      const nibble = (bits[i] << 3) | (bits[i+1] << 2) | (bits[i+2] << 1) | bits[i+3];
      hex += nibble.toString(16);
    }
    return 'phash:' + hex;
  } catch { return null; }
}

const API_VERSION = "v20.0";
const BASE = `https://graph.facebook.com/${API_VERSION}`;
const META_TIMEOUT_MS = 30_000;
const META_RETRY_ATTEMPTS = 3;
const SYNC_LEASE_MS = 6 * 60 * 1000;
const ACCOUNT_FETCH_CONCURRENCY = 8;
const HASH_CACHE_BATCH_SIZE = 500;
const DB_TRANSACTION_TIMEOUT_MS = 120_000;

// Allow up to 5 minutes for heavy sync (Vercel Pro)
export const maxDuration = 300;

async function allSettledWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<PromiseSettledResult<R>[]> {
  const results = new Array<PromiseSettledResult<R>>(items.length);
  let nextIndex = 0;

  async function runWorker() {
    while (true) {
      const index = nextIndex++;
      if (index >= items.length) return;
      try {
        results[index] = { status: "fulfilled", value: await worker(items[index], index) };
      } catch (reason) {
        results[index] = { status: "rejected", reason };
      }
    }
  }

  const workerCount = Math.min(Math.max(1, concurrency), items.length);
  await Promise.all(Array.from({ length: workerCount }, () => runWorker()));
  return results;
}

function getTokens(): string[] {
  const tokens: string[] = [];
  const t1 = process.env.META_SYSTEM_USER_TOKEN;
  if (t1) tokens.push(t1);
  const t2 = process.env.META_SYSTEM_USER_TOKEN_2;
  if (t2) tokens.push(t2);
  const t3 = process.env.META_SYSTEM_USER_TOKEN_3;
  if (t3) tokens.push(t3);
  if (tokens.length === 0) throw new Error("META_SYSTEM_USER_TOKEN ยังไม่ได้ตั้งค่าใน .env.local");
  return tokens;
}

async function requireSyncAuthorization(req: NextRequest): Promise<NextResponse | null> {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.headers.get("authorization") === `Bearer ${cronSecret}`) return null;

  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  const role = user?.app_metadata?.role;
  if (!error && user && (user.email === "korrakottum@gmail.com" || role === "ceo" || role === "admin")) return null;

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

async function fetchMeta(url: string): Promise<Response> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < META_RETRY_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(url, {
        cache: "no-store",
        signal: AbortSignal.timeout(META_TIMEOUT_MS),
      });
      if (res.ok || (res.status < 500 && res.status !== 429)) return res;
      lastError = new Error(`Meta HTTP ${res.status}`);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Meta request failed");
    }
    await new Promise(resolve => setTimeout(resolve, 500 * 2 ** attempt));
  }
  throw lastError ?? new Error("Meta request failed");
}

function normalizedStatus(status: unknown): "active" | "paused" | "ended" | "unknown" {
  switch (String(status || "").toUpperCase()) {
    case "ACTIVE": return "active";
    case "PAUSED": return "paused";
    case "DELETED":
    case "ARCHIVED":
    case "COMPLETED":
    case "ENDED": return "ended";
    default: return "unknown";
  }
}

function aggregateStatus(statuses: Set<string>): "active" | "paused" | "ended" | "unknown" {
  if (statuses.has("active")) return "active";
  if (statuses.has("paused")) return "paused";
  if (statuses.has("ended")) return "ended";
  return "unknown";
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
  status: "active" | "paused" | "ended" | "unknown";
}

async function fetchInsightsForAccount(
  accountId: string,
  accountName: string,
  since: string,
  until: string,
  token: string
): Promise<AccountInsight[]> {
  const fields = "ad_id,ad_name,campaign_id,campaign_name,spend,impressions,clicks,ctr,actions";
  const timeRange = encodeURIComponent(JSON.stringify({ since, until }));
  const url = `${BASE}/act_${accountId}/insights?level=ad&time_increment=1&fields=${fields}&time_range=${timeRange}&limit=1000&access_token=${token}`;

  const insights: AccountInsight[] = [];
  let nextUrl: string | null = url;
  while (nextUrl) {
    const res = await fetchMeta(nextUrl);
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const detail = data?.error?.message ?? data?.error?.error_user_msg ?? `HTTP ${res.status}`;
      throw new Error(`${accountName}: ${detail}`);
    }
    if (data?.error) {
      throw new Error(`${accountName}: ${data.error.message ?? "Meta API error"}`);
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
        // Insight rows do not include effective_status. This is filled from the
        // ad object during the creative lookup below.
        status: "unknown",
      });
    }

    nextUrl = data.paging?.next || null;
  }

  return insights;
}

// ── Scrape page name from Facebook mobile (fallback when API fails) ─────────
async function scrapePageName(pageId: string): Promise<string | null> {
  try {
    const res = await fetch(`https://m.facebook.com/${pageId}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
      },
      redirect: "follow",
      cache: "no-store",
    });
    if (!res.ok) return null;
    const html = await res.text();
    // Try og:title first (more reliable), then <title>
    const match = html.match(/property="og:title"\s+content="([^"]+)"/)
      || html.match(/content="([^"]+)"\s+property="og:title"/)
      || html.match(/<title>([^<]+)<\/title>/);
    if (!match) return null;
    let name = match[1].trim()
      // Decode HTML entities: named, hex (&#xHH;), and decimal (&#DDD;)
      .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
      .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec)))
      .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"').replace(/&#039;/g, "'");
    // Reject known Facebook login/error page titles
    const invalidNames = [
      "facebook", "log in to facebook", "log into facebook",
      "เข้าสู่ระบบ facebook", "เกิดข้อผิดพลาด", "page not found",
      "content not found", "ลงชื่อเข้าใช้ facebook",
    ];
    if (!name || invalidNames.includes(name.toLowerCase())) return null;
    // Remove " | City" suffix only (keep the rest of the name)
    name = name.replace(/\s*\|\s*[^|]+$/, "").trim();
    return name || null;
  } catch { return null; }
}

// ── Bulk Upsert helpers ─────────────────────────────────────────────────────
function escSql(v: any): string {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "number") return isFinite(v) ? String(v) : "0";
  return `'${String(v).replace(/'/g, "''")}'`;
}

async function bulkUpsertMetricDaily(rows: any[], client: Prisma.TransactionClient | typeof prisma = prisma) {
  if (rows.length === 0) return;
  const BATCH = 500;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const values = batch.map(c =>
      `(${escSql(c.campaignId)},${escSql(c.date)},${escSql(c.clinicName)},${escSql(c.pageName)},${escSql(c.pageId)},${escSql(c.adAccountId)},${escSql(c.campaign)},${c.spend},${c.inbox},${c.leads},${c.cpl},${c.cpi},${c.impressions},${c.clicks},${c.ctr},${escSql(c.status)},NOW(),NOW())`
    ).join(",\n");

    await client.$executeRawUnsafe(`
      INSERT INTO "AdsMetricDaily" ("campaignId","date","clinicName","pageName","pageId","adAccountId","campaign","spend","inbox","leads","cpl","cpi","impressions","clicks","ctr","status","createdAt","updatedAt")
      VALUES ${values}
      ON CONFLICT ("campaignId","date") DO UPDATE SET
        "clinicName"=EXCLUDED."clinicName","pageName"=EXCLUDED."pageName","pageId"=EXCLUDED."pageId",
        "adAccountId"=EXCLUDED."adAccountId","campaign"=EXCLUDED."campaign",
        "spend"=EXCLUDED."spend","inbox"=EXCLUDED."inbox","leads"=EXCLUDED."leads",
        "cpl"=EXCLUDED."cpl","cpi"=EXCLUDED."cpi",
        "impressions"=EXCLUDED."impressions","clicks"=EXCLUDED."clicks","ctr"=EXCLUDED."ctr",
        "status"=EXCLUDED."status",
        "updatedAt"=NOW()
    `);
  }
}

async function bulkUpsertContentDaily(rows: any[], client: Prisma.TransactionClient | typeof prisma = prisma) {
  if (rows.length === 0) return;
  const BATCH = 500;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const values = batch.map(r =>
      `(${escSql(r.adId)},${escSql(r.date)},${escSql(r.campaignId)},${escSql(r.adAccountId)},${escSql(r.pageId)},${escSql(r.adName)},${escSql(r.campaignName)},${escSql(r.thumbnailUrl || '')},${escSql(r.imageHash || '')},${escSql(r.perceptualHash || '')},${r.spend},${r.impressions},${r.clicks},${r.inbox},${r.leads},${r.cpi},${r.likes},${r.comments},${r.shares},${r.videoViews},${r.ctr},${escSql(r.status)},NOW(),NOW())`
    ).join(",\n");

    await client.$executeRawUnsafe(`
      INSERT INTO "AdsContentDaily" ("adId","date","campaignId","adAccountId","pageId","adName","campaignName","thumbnailUrl","imageHash","perceptualHash","spend","impressions","clicks","inbox","leads","cpi","likes","comments","shares","videoViews","ctr","status","createdAt","updatedAt")
      VALUES ${values}
      ON CONFLICT ("adId","date") DO UPDATE SET
        "campaignId"=EXCLUDED."campaignId","adAccountId"=EXCLUDED."adAccountId","pageId"=EXCLUDED."pageId",
        "adName"=EXCLUDED."adName","campaignName"=EXCLUDED."campaignName",
        "thumbnailUrl"=CASE WHEN EXCLUDED."thumbnailUrl" != '' THEN EXCLUDED."thumbnailUrl" ELSE "AdsContentDaily"."thumbnailUrl" END,
        "imageHash"=CASE WHEN EXCLUDED."imageHash" != '' THEN EXCLUDED."imageHash" ELSE "AdsContentDaily"."imageHash" END,
        "perceptualHash"=CASE WHEN EXCLUDED."perceptualHash" != '' THEN EXCLUDED."perceptualHash" ELSE "AdsContentDaily"."perceptualHash" END,
        "spend"=EXCLUDED."spend","impressions"=EXCLUDED."impressions","clicks"=EXCLUDED."clicks",
        "inbox"=EXCLUDED."inbox","leads"=EXCLUDED."leads","cpi"=EXCLUDED."cpi",
        "likes"=EXCLUDED."likes","comments"=EXCLUDED."comments","shares"=EXCLUDED."shares",
        "videoViews"=EXCLUDED."videoViews","ctr"=EXCLUDED."ctr","status"=EXCLUDED."status",
        "updatedAt"=NOW()
    `);
  }
}

// ── GET /api/cron/sync-ads ──────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const unauthorized = await requireSyncAuthorization(req);
  if (unauthorized) return unauthorized;

  if (req.nextUrl.searchParams.get("status") === "1") {
    const latest = await prisma.adsSyncRun.findFirst({ orderBy: { startedAt: "desc" } });
    const activeLock = await prisma.adsSyncLock.findUnique({ where: { key: "meta-ads" } });
    return NextResponse.json({
      latest,
      running: Boolean(activeLock && activeLock.lockedUntil > new Date()),
    });
  }

  const start = Date.now();
  const requestId = req.headers.get("x-vercel-id") || `local-${start}`;
  console.log(JSON.stringify({ event: "meta_ads_sync_started", requestId }));
  const now = new Date();
  const leaseUntil = new Date(now.getTime() + SYNC_LEASE_MS);
  const lock = await prisma.$queryRaw<{ key: string }[]>(Prisma.sql`
    INSERT INTO "AdsSyncLock" ("key", "lockedUntil", "updatedAt")
    VALUES ('meta-ads', ${leaseUntil}, ${now})
    ON CONFLICT ("key") DO UPDATE
      SET "lockedUntil" = EXCLUDED."lockedUntil", "updatedAt" = EXCLUDED."updatedAt"
      WHERE "AdsSyncLock"."lockedUntil" < ${now}
    RETURNING "key"
  `);
  if (lock.length === 0) {
    return NextResponse.json({ error: "A Meta sync is already running" }, { status: 409 });
  }

  let syncRunId: string | null = null;
  let accountsTotal = 0;
  let accountsFailed = 0;

  try {
    const tokens = getTokens();
    console.log(`🔑 Using ${tokens.length} Meta token(s)`);

    const { searchParams } = req.nextUrl;
    const today = new Date();
    const toISO = (d: Date) => d.toISOString().slice(0, 10);

    // Default: last 3 days (Meta attribution window)
    const threeDaysAgo = new Date(today.getTime() - 3 * 86400000);
    const since = searchParams.get("since") || toISO(threeDaysAgo);
    const until = searchParams.get("until") || toISO(today);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(since) || !/^\d{4}-\d{2}-\d{2}$/.test(until) || since > until) {
      return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
    }
    const rangeDays = Math.floor((Date.parse(`${until}T00:00:00Z`) - Date.parse(`${since}T00:00:00Z`)) / 86400000) + 1;
    if (rangeDays > 31) return NextResponse.json({ error: "Sync range is limited to 31 days" }, { status: 400 });
    const syncRun = await prisma.adsSyncRun.create({ data: { since, until, status: "running" } });
    syncRunId = syncRun.id;

    console.log(`📅 ${since} → ${until}`);

    // ── Pre-load caches from DB ─────────────────────────────────────────
    const existingMappings = await prisma.$queryRaw<{ campaignId: string; pageId: string }[]>(
      Prisma.sql`SELECT DISTINCT "campaignId", "pageId" FROM "AdsMetricDaily" WHERE "pageId" != ''`
    );
    const pgIdMap: Record<string, string> = {};
    for (const m of existingMappings) pgIdMap[m.campaignId] = m.pageId;
    console.log(`📦 Loaded ${existingMappings.length} cached campaign→pageId mappings`);

    const allPageNames = await prisma.pageNameCache.findMany();
    const pageNameMap = new Map<string, string>();
    // Clean up invalid page names that were scraped from login/error pages
    const invalidPageNames = [
      "facebook", "log in to facebook", "log into facebook",
      "เข้าสู่ระบบ facebook", "เกิดข้อผิดพลาด", "page not found",
      "content not found", "ลงชื่อเข้าใช้ facebook",
    ];
    const invalidCacheIds: string[] = [];
    for (const p of allPageNames) {
      if (invalidPageNames.includes(p.pageName.toLowerCase())) {
        invalidCacheIds.push(p.pageId);
      } else {
        pageNameMap.set(p.pageId, p.pageName);
      }
    }
    if (invalidCacheIds.length > 0) {
      await prisma.pageNameCache.deleteMany({ where: { pageId: { in: invalidCacheIds } } });
      console.log(`🧹 Cleaned ${invalidCacheIds.length} invalid page names from cache: ${invalidCacheIds.join(", ")}`);
    }
    console.log(`📦 Loaded ${pageNameMap.size} cached page names`);

    // ── Step 1: Get all ad accounts from ALL tokens ─────────────────────
    // Each token may have different ad accounts — deduplicate by account_id
    const accountTokenMap = new Map<string, { acc: any; token: string }>(); // account_id → { acc, token }

    await Promise.all(tokens.map(async (token, idx) => {
      try {
        let nextUrl: string | null =
          `${BASE}/me/adaccounts?fields=name,account_id,account_status&limit=100&access_token=${token}`;
        let count = 0;
        while (nextUrl) {
          const res = await fetchMeta(nextUrl);
          const json = await res.json();
          if (json.error) throw new Error(json.error.message ?? "Meta API error");
          for (const acc of (json.data ?? [])) {
            if (acc.account_status === 2) continue;
            if (!accountTokenMap.has(acc.account_id)) accountTokenMap.set(acc.account_id, { acc, token });
            count++;
          }
          nextUrl = json.paging?.next ?? null;
        }
        console.log(`🔑 Token ${idx + 1}: ${count} accounts`);
      } catch (e: any) {
        throw new Error(`Token ${idx + 1} failed: ${e.message}`);
      }
    }));

    const allAccountEntries = [...accountTokenMap.values()];
    if (allAccountEntries.length === 0) throw new Error("No accessible ad accounts found");
    accountsTotal = allAccountEntries.length;

    console.log(`📋 Found ${allAccountEntries.length} unique ad accounts (from ${tokens.length} tokens)`);

    // ── Step 2: Fetch insights with bounded concurrency ────────────────
    // Avoid a burst of 60+ simultaneous requests, which increases Meta 429s.
    const results = await allSettledWithConcurrency(
      allAccountEntries,
      ACCOUNT_FETCH_CONCURRENCY,
      ({ acc, token }) =>
        fetchInsightsForAccount(acc.account_id, acc.name ?? acc.account_id, since, until, token),
    );

    const allInsights: AccountInsight[] = [];
    const accountSummary: any[] = [];

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const accName = allAccountEntries[i].acc.name ?? allAccountEntries[i].acc.account_id;
      if (result.status === "fulfilled") {
        allInsights.push(...result.value);
        accountSummary.push({ name: accName, rows: result.value.length, status: "✅" });
      } else {
        console.warn(`❌ ${accName}: ${result.reason}`);
        accountSummary.push({ name: accName, rows: 0, status: "❌", error: String(result.reason) });
      }
    }
    const failedAccounts = accountSummary.filter(item => item.status === "❌");
    accountsFailed = failedAccounts.length;
    if (failedAccounts.length > 0 && failedAccounts.length === allAccountEntries.length) {
      throw new Error(`Sync aborted: all ${allAccountEntries.length} account(s) failed`);
    }
    if (failedAccounts.length > 0) {
      console.warn(`⚠️ ${failedAccounts.length}/${allAccountEntries.length} account(s) failed — continuing with successful ones`);
    }

    const fetchElapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`⚡ Fetched ${allInsights.length} rows from ${allAccountEntries.length} accounts in ${fetchElapsed}s`);

    // ── Step 2.5: Fetch ad creative info (thumbnails + page_id) ─────────
    // Always fetch fresh image URLs (Meta CDN URLs expire in 1-2 days)
    const adCreativeMap = new Map<string, {
      thumbnailUrl: string; storyPageId: string; imageHash: string;
      perceptualHash: string;
      status: "active" | "paused" | "ended" | "unknown";
    }>();

    // All unique ad_ids, grouped by token
    const allAdIds = [...new Set(allInsights.map(r => r.adId))];
    console.log(`🖼️ Fetching creative info for ${allAdIds.length} ads (URLs expire, no cache)`);

    // Hashes do not expire with Meta CDN URLs. Reuse known values so recurring
    // syncs only download thumbnails for genuinely new ads.
    const cachedHashes = new Map<string, { imageHash: string; perceptualHash: string }>();
    for (let i = 0; i < allAdIds.length; i += HASH_CACHE_BATCH_SIZE) {
      const adIdBatch = allAdIds.slice(i, i + HASH_CACHE_BATCH_SIZE);
      const rows = await prisma.adsContentDaily.groupBy({
        by: ["adId"],
        where: {
          adId: { in: adIdBatch },
          OR: [{ imageHash: { not: "" } }, { perceptualHash: { not: "" } }],
        },
        _max: { imageHash: true, perceptualHash: true },
      });
      for (const row of rows) {
        cachedHashes.set(row.adId, {
          imageHash: row._max.imageHash || "",
          perceptualHash: row._max.perceptualHash || "",
        });
      }
    }
    console.log(`🧠 Reusing cached hashes for ${cachedHashes.size}/${allAdIds.length} ads`);

    if (allAdIds.length > 0) {
      // Group ad IDs by token (based on which account they belong to)
      const adIdToToken = new Map<string, string>();
      for (const row of allInsights) {
        if (!adIdToToken.has(row.adId)) {
          const entry = accountTokenMap.get(row.accountId);
          if (entry) adIdToToken.set(row.adId, entry.token);
        }
      }

      // Group by token
      const tokenGroups = new Map<string, string[]>();
      for (const [adId, token] of adIdToToken) {
        const group = tokenGroups.get(token) || [];
        group.push(adId);
        tokenGroups.set(token, group);
      }

      const BATCH_SIZE = 50;
      const CONCURRENCY = 10;

      for (const [token, adIds] of tokenGroups) {
        // Step A: Get creative IDs + story IDs from ads (nested fields ok)
        const adCreativeIds = new Map<string, {
          creativeId: string; storyPageId: string;
          status: "active" | "paused" | "ended" | "unknown";
        }>();
        const batches1: string[][] = [];
        for (let i = 0; i < adIds.length; i += BATCH_SIZE) batches1.push(adIds.slice(i, i + BATCH_SIZE));

        for (let c = 0; c < batches1.length; c += CONCURRENCY) {
          await Promise.allSettled(batches1.slice(c, c + CONCURRENCY).map(async (ids) => {
            try {
              const res = await fetchMeta(
                `${BASE}/?ids=${ids.join(",")}&fields=effective_status,creative{id,effective_object_story_id}&access_token=${token}`
              );
              if (!res.ok) return;
              const json = await res.json();
              for (const [adId, data] of Object.entries(json) as [string, any][]) {
                const creative = data.creative || {};
                let storyPageId = "";
                if (creative.effective_object_story_id) {
                  const parts = creative.effective_object_story_id.split("_");
                  if (parts.length >= 2 && /^\d+$/.test(parts[0])) storyPageId = parts[0];
                }
                if (creative.id) {
                  adCreativeIds.set(adId, {
                    creativeId: creative.id,
                    storyPageId,
                    status: normalizedStatus(data.effective_status),
                  });
                }
              }
            } catch { /* non-critical */ }
          }));
        }

        // Step B: Batch fetch creative objects with thumbnail_width=480 for HD images
        const creativeIdToAdIds = new Map<string, string[]>();
        for (const [adId, info] of adCreativeIds) {
          const list = creativeIdToAdIds.get(info.creativeId) || [];
          list.push(adId);
          creativeIdToAdIds.set(info.creativeId, list);
        }
        const uniqueCreativeIds = [...creativeIdToAdIds.keys()];
        const batches2: string[][] = [];
        for (let i = 0; i < uniqueCreativeIds.length; i += BATCH_SIZE) batches2.push(uniqueCreativeIds.slice(i, i + BATCH_SIZE));

        for (let c = 0; c < batches2.length; c += CONCURRENCY) {
          await Promise.allSettled(batches2.slice(c, c + CONCURRENCY).map(async (ids) => {
            try {
              const res = await fetchMeta(
                `${BASE}/?ids=${ids.join(",")}&fields=thumbnail_url,image_hash&thumbnail_width=480&thumbnail_height=480&access_token=${token}`
              );
              if (!res.ok) return;
              const json = await res.json();
              for (const [creativeId, data] of Object.entries(json) as [string, any][]) {
                const thumbUrl = (data as any).thumbnail_url || "";
                const imgHash = (data as any).image_hash || "";
                const relatedAdIds = creativeIdToAdIds.get(creativeId) || [];
                for (const adId of relatedAdIds) {
                  const info = adCreativeIds.get(adId);
                  const cached = cachedHashes.get(adId);
                  adCreativeMap.set(adId, {
                    thumbnailUrl: thumbUrl,
                    storyPageId: info?.storyPageId || "",
                    imageHash: imgHash || cached?.imageHash || "",
                    perceptualHash: cached?.perceptualHash || "",
                    status: info?.status || "unknown",
                  });
                }
              }
            } catch { /* non-critical */ }
          }));
        }
      }
    }
    console.log(`🖼️ Total creative info: ${adCreativeMap.size} ads`);

    // ── Step B2: Compute hash from thumbnail for ads missing imageHash ───
    // This covers boosted posts / video creatives where Meta API doesn't return image_hash
    const missingHashUrls = new Map<string, string[]>(); // url → adIds
    for (const [adId, info] of adCreativeMap) {
      if (!info.imageHash && info.thumbnailUrl) {
        const list = missingHashUrls.get(info.thumbnailUrl) || [];
        list.push(adId);
        missingHashUrls.set(info.thumbnailUrl, list);
      }
    }
    if (missingHashUrls.size > 0) {
      console.log(`🔍 Computing thumbnail hash for ${missingHashUrls.size} unique URLs without imageHash`);
      const urlBatches: [string, string[]][][] = [];
      const entries = [...missingHashUrls.entries()];
      for (let i = 0; i < entries.length; i += 20) urlBatches.push(entries.slice(i, i + 20));

      for (const batch of urlBatches) {
        await Promise.allSettled(batch.map(async ([url, adIds]) => {
          try {
            const res = await fetchMeta(url);
            if (!res.ok) return;
            const buffer = await res.arrayBuffer();
            const hash = "thumb:" + createHash("sha256").update(Buffer.from(buffer)).digest("hex").slice(0, 16);
            for (const adId of adIds) {
              const info = adCreativeMap.get(adId);
              if (info) info.imageHash = hash;
            }
          } catch { /* non-critical */ }
        }));
      }
      const afterCount = [...adCreativeMap.values()].filter(v => !!v.imageHash).length;
      console.log(`🔍 After thumbnail hashing: ${afterCount}/${adCreativeMap.size} ads have imageHash`);
    }

    // ── Step 2.5: Compute perceptual hash for ALL thumbnails ──────────────
    const pHashMap = new Map<string, string>(); // url → phash
    const allThumbUrls = new Map<string, string[]>(); // url → adIds
    for (const [adId, info] of adCreativeMap) {
      if (info.thumbnailUrl && !info.perceptualHash) {
        const list = allThumbUrls.get(info.thumbnailUrl) || [];
        list.push(adId);
        allThumbUrls.set(info.thumbnailUrl, list);
      }
    }
    if (allThumbUrls.size > 0) {
      console.log(`🧠 Computing perceptual hash for ${allThumbUrls.size} unique thumbnails`);
      const pEntries = [...allThumbUrls.entries()];
      for (let i = 0; i < pEntries.length; i += 20) {
        const batch = pEntries.slice(i, i + 20);
        await Promise.allSettled(batch.map(async ([url, adIds]) => {
          try {
            const res = await fetchMeta(url);
            if (!res.ok) return;
            const buffer = Buffer.from(await res.arrayBuffer());
            const ph = await computePHashFromBuffer(buffer);
            if (ph) {
              pHashMap.set(url, ph);
              for (const adId of adIds) {
                const info = adCreativeMap.get(adId);
                if (info) info.perceptualHash = ph;
              }
            }
          } catch { /* non-critical */ }
        }));
      }
      console.log(`🧠 Computed ${pHashMap.size}/${allThumbUrls.size} perceptual hashes`);
    }

    // Merge creative page_id into pgIdMap (for campaigns without adset page_id)
    for (const row of allInsights) {
      if (!pgIdMap[row.campaignId]) {
        const creative = adCreativeMap.get(row.adId);
        if (creative?.storyPageId) {
          pgIdMap[row.campaignId] = creative.storyPageId;
        }
      }
    }

    // ── Step 3: Build pageId map from adsets (only for NEW campaigns) ───
    const newCampaignIds = new Set<string>();
    for (const row of allInsights) {
      if (!pgIdMap[row.campaignId]) newCampaignIds.add(row.campaignId);
    }

    if (newCampaignIds.size > 0) {
      // Find which accounts have new campaigns
      const accountsWithNewAndToken = new Map<string, string>(); // accountId → token
      for (const row of allInsights) {
        if (newCampaignIds.has(row.campaignId) && !accountsWithNewAndToken.has(row.accountId)) {
          const entry = accountTokenMap.get(row.accountId);
          if (entry) accountsWithNewAndToken.set(row.accountId, entry.token);
        }
      }

      console.log(`🔍 ${newCampaignIds.size} new campaigns in ${accountsWithNewAndToken.size} accounts — fetching adsets`);

      await Promise.allSettled(
        [...accountsWithNewAndToken.entries()].map(async ([accId, accToken]) => {
          try {
            let nextUrl: string | null =
              `${BASE}/act_${accId}/adsets?fields=campaign_id,promoted_object{page_id}&limit=500&access_token=${accToken}`;
            while (nextUrl) {
              const res = await fetchMeta(nextUrl);
              if (!res.ok) throw new Error(`Meta HTTP ${res.status}`);
              const json = await res.json();
              if (json.error) throw new Error(json.error.message ?? "Meta API error");
              for (const adset of json.data ?? []) {
                if (adset.promoted_object?.page_id && !pgIdMap[adset.campaign_id]) {
                  pgIdMap[adset.campaign_id] = adset.promoted_object.page_id;
                }
              }
              nextUrl = json.paging?.next ?? null;
            }
          } catch (error) { console.warn(`Could not resolve adsets for ${accId}:`, error); }
        })
      );
    } else {
      console.log(`✅ All campaigns already have pageId cached — skipping adset fetch`);
    }

    // ── Step 4: Resolve page names (batch) ──────────────────────────────
    const uniquePageIds = [...new Set(Object.values(pgIdMap))];
    const unknownPageIds = uniquePageIds.filter(id => !pageNameMap.has(id));

    if (unknownPageIds.length > 0) {
      // Try each token to resolve page names (different tokens may have access to different pages)
      let remaining = [...unknownPageIds];
      for (const token of tokens) {
        if (remaining.length === 0) break;
        try {
          const batchRes = await fetchMeta(
            `${BASE}/?ids=${remaining.join(",")}&fields=name&access_token=${token}`
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
            // Update remaining for next token
            remaining = remaining.filter(id => !pageNameMap.has(id));
          }
        } catch { /* non-critical */ }
      }
    }

    // ── Step 4.5: Scrape fallback for pages API couldn't resolve ─────────
    const stillUnknown = uniquePageIds.filter(id => !pageNameMap.has(id));
    if (stillUnknown.length > 0) {
      // Limit to 5 per sync to keep it fast — rest will be scraped next sync
      const toScrape = stillUnknown.slice(0, 5);
      console.log(`🔍 Scraping ${toScrape.length}/${stillUnknown.length} page names from Facebook...`);
      const scrapeResults = await Promise.allSettled(
        toScrape.map(async (id) => {
          const name = await scrapePageName(id);
          if (name) {
            pageNameMap.set(id, name);
            // Persist to cache
            try {
              await prisma.$executeRawUnsafe(
                `INSERT INTO "PageNameCache" ("pageId","pageName","source","createdAt","updatedAt")
                 VALUES ($1,$2,'scrape',NOW(),NOW())
                 ON CONFLICT ("pageId") DO UPDATE SET "pageName"=$2,"source"='scrape',"updatedAt"=NOW()`,
                id, name
              );
            } catch { /* non-critical */ }
            return { id, name };
          }
          return null;
        })
      );
      const scraped = scrapeResults.filter(r => r.status === "fulfilled" && r.value).length;
      console.log(`📛 Scraped ${scraped}/${stillUnknown.length} page names`);
    }

    // ── Step 4.6: Ad preview fallback for deleted/restricted pages ────────
    // Pages that can't be resolved via API or scrape may be deleted/unpublished.
    // Their names can still be extracted from ad preview iframes.
    const previewUnknown = uniquePageIds.filter(id => !pageNameMap.has(id));
    if (previewUnknown.length > 0) {
      console.log(`🎬 Trying ad preview fallback for ${previewUnknown.length} pages...`);
      // Build pageId → adAccountId map from allInsights
      const pageToAccount = new Map<string, string>();
      for (const row of allInsights) {
        const pid = pgIdMap[row.campaignId];
        if (pid && !pageToAccount.has(pid)) {
          pageToAccount.set(pid, row.accountId);
        }
      }

      for (const pid of previewUnknown.slice(0, 5)) {
        const accountId = pageToAccount.get(pid);
        if (!accountId) continue;
        try {
          // Get one ad from the account
          const adsRes = await fetchMeta(
            `${BASE}/act_${accountId}/ads?fields=id&limit=1&access_token=${tokens[0]}`
          );
          if (!adsRes.ok) continue;
          const adsData = await adsRes.json();
          const adId = adsData.data?.[0]?.id;
          if (!adId) continue;

          // Get ad preview iframe
          const prevRes = await fetchMeta(
            `${BASE}/${adId}/previews?ad_format=MOBILE_FEED_STANDARD&access_token=${tokens[0]}`
          );
          if (!prevRes.ok) continue;
          const prevData = await prevRes.json();
          const iframeSrc = prevData.data?.[0]?.body?.match(/src="([^"]+)"/)?.[1]?.replace(/&amp;/g, "&");
          if (!iframeSrc) continue;

          // Fetch iframe content and extract page name
          const iframeRes = await fetch(iframeSrc, {
            headers: { "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)" },
            signal: AbortSignal.timeout(META_TIMEOUT_MS),
          });
          if (!iframeRes.ok) continue;
          const html = await iframeRes.text();
          const nameMatch = html.match(/<strong[^>]*class="[^"]*"[^>]*>([^<]+)<\/strong>/);
          if (nameMatch) {
            let name = nameMatch[1].trim()
              .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)))
              .replace(/&#(\d+);/g, (_, dec: string) => String.fromCharCode(parseInt(dec)))
              .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#039;/g, "'");
            if (name && name.length > 2) {
              pageNameMap.set(pid, name);
              try {
                await prisma.$executeRawUnsafe(
                  `INSERT INTO "PageNameCache" ("pageId","pageName","source","createdAt","updatedAt")
                   VALUES ($1,$2,'preview',NOW(),NOW())
                   ON CONFLICT ("pageId") DO UPDATE SET "pageName"=$2,"source"='preview',"updatedAt"=NOW()`,
                  pid, name
                );
              } catch { /* non-critical */ }
              console.log(`  ✅ ${pid} → ${name} (via ad preview)`);
            }
          }
        } catch { /* non-critical */ }
      }
      const previewResolved = previewUnknown.filter(id => pageNameMap.has(id)).length;
      console.log(`📛 Preview resolved ${previewResolved}/${previewUnknown.length} page names`);
    }

    // ── Step 5: Aggregate campaign-level data from ad insights ───────────
    type CampaignKey = string;
    const campaignAgg = new Map<CampaignKey, {
      campaignId: string; date: string; campaignName: string;
      accountId: string; accountName: string;
      spend: number; impressions: number; clicks: number;
      inbox: number; leads: number;
      statuses: Set<string>;
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
        existing.statuses.add(adCreativeMap.get(row.adId)?.status ?? row.status);
      } else {
        campaignAgg.set(key, {
          campaignId: row.campaignId, date: row.date,
          campaignName: row.campaignName,
          accountId: row.accountId, accountName: row.accountName,
          spend: row.spend, impressions: row.impressions, clicks: row.clicks,
          inbox: row.inbox, leads: row.leads,
          statuses: new Set([adCreativeMap.get(row.adId)?.status ?? row.status]),
        });
      }
    }

    // ── Step 6: Bulk upsert campaign-level (AdsMetricDaily) ─────────────
    const campaignRows = [...campaignAgg.values()].map(c => {
      const pgId = pgIdMap[c.campaignId] ?? "";
      const pgName = pgId ? (pageNameMap.get(pgId) || c.accountName) : c.accountName;
      const cpi = c.inbox > 0 ? c.spend / c.inbox : 0;
      const cpl = c.leads > 0 ? c.spend / c.leads : 0;
      const ctr = c.impressions > 0 ? (c.clicks / c.impressions) * 100 : 0;
      return {
        campaignId: c.campaignId, date: c.date,
        clinicName: c.accountName, pageName: pgName, pageId: pgId,
        adAccountId: c.accountId, campaign: c.campaignName,
        spend: c.spend, inbox: c.inbox, leads: c.leads, cpi, cpl,
        impressions: c.impressions, clicks: c.clicks, ctr,
        status: aggregateStatus(c.statuses),
      };
    });

    // ── Step 7: Bulk upsert ad-level (AdsContentDaily) ──────────────────
    // Deduplicate by (adId, date) — merge metrics for same ad on same day
    const adRowMap = new Map<string, any>();
    for (const row of allInsights) {
      const key = `${row.adId}|${row.date}`;
      const pgId = pgIdMap[row.campaignId] ?? "";
      const creative = adCreativeMap.get(row.adId);
      const existing = adRowMap.get(key);
      if (existing) {
        existing.spend += row.spend; existing.impressions += row.impressions;
        existing.clicks += row.clicks; existing.inbox += row.inbox;
        existing.leads += row.leads; existing.likes += row.likes;
        existing.comments += row.comments; existing.shares += row.shares;
        existing.videoViews += row.videoViews;
        existing.cpi = existing.inbox > 0 ? existing.spend / existing.inbox : 0;
        existing.ctr = existing.impressions > 0 ? (existing.clicks / existing.impressions) * 100 : 0;
        if (!existing.pageId && pgId) existing.pageId = pgId;
        if (!existing.thumbnailUrl && creative?.thumbnailUrl) existing.thumbnailUrl = creative.thumbnailUrl;
        if (!existing.imageHash && creative?.imageHash) existing.imageHash = creative.imageHash;
        existing.statuses.add(creative?.status ?? row.status);
      } else {
        adRowMap.set(key, {
          adId: row.adId, date: row.date,
          campaignId: row.campaignId, adAccountId: row.accountId,
          pageId: pgId, adName: row.adName, campaignName: row.campaignName,
          thumbnailUrl: creative?.thumbnailUrl || "",
          imageHash: creative?.imageHash || "",
          perceptualHash: creative?.perceptualHash || "",
          spend: row.spend, impressions: row.impressions, clicks: row.clicks,
          inbox: row.inbox, leads: row.leads, cpi: row.cpi,
          likes: row.likes, comments: row.comments, shares: row.shares,
          videoViews: row.videoViews, ctr: row.ctr,
          status: creative?.status ?? row.status,
          statuses: new Set([creative?.status ?? row.status]),
        });
      }
    }
    const adRows = [...adRowMap.values()].map(({ statuses, ...row }) => ({
      ...row,
      status: aggregateStatus(statuses),
    }));

    // Log completeness stats — campaigns without a promoted page are normal
    // (awareness, video, engagement objectives often have no page_id).
    const campaignsWithoutPage = campaignRows.filter(row => !row.pageId).length;
    const adsWithoutPage = adRows.filter(row => !row.pageId).length;
    if (campaignsWithoutPage > 0 || adsWithoutPage > 0) {
      console.warn(`⚠️ ${campaignsWithoutPage} campaign rows and ${adsWithoutPage} ad rows have no pageId — storing as-is`);
    }

    const campaignSpend = campaignRows.reduce((total, row) => total + row.spend, 0);
    const contentSpend = adRows.reduce((total, row) => total + row.spend, 0);
    const spendDifference = Math.abs(campaignSpend - contentSpend);
    // Tolerate up to 1% rounding difference across many rows
    const spendTolerance = Math.max(1, campaignSpend * 0.01);
    if (spendDifference > spendTolerance) {
      throw new Error(
        `Completeness check failed: campaign spend ${campaignSpend.toFixed(2)} vs content spend ${contentSpend.toFixed(2)} (diff ${spendDifference.toFixed(2)} > ${spendTolerance.toFixed(2)})`,
      );
    }

    // All accounts completed successfully, so this date range is authoritative.
    // Replace it atomically to remove rows for ads/campaigns that no longer exist.
    await prisma.$transaction(async (tx) => {
      await tx.adsMetricDaily.deleteMany({ where: { date: { gte: since, lte: until } } });
      await tx.adsContentDaily.deleteMany({ where: { date: { gte: since, lte: until } } });
      await bulkUpsertMetricDaily(campaignRows, tx);
      await bulkUpsertContentDaily(adRows, tx);
    }, { timeout: DB_TRANSACTION_TIMEOUT_MS });
    console.log(`📝 Reconciled ${campaignRows.length} campaign rows and ${adRows.length} ad rows (atomic)`);

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    const syncMetrics = {
      event: "meta_ads_sync_completed",
      requestId,
      since,
      until,
      elapsedSeconds: Number(elapsed),
      accounts: allAccountEntries.length,
      campaignRows: campaignRows.length,
      contentRows: adRows.length,
      creativeCoverage: allAdIds.length > 0 ? adCreativeMap.size / allAdIds.length : 1,
      cachedHashes: cachedHashes.size,
      campaignSpend: Number(campaignSpend.toFixed(2)),
      contentSpend: Number(contentSpend.toFixed(2)),
    };
    console.log(JSON.stringify(syncMetrics));

    await prisma.adsSyncRun.update({
      where: { id: syncRunId },
      data: {
        status: "completed",
        accountsTotal,
        campaignRows: campaignRows.length,
        contentRows: adRows.length,
        completedAt: new Date(),
      },
    });

    const parts = [`✅ Sync ${since} → ${until} — ${allAccountEntries.length} accounts (${tokens.length} tokens), ${campaignRows.length} campaign rows, ${adRows.length} ad rows (${elapsed}s)`];
    if (accountsFailed > 0) parts.push(`⚠️ ${accountsFailed} account(s) failed`);
    return NextResponse.json({
      message: parts.join("\n"),
      results: accountSummary, since, until, metrics: syncMetrics,
    });

  } catch (err: any) {
    console.error(JSON.stringify({
      event: "meta_ads_sync_failed",
      requestId,
      elapsedSeconds: Number(((Date.now() - start) / 1000).toFixed(1)),
      accountsTotal,
      accountsFailed,
      error: String(err.message || err),
    }));
    if (syncRunId) {
      await prisma.adsSyncRun.update({
        where: { id: syncRunId },
        data: {
          status: "failed",
          accountsTotal,
          accountsFailed,
          error: String(err.message || err).slice(0, 2_000),
          completedAt: new Date(),
        },
      }).catch((updateError: unknown) => console.error("Could not record failed sync:", updateError));
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  } finally {
    await prisma.adsSyncLock.delete({ where: { key: "meta-ads" } })
      .catch((lockError: unknown) => console.error("Could not release sync lock:", lockError));
  }
}
