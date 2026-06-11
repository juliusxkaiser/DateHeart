import { chromium } from 'playwright';

const PROJECT_ID = 'lhubhlnxiosuqzhfxcrp';
const RESEND_API_KEY = 're_U81kXttH_MKSUeC8evC4Agucuaj5F6pdn';
const GITHUB_USER = 'czarletsgo';
const GITHUB_PASS = 'Zerolado02*';

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 200 });
  const page = await browser.newPage();

  console.log('Loading Supabase sign-in...');
  await page.goto('https://supabase.com/dashboard/sign-in');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);

  // Accept cookies
  try { await page.click('button:has-text("Accept")', { timeout: 3000 }); } catch(e) {}

  // Click Continue with GitHub
  await page.click('button:has-text("Continue with GitHub")');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  console.log('On GitHub:', page.url());

  // GitHub login
  if (page.url().toString().includes('github.com/login')) {
    console.log('Filling GitHub credentials...');
    await page.fill('#login_field', GITHUB_USER);
    await page.fill('#password', GITHUB_PASS);
    await page.click('input[type="submit"], button[type="submit"]');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);
    console.log('After GitHub submit:', page.url());
    await page.screenshot({ path: '/tmp/after-github.png', fullPage: true });
  }

  // If GitHub asks to authorize Supabase
  if (page.url().toString().includes('github.com')) {
    console.log('Checking for authorize button...');
    const authBtn = page.locator('button:has-text("Authorize"), input[value="Authorize"]');
    if (await authBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await authBtn.click();
      await page.waitForTimeout(3000);
      console.log('Authorized Supabase on GitHub');
    }
  }

  // Wait for Supabase dashboard
  await page.waitForURL(url => url.toString().includes('supabase.com/dashboard') && !url.toString().includes('sign-in'), { timeout: 30000 });
  console.log('Logged in! URL:', page.url());
  await page.waitForTimeout(2000);

  // ── STEP 1: Edge Function Secrets ──
  console.log('\n[1] Going to Edge Function Secrets...');
  await page.goto(`https://supabase.com/dashboard/project/${PROJECT_ID}/settings/functions`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(5000);
  await page.screenshot({ path: '/tmp/secrets.png', fullPage: true });

  const sBtns = await page.locator('button').all();
  for (const b of sBtns) {
    const t = (await b.textContent() || '').trim();
    if (t) console.log('BTN:', t);
  }

  let clicked = false;
  for (const b of sBtns) {
    const t = (await b.textContent() || '').trim();
    if (/add.*secret|new.*secret/i.test(t)) {
      await b.click(); clicked = true;
      await page.waitForTimeout(2000); break;
    }
  }
  if (!clicked) {
    // try just "Add"
    for (const b of sBtns) {
      const t = (await b.textContent() || '').trim();
      if (t === 'Add') { await b.click(); clicked = true; await page.waitForTimeout(2000); break; }
    }
  }

  await page.screenshot({ path: '/tmp/secrets2.png', fullPage: true });
  const inputs = await page.locator('input:visible').all();
  console.log('Inputs visible:', inputs.length);
  if (inputs.length >= 2) {
    await inputs[0].fill('RESEND_API_KEY');
    await inputs[1].fill(RESEND_API_KEY);
    const saveBtns = await page.locator('button:visible').all();
    for (const b of saveBtns) {
      const t = (await b.textContent() || '').trim();
      if (/save|add|create/i.test(t)) { await b.click(); await page.waitForTimeout(2000); break; }
    }
    console.log('✓ RESEND_API_KEY saved');
  }

  // ── STEP 2: Auth Redirect URL ──
  console.log('\n[2] Auth URL configuration...');
  await page.goto(`https://supabase.com/dashboard/project/${PROJECT_ID}/auth/url-configuration`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(5000);
  await page.screenshot({ path: '/tmp/auth-url.png', fullPage: true });

  const urlBtns = await page.locator('button').all();
  for (const b of urlBtns) {
    const t = (await b.textContent() || '').trim();
    if (t) console.log('URL PAGE BTN:', t);
  }

  for (const b of urlBtns) {
    const t = (await b.textContent() || '').trim();
    if (/add.*url|new.*url/i.test(t)) {
      await b.click();
      await page.waitForTimeout(1500);
      const inp = page.locator('input:visible').last();
      await inp.fill('https://toollyne.web.app/auth/callback');
      const sb = page.locator('button:visible').filter({ hasText: /save|add/i }).last();
      await sb.click();
      await page.waitForTimeout(2000);
      console.log('✓ Redirect URL added');
      break;
    }
  }

  await page.screenshot({ path: '/tmp/done.png', fullPage: true });
  console.log('\nAll done!');
  await page.waitForTimeout(10000);
  await browser.close();
})();
