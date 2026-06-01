/**
 * Backfill perceptual hashes (pHash) for AdsContentDaily rows that have a
 * thumbnail but an empty `imageHash`.
 *
 * Why: rows synced before pHash existed — or where the pHash fetch failed at
 * sync time — keep `imageHash = ""`. Those rows fall back to the thumbnail
 * filename when grouping "by content", so two *identical* creatives that were
 * served under different CDN URLs end up as separate rows and never merge.
 * Filling the missing pHash lets identical images group together again.
 *
 * Safe: this only fills empty hashes. It never changes the matching threshold
 * and never overwrites an existing hash, so it cannot cause false merges.
 *
 * Run:  npx tsx --env-file=.env.local scripts/backfill-phash.ts
 */
import { PrismaClient } from "@prisma/client";
import sharp from "sharp";

const prisma = new PrismaClient();

const CONCURRENCY = 20;

// Identical algorithm to sync-ads/route.ts pHash (256-bit average hash)
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

async function main() {
  // One representative thumbnail per adId that is missing a hash.
  const rows = await prisma.adsContentDaily.groupBy({
    by: ["adId", "thumbnailUrl"],
    where: { thumbnailUrl: { not: "" }, imageHash: "" },
    _max: { spend: true },
  });

  // Keep the highest-spend thumbnail per adId (best chance of a live CDN URL).
  const byAd = new Map<string, { url: string; spend: number }>();
  for (const r of rows) {
    const cur = byAd.get(r.adId);
    const spend = r._max.spend ?? 0;
    if (!cur || spend > cur.spend) byAd.set(r.adId, { url: r.thumbnailUrl, spend });
  }
  const targets = [...byAd.entries()];
  console.log(`Ads with missing pHash: ${targets.length}`);

  let ok = 0, fail = 0, updatedRows = 0;
  for (let i = 0; i < targets.length; i += CONCURRENCY) {
    const batch = targets.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map(async ([adId, { url }]) => {
      try {
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) { fail++; return; }
        const buf = Buffer.from(await res.arrayBuffer());
        const hash = `ph:${await pHash(buf)}`;
        const r = await prisma.adsContentDaily.updateMany({
          where: { adId, imageHash: "" },
          data: { imageHash: hash },
        });
        updatedRows += r.count;
        ok++;
      } catch { fail++; }
    }));
    if ((i / CONCURRENCY) % 5 === 0) console.log(`  progress: ${Math.min(i + CONCURRENCY, targets.length)}/${targets.length} (ok=${ok} fail=${fail})`);
  }

  console.log(`\nDone. ads hashed=${ok}, failed=${fail}, rows updated=${updatedRows}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
