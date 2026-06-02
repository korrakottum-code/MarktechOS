import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';

(async () => {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({ 
    headless: 'new',
    args: ['--window-size=1920,1080']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  // Listen for console messages
  page.on('console', msg => console.log('[BROWSER]', msg.text()));

  console.log('Navigating to dashboard...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 5000)); // Wait for data to load

  // Screenshot 1: Normal view (before export)
  await page.screenshot({ path: 'debug-1-normal.png', fullPage: true });
  console.log('✅ Screenshot 1: Normal view saved');

  // Screenshot 2: Add exporting-pdf class to body (simulate what export does)
  await page.evaluate(() => {
    document.body.classList.add('exporting-pdf');
  });
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: 'debug-2-exporting-pdf.png', fullPage: true });
  console.log('✅ Screenshot 2: With exporting-pdf class saved');

  // Screenshot 3: Take screenshot of just the export-container
  const containerHandle = await page.$('#export-container');
  if (containerHandle) {
    const box = await containerHandle.boundingBox();
    console.log(`Export container box: x=${box.x}, y=${box.y}, w=${box.width}, h=${box.height}`);
    await containerHandle.screenshot({ path: 'debug-3-container-only.png' });
    console.log('✅ Screenshot 3: Export container only saved');
  } else {
    console.log('❌ Could not find #export-container');
  }

  // Screenshot 4: Check what KPI grid looks like with exporting-pdf
  const kpiInfo = await page.evaluate(() => {
    const container = document.getElementById('export-container');
    if (!container) return { error: 'no container' };

    // Find KPI grid
    const grids = container.querySelectorAll('.grid');
    const results = [];
    grids.forEach((grid, i) => {
      const rect = grid.getBoundingClientRect();
      const style = getComputedStyle(grid);
      results.push({
        index: i,
        classes: grid.className.substring(0, 100),
        top: rect.top,
        bottom: rect.bottom,
        height: rect.height,
        display: style.display,
        gridTemplateColumns: style.gridTemplateColumns,
        overflow: style.overflow,
      });
    });

    // Check the main content area (the div right after KPI grid)
    const mainContent = container.querySelector('.bg-navy-900\\/80');
    if (mainContent) {
      const mcRect = mainContent.getBoundingClientRect();
      results.push({
        index: 'main-content',
        top: mcRect.top,
        bottom: mcRect.bottom,
        height: mcRect.height,
      });
    }

    return results;
  });
  console.log('\n📊 Layout info with exporting-pdf:');
  console.log(JSON.stringify(kpiInfo, null, 2));

  // Remove exporting-pdf
  await page.evaluate(() => {
    document.body.classList.remove('exporting-pdf');
  });

  // Now actually click Export PDF and wait
  console.log('\n🖨️ Clicking Export PDF button...');
  
  // Set download path
  const downloadPath = path.resolve('./downloads');
  if (!fs.existsSync(downloadPath)) fs.mkdirSync(downloadPath);
  const client = await page.target().createCDPSession();
  await client.send('Page.setDownloadBehavior', {
    behavior: 'allow',
    downloadPath: downloadPath
  });

  const exportBtn = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find(b => b.textContent?.includes('Export PDF'));
    if (btn) {
      btn.click();
      return 'clicked';
    }
    return 'not found';
  });
  console.log('Export button:', exportBtn);

  // Wait for the exporting-pdf class to appear (means export started)
  await new Promise(r => setTimeout(r, 2000));
  
  // Take screenshot during export
  await page.screenshot({ path: 'debug-4-during-export.png', fullPage: true });
  console.log('✅ Screenshot 4: During export saved');

  // Wait for export to finish
  await new Promise(r => setTimeout(r, 10000));
  
  await page.screenshot({ path: 'debug-5-after-export.png', fullPage: true });
  console.log('✅ Screenshot 5: After export saved');

  // Check downloads
  const files = fs.existsSync(downloadPath) ? fs.readdirSync(downloadPath) : [];
  console.log('\n📁 Downloads:', files);

  await browser.close();
  console.log('\n✅ Done! Check debug-*.png files for visual inspection.');
})();
