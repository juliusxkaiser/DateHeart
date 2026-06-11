import { chromium } from 'playwright';

const EMAIL = 'juliuskaiser423@gmail.com';
const PASS = 'Zerolado02*';

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 200 });
  const page = await browser.newPage();

  // Go directly to hpanel
  console.log('Going to hpanel...');
  await page.goto('https://hpanel.hostinger.com/login');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(3000);
  await page.screenshot({ path: '/tmp/h1.png', fullPage: true });

  const inputs = await page.locator('input').all();
  for (const i of inputs) {
    const type = await i.getAttribute('type') || '';
    const name = await i.getAttribute('name') || '';
    const placeholder = await i.getAttribute('placeholder') || '';
    const visible = await i.isVisible();
    console.log(`INPUT type=${type} name=${name} ph="${placeholder}" visible=${visible}`);
  }

  // Try filling
  const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i], input[placeholder*="Email" i]').first();
  if (await emailInput.isVisible({ timeout: 5000 }).catch(() => false)) {
    await emailInput.fill(EMAIL);
    const passInput = page.locator('input[type="password"]').first();
    await passInput.fill(PASS);
    await page.screenshot({ path: '/tmp/h2.png' });
    await page.click('button[type="submit"]');
    await page.waitForTimeout(4000);
    console.log('After login:', page.url());
    await page.screenshot({ path: '/tmp/h3.png', fullPage: true });
  } else {
    console.log('No email input found');
  }

  await page.waitForTimeout(30000);
  await browser.close();
})();
