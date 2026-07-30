const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  try {
    const browser = await puppeteer.launch({ 
      executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      headless: 'new' 
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 1024 });

    console.log('Navigating to login...');
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle2' });
    
    // Check if we are on the login page (or already logged in)
    const emailInput = await page.$('input[type="email"]');
    if (emailInput) {
        await page.type('input[type="email"]', 'juan.delacruz@student.edu.ph');
        await page.type('input[type="password"]', 'admin123');
        
        console.log('Submitting login...');
        await Promise.all([
          page.click('button[type="submit"]'),
          page.waitForNavigation({ waitUntil: 'networkidle2' })
        ]);
    } else {
        console.log('Already logged in.');
    }
    
    console.log('Navigating to profile...');
    await page.goto('http://localhost:5173/profile', { waitUntil: 'networkidle2' });
    
    await new Promise(r => setTimeout(r, 2000));
    await new Promise(r => setTimeout(r, 2000));
    
    await page.evaluate(() => {
        const el = document.querySelector('.shadow-2xl.bg-white.select-none');
        if (el && el.parentElement) {
            el.parentElement.style.opacity = '1';
            el.parentElement.style.position = 'relative';
            el.parentElement.style.zIndex = '100';
        }
    });
    
    const idCard = await page.$('.relative.overflow-hidden.rounded-xl.shadow-2xl.bg-white.select-none');
    if (!idCard) {
      console.log('ID card element not found! Taking full page screenshot.');
      await page.screenshot({ path: path.join(__dirname, 'error_full_page.png') });
    } else {
      console.log('Taking screenshot of ID card...');
      await idCard.screenshot({ path: path.join(__dirname, 'id_card_screenshot.png') });
      console.log('Screenshot saved successfully.');
    }
    
    await browser.close();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
