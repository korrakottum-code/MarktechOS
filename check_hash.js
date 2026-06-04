const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  const hash = 'phash:000000000000193166c0d6429d5aa91a2aa72a33c5ac412c2a00012800000000';
  
  const ads = await p.$queryRawUnsafe(`
    SELECT DISTINCT "adId", "adName", "pageId", "imageHash", "thumbnailUrl"
    FROM "AdsContentDaily" 
    WHERE "perceptualHash" = $1
    ORDER BY "adName"
  `, hash);
  
  console.log(`Ads sharing pHash ${hash}:\n`);
  for (const a of ads) {
    const fn = a.thumbnailUrl ? new URL(a.thumbnailUrl).pathname.split('/').pop() : '(none)';
    console.log(`  adName:${a.adName}  adId:${a.adId}  imageHash:${a.imageHash}  file:${fn}`);
  }

  await p.$disconnect();
})();
