const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  // Check kaosai ads
  const kaosai = await p.adsContentDaily.findMany({
    where: { adName: 'kaosai' },
    select: { adId: true, adName: true, imageHash: true, thumbnailUrl: true, pageId: true },
    distinct: ['adId'],
  });
  console.log(`=== kaosai (${kaosai.length} ads) ===`);
  kaosai.forEach(r => {
    console.log(`  adId: ${r.adId}`);
    console.log(`  hash: ${r.imageHash}`);
    console.log(`  thumb: ${r.thumbnailUrl}`);
    console.log(`  page: ${r.pageId}`);
    console.log('');
  });

  // Check pico+vitamin ads
  const pv = await p.adsContentDaily.findMany({
    where: { adName: 'pico+vitamin' },
    select: { adId: true, adName: true, imageHash: true, thumbnailUrl: true, pageId: true },
    distinct: ['adId'],
  });
  console.log(`=== pico+vitamin (${pv.length} ads) ===`);
  pv.forEach(r => {
    console.log(`  adId: ${r.adId}`);
    console.log(`  hash: ${r.imageHash}`);
    console.log(`  thumb: ${r.thumbnailUrl}`);
    console.log(`  page: ${r.pageId}`);
    console.log('');
  });

  await p.$disconnect();
})();
