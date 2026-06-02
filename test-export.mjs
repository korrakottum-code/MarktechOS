import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';

(async () => {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  // Set viewport to a desktop size
  await page.setViewport({ width: 1440, height: 900 });

  const downloadPath = path.resolve('./downloads');
  if (!fs.existsSync(downloadPath)) fs.mkdirSync(downloadPath);

  // Set download behavior
  const client = await page.target().createCDPSession();
  await client.send('Page.setDownloadBehavior', {
    behavior: 'allow',
    downloadPath: downloadPath
  });

  page.on('console', msg => console.log('BROWSER:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));

  console.log('Navigating to localhost:3000...');
  try {
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
  } catch (err) {
    console.error('Failed to load localhost:3000. Is the server running?', err);
    process.exit(1);
  }

  console.log('Waiting for data to load...');
  // Wait for the Export button to become available and the table to render
  await page.waitForSelector('button', { timeout: 30000 });
  await new Promise(r => setTimeout(r, 3000)); // Wait for animations and data settling

  console.log('Clicking Export PDF...');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const exportBtn = buttons.find(b => b.textContent && b.textContent.includes('Export PDF'));
    if (exportBtn) exportBtn.click();
  });

  console.log('Waiting for download to finish (may take up to 30s)...');
  await new Promise(r => setTimeout(r, 20000));

  const files = fs.readdirSync(downloadPath);
  const pdfFile = files.find(f => f.endsWith('.pdf'));
  
  if (pdfFile) {
    console.log(`Successfully downloaded: ${pdfFile}`);
    console.log(`Please view downloads/${pdfFile} to inspect the result.`);
  } else {
    console.log('No PDF found in downloads directory. Did it crash?');
  }

  await browser.close();
})();
