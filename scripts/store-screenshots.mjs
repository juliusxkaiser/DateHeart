import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "playwright";
import sharp from "sharp";

const appUrl = process.env.APP_URL || "http://127.0.0.1:4173/";
const screenshotRoot = process.env.SCREENSHOT_DIR || "store/screenshots";

const targets = [
  {
    name: "app-store/iphone-69",
    width: 430,
    height: 932,
    deviceScaleFactor: 3,
    isMobile: true,
  },
  {
    name: "google-play/phone",
    width: 540,
    height: 960,
    deviceScaleFactor: 2,
    isMobile: true,
  },
];

const shots = [
  { name: "home", file: "01-home.png" },
  { name: "result", file: "02-result.png" },
  { name: "filter", file: "03-filter.png" },
];

await mkdir(screenshotRoot, { recursive: true });

const browser = await chromium.launch();
const outputs = [];

try {
  for (const target of targets) {
    const outDir = join(screenshotRoot, target.name);
    await mkdir(outDir, { recursive: true });

    const context = await browser.newContext({
      viewport: { width: target.width, height: target.height },
      deviceScaleFactor: target.deviceScaleFactor,
      isMobile: target.isMobile,
    });
    const page = await context.newPage();

    await page.goto(appUrl, { waitUntil: "networkidle" });
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForTimeout(1800);

    const homePath = join(outDir, shots[0].file);
    await page.screenshot({ path: homePath, fullPage: false });

    await page.locator("#heartButton").click();
    await page.waitForTimeout(1300);
    const resultPath = join(outDir, shots[1].file);
    await page.screenshot({ path: resultPath, fullPage: false });

    await page.locator("#closeResultButton").click();
    await page.locator("#filterActionButton").click();
    await page.locator('#categoryChips .choice-button[data-value="Creative"]').click();
    const filterPath = join(outDir, shots[2].file);
    await page.screenshot({ path: filterPath, fullPage: false });

    const files = await Promise.all(
      [homePath, resultPath, filterPath].map(async (path) => {
        const image = await sharp(path).metadata();
        return {
          path,
          width: image.width,
          height: image.height,
        };
      }),
    );

    outputs.push({
      target: target.name,
      expectedPixels: {
        width: target.width * target.deviceScaleFactor,
        height: target.height * target.deviceScaleFactor,
      },
      files,
    });

    await context.close();
  }
} finally {
  await browser.close();
}

console.log(JSON.stringify({ appUrl, screenshotRoot, outputs }, null, 2));
