const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

(async () => {
  try {
    const browser = await puppeteer.launch({ 
      executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      headless: 'new' 
    });
    const page = await browser.newPage();
    const downloadPath = path.resolve(__dirname, 'downloads');
    if (!fs.existsSync(downloadPath)) fs.mkdirSync(downloadPath);

    const client = await page.target().createCDPSession();
    await client.send('Page.setDownloadBehavior', {
      behavior: 'allow',
      downloadPath: downloadPath,
    });

    await page.setViewport({ width: 1280, height: 1024 });

    console.log('Navigating to login...');
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle2' });
    
    const emailInput = await page.$('input[type="email"]');
    if (emailInput) {
        await page.type('input[type="email"]', 'juan.delacruz@student.edu.ph');
        await page.type('input[type="password"]', 'admin123');
        
        await Promise.all([
          page.click('button[type="submit"]'),
          page.waitForNavigation({ waitUntil: 'networkidle2' })
        ]);
    }
    
    console.log('Navigating to profile...');
    await page.goto('http://localhost:5173/profile', { waitUntil: 'networkidle2' });
    
    await new Promise(r => setTimeout(r, 2000));
    
    console.log('Clicking Download ID...');
    const btn = await page.$('button.flex.items-center.gap-2.text-sm.font-bold');
    if (btn) {
        await btn.click();
        console.log('Clicked! Waiting for download...');
        await new Promise(r => setTimeout(r, 5000));
        console.log('Done.');
    } else {
        console.log('Download button not found');
    }
    
    await browser.close();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
