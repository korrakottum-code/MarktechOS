/**
 * Backfill perceptualHash for all AdsContentDaily rows that have thumbnailUrl but no perceptualHash.
 * Downloads each unique thumbnail, computes aHash, and updates all rows with that thumbnail.
 */
const { PrismaClient } = require('@prisma/client');
const { computePHash } = require('./src/lib/server/phash');

const p = new PrismaClient();
const BATCH_SIZE = 20; // Concurrent downloads

async function main() {
  // Get all unique thumbnail URLs that don't have perceptualHash
  const rows = await p.$queryRawUnsafe(`
    SELECT DISTINCT "thumbnailUrl" 
    FROM "AdsContentDaily" 
    WHERE "thumbnailUrl" != '' 
    AND ("perceptualHash" = '' OR "perceptualHash" IS NULL)
    LIMIT 5000
  `);

  console.log(`🖼️  Found ${rows.length} unique thumbnail URLs to hash\n`);

  let done = 0;
  let failed = 0;

  // Process in batches
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map(async (row) => {
        const hash = await computePHash(row.thumbnailUrl);
        return { url: row.thumbnailUrl, hash };
      })
    );

    // Update DB for each result
    for (const { url, hash } of results) {
      if (hash) {
        await p.$executeRawUnsafe(
          `UPDATE "AdsContentDaily" SET "perceptualHash" = $1 WHERE "thumbnailUrl" = $2`,
          `phash:${hash}`,
          url
        );
        done++;
      } else {
        failed++;
      }
    }

    const pct = Math.round(((i + batch.length) / rows.length) * 100);
    process.stdout.write(`\r  Progress: ${i + batch.length}/${rows.length} (${pct}%) — ✅ ${done} hashed, ❌ ${failed} failed`);
  }

  console.log(`\n\n🏁 Done! ${done} thumbnails hashed, ${failed} failed`);

  // Show stats
  const total = await p.$queryRawUnsafe(`SELECT COUNT(*) as c FROM "AdsContentDaily" WHERE "perceptualHash" != ''`);
  const unique = await p.$queryRawUnsafe(`SELECT COUNT(DISTINCT "perceptualHash") as c FROM "AdsContentDaily" WHERE "perceptualHash" != ''`);
  console.log(`📊 Total rows with pHash: ${total[0].c}, Unique pHashes: ${unique[0].c}`);

  await p.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
