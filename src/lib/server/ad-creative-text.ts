// Fetches ad copy (title + body) from Meta for ads whose service can't be read
// from the ad or campaign name, so the comparison page can read it from the
// text instead. Each ad is fetched once; ads Meta won't return are stored with
// empty text so they are not retried every run.
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/server/prisma";
import { getMetaTokens } from "@/lib/server/meta-accounts";
import { resolveService, UNKNOWN } from "@/lib/ad-name";

const BASE = "https://graph.facebook.com/v20.0";
const FIELDS = "creative{title,body,object_story_spec,asset_feed_spec{bodies,titles}}";
const BATCH = 25;

interface Creative {
  title?: string;
  body?: string;
  object_story_spec?: {
    link_data?: { message?: string; name?: string; description?: string };
    video_data?: { message?: string; title?: string };
  };
  asset_feed_spec?: { bodies?: { text?: string }[]; titles?: { text?: string }[] };
}

function creativeText(c: Creative | undefined): string {
  if (!c) return "";
  const parts = [
    c.title, c.body,
    c.object_story_spec?.link_data?.name, c.object_story_spec?.link_data?.message, c.object_story_spec?.link_data?.description,
    c.object_story_spec?.video_data?.title, c.object_story_spec?.video_data?.message,
    ...(c.asset_feed_spec?.titles ?? []).map(t => t.text),
    ...(c.asset_feed_spec?.bodies ?? []).map(b => b.text),
  ];
  return [...new Set(parts.filter((p): p is string => !!p && p.trim().length > 0))].join("\n").slice(0, 2000);
}

async function fetchBatch(ids: string[], tokens: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  let pending = ids;
  for (const token of tokens) {
    if (pending.length === 0) break;
    const res = await fetch(`${BASE}/?ids=${pending.join(",")}&fields=${encodeURIComponent(FIELDS)}&access_token=${token}`,
      { cache: "no-store", signal: AbortSignal.timeout(30_000) });
    const json = await res.json() as Record<string, { creative?: Creative }> & { error?: unknown };
    if (json.error) {
      // One inaccessible id fails the whole call; retry this token one id at a time.
      if (pending.length > 1) {
        for (const id of pending) {
          const one = await fetchBatch([id], [token]).catch(() => new Map<string, string>());
          for (const [k, v] of one) out.set(k, v);
        }
        pending = pending.filter(id => !out.has(id));
      }
      continue;
    }
    for (const id of pending) if (json[id]) out.set(id, creativeText(json[id].creative));
    pending = pending.filter(id => !out.has(id));
  }
  return out;
}

/** Fetches copy for up to `limit` recent ads with no service in their names. */
export async function fetchMissingCreativeTexts(limit = 150, deadline = Date.now() + 30_000): Promise<number> {
  const tokens = getMetaTokens();
  if (tokens.length === 0) return 0;
  const since = new Date(Date.now() - 60 * 86400000).toISOString().slice(0, 10);
  const ads = await prisma.$queryRaw<{ adId: string; adName: string; campaignName: string; spend: number }[]>(Prisma.sql`
    SELECT d."adId", MAX(d."adName") AS "adName", MAX(d."campaignName") AS "campaignName", SUM(d.spend)::float8 AS spend
    FROM "AdsContentDaily" d
    LEFT JOIN "AdCreativeText" t ON t."adId" = d."adId"
    WHERE d."date" >= ${since} AND d.spend > 0 AND t."adId" IS NULL
    GROUP BY 1 ORDER BY 4 DESC
  `);
  const need = ads
    .filter(a => resolveService({ adName: a.adName, campaignName: a.campaignName }).service === UNKNOWN)
    .slice(0, limit)
    .map(a => a.adId);

  let saved = 0;
  for (let i = 0; i < need.length && Date.now() < deadline; i += BATCH) {
    const ids = need.slice(i, i + BATCH);
    const texts = await fetchBatch(ids, tokens).catch(() => new Map<string, string>());
    await prisma.adCreativeText.createMany({
      data: ids.map(adId => ({ adId, text: texts.get(adId) ?? "" })),
      skipDuplicates: true,
    });
    saved += ids.length;
  }
  return saved;
}
