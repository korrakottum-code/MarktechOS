/**
 * Re-backfill perceptualHash using dHash 16x16 (replacing old aHash 8x8).
 */
const { PrismaClient } = require('@prisma/client');
const { computePHash } = require('./src/lib/server/phash');

const p = new PrismaClient();
const BATCH_SIZE = 20;

async function main() {
  // Clear old aHash values and recompute with dHash
  await p.$executeRawUnsafe(`UPDATE "AdsContentDaily" SET "perceptualHash" = '' WHERE "perceptualHash" != ''`);
  console.log('🗑️  Cleared old aHash values\n');

  const rows = await p.$queryRawUnsafe(`
    SELECT DISTINCT "thumbnailUrl" 
    FROM "AdsContentDaily" 
    WHERE "thumbnailUrl" != '' 
    LIMIT 5000
  `);

  console.log(`🖼️  Found ${rows.length} unique thumbnail URLs to hash with dHash 16x16\n`);

  let done = 0, failed = 0;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map(async (row) => {
        const hash = await computePHash(row.thumbnailUrl);
        return { url: row.thumbnailUrl, hash };
      })
    );

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

  console.log(`\n\n🏁 Done! ${done} thumbnails hashed (dHash 16x16), ${failed} failed`);

  const total = await p.$queryRawUnsafe(`SELECT COUNT(*) as c FROM "AdsContentDaily" WHERE "perceptualHash" != ''`);
  const unique = await p.$queryRawUnsafe(`SELECT COUNT(DISTINCT "perceptualHash") as c FROM "AdsContentDaily" WHERE "perceptualHash" != ''`);
  console.log(`📊 Total rows with pHash: ${total[0].c}, Unique pHashes: ${unique[0].c}`);

  await p.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
