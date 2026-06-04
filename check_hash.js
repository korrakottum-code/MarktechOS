const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  // From screenshot: botox service
  // Row 1: 5 ads, 3 pages (นครพนม, ศรีสะเกษ, เสนา เฟสท์) - ฿1,085.12
  // Row 3: 4 ads, 2 pages (มุกดาหาร, ร้อยเอ็ด) - ฿433.03
  // Both have the botox 888 image
  
  // Find pages: มุกดาหาร, ร้อยเอ็ด
  const pages = await p.pageNameCache.findMany({
    where: {
      OR: [
        { pageName: { contains: 'มุกดาหาร' } },
        { pageName: { contains: 'ร้อยเอ็ด' } },
        { pageName: { contains: 'นครพนม' } },
        { pageName: { contains: 'ศรีสะเกษ' } },
        { pageName: { contains: 'เสนา' } },
      ]
    }
  });
  console.log('=== Matching Pages ===');
  pages.forEach(pg => console.log(`  ${pg.pageId}: ${pg.pageName}`));

  const pageIds = pages.map(pg => pg.pageId);
  
  // Get botox ads from these pages
  const ads = await p.adsContentDaily.findMany({
    where: { 
      adName: 'botox',
      pageId: { in: pageIds },
    },
    select: { adId: true, imageHash: true, thumbnailUrl: true, pageId: true },
    distinct: ['adId'],
  });

  // Group by hash
  const byHash = {};
  ads.forEach(a => {
    const k = a.imageHash || 'none';
    if (!byHash[k]) byHash[k] = { pages: new Set(), count: 0, hasThumb: false, thumbFile: '' };
    byHash[k].pages.add(a.pageId);
    byHash[k].count++;
    if (a.thumbnailUrl) {
      byHash[k].hasThumb = true;
      try { byHash[k].thumbFile = new URL(a.thumbnailUrl).pathname.split('/').pop(); } catch {}
    }
  });

  console.log('\n=== Hash groups with page overlap ===');
  // Find which hashes map to which pages
  Object.entries(byHash)
    .filter(([, v]) => v.hasThumb)
    .forEach(([hash, v]) => {
      const pageNames = [...v.pages].map(pid => {
        const pg = pages.find(p => p.pageId === pid);
        return pg ? pg.pageName.substring(0, 30) : pid;
      });
      console.log(`Hash: ${hash}`);
      console.log(`  ${v.count} ads, pages: ${pageNames.join(', ')}`);
      console.log(`  thumb file: ${v.thumbFile}`);
      console.log('');
    });

  await p.$disconnect();
})();
