import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "playwright";

const appUrl = process.env.APP_URL || "http://127.0.0.1:5174/";
const screenshotDir = process.env.SCREENSHOT_DIR || "/private/tmp";

await mkdir(screenshotDir, { recursive: true });

const browser = await chromium.launch();
const viewports = [
  { name: "mobile", width: 390, height: 844, deviceScaleFactor: 2, isMobile: true },
  { name: "desktop", width: 1280, height: 900, deviceScaleFactor: 1, isMobile: false },
];
const checks = [];

try {
  for (const viewport of viewports) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: viewport.deviceScaleFactor,
      isMobile: viewport.isMobile,
    });
    const page = await context.newPage();

    await page.goto(appUrl, { waitUntil: "networkidle" });
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForTimeout(1800);

    const homeScreenshot = join(screenshotDir, `dateheart-cdp-${viewport.name}-home.png`);
    await page.screenshot({ path: homeScreenshot, fullPage: false });

    const canvas = await page.locator("#heartCanvas").evaluate((node) => {
      const canvasNode = node;
      const ctx = canvasNode.getContext("webgl2") || canvasNode.getContext("webgl") || canvasNode.getContext("experimental-webgl");
      const rect = canvasNode.getBoundingClientRect();
      return {
        ok: Boolean(ctx),
        width: canvasNode.width,
        height: canvasNode.height,
        rect: {
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        },
      };
    });

    await page.locator("#heartButton").click();
    await page.waitForTimeout(1300);
    const resultScreenshot = join(screenshotDir, `dateheart-cdp-${viewport.name}-result.png`);
    await page.screenshot({ path: resultScreenshot, fullPage: false });

    const result = await page.evaluate(() => ({
      title: document.querySelector("#resultTitle")?.textContent || "",
      prompt: document.querySelector("#resultPrompt")?.textContent || "",
      visible: !document.querySelector("#resultOverlay")?.hidden,
      count: document.querySelector("#ideaCounter")?.textContent || "",
      filterAction: document.querySelector("#filterActionButton")?.textContent?.trim() || "",
      planItems: Array.from(document.querySelectorAll("#resultPlan li")).map((node) => node.textContent?.trim() || ""),
      aiPromptLength: document.querySelector("#resultAiPrompt")?.textContent?.trim().length || 0,
      copyPlanLabel: document.querySelector("#copyPlanButton")?.textContent?.trim() || "",
    }));

    const layout = await page.evaluate(() => {
      const box = (selector) => {
        const node = document.querySelector(selector);
        if (!node) return null;
        const rect = node.getBoundingClientRect();
        return {
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          bottom: Math.round(rect.bottom),
        };
      };

      return {
        viewport: { width: window.innerWidth, height: window.innerHeight },
        shell: box(".app-shell"),
        topbar: box(".topbar"),
        title: box(".brand-title"),
        filterAction: box(".filter-action"),
        heart: box(".heart-wrap"),
        resultCard: box(".result-card"),
      };
    });

    await page.locator("#closeResultButton").click();
    await page.locator("#filterActionButton").click();
    await page.locator('#categoryChips .choice-button[data-value="Creative"]').click();
    const categoryPanelScreenshot = join(screenshotDir, `dateheart-cdp-${viewport.name}-filter.png`);
    await page.screenshot({ path: categoryPanelScreenshot, fullPage: false });
    await page.locator('#budgetChips .choice-button[data-value="Up to 40 EUR"]').click();
    await page.locator('#durationChips .choice-button[data-value="60-90 min"]').click();
    await page.locator("#closeFilterButton").click();
    await page.locator("#heartButton").click();
    await page.waitForTimeout(1300);

    const filterFunction = await page.evaluate(() => {
      const activeChoice = (selector) =>
        Array.from(document.querySelectorAll(selector)).find((node) => node.classList.contains("active"))?.dataset.value || "";

      return {
        filterAction: document.querySelector("#filterActionButton")?.textContent?.trim() || "",
        activeCategory: activeChoice("#categoryChips .choice-button"),
        activeBudget: activeChoice("#budgetChips .choice-button"),
        activeDuration: activeChoice("#durationChips .choice-button"),
        meta: document.querySelector("#resultMeta")?.textContent || "",
        title: document.querySelector("#resultTitle")?.textContent || "",
        prompt: document.querySelector("#resultPrompt")?.textContent || "",
        visible: !document.querySelector("#resultOverlay")?.hidden,
      };
    });

    if (!canvas.ok || canvas.width < 120 || canvas.height < 120) {
      throw new Error(`${viewport.name} canvas did not initialise correctly.`);
    }

    if (!result.visible || !result.title || !result.prompt) {
      throw new Error(`${viewport.name} result card did not reveal an idea.`);
    }

    if (!result.filterAction) {
      throw new Error(`${viewport.name} filter action is missing.`);
    }

    if (result.planItems.length < 3 || result.aiPromptLength < 80 || !result.copyPlanLabel) {
      throw new Error(`${viewport.name} result plan tools are incomplete.`);
    }

    if (
      filterFunction.activeCategory !== "Creative" ||
      filterFunction.activeBudget !== "Up to 40 EUR" ||
      filterFunction.activeDuration !== "60-90 min" ||
      !filterFunction.visible ||
      !filterFunction.meta.includes("Creative") ||
      !filterFunction.meta.includes("60-90 min")
    ) {
      throw new Error(`${viewport.name} filter controls did not produce a matching idea.`);
    }

    const sharedUrl = new URL(appUrl);
    sharedUrl.searchParams.set("idea", "date-00001");
    sharedUrl.searchParams.set("lang", "de");
    sharedUrl.searchParams.set("category", "Creative");
    sharedUrl.searchParams.set("budget", "Up to 40 EUR");
    sharedUrl.searchParams.set("duration", "60-90 min");
    await page.goto(sharedUrl.toString(), { waitUntil: "networkidle" });
    await page.waitForTimeout(800);

    const sharedLink = await page.evaluate(() => ({
      lang: document.documentElement.lang,
      visible: !document.querySelector("#resultOverlay")?.hidden,
      title: document.querySelector("#resultTitle")?.textContent || "",
      filterAction: document.querySelector("#filterActionButton")?.textContent?.trim() || "",
      activeCategory: Array.from(document.querySelectorAll("#categoryChips .choice-button")).find((node) => node.classList.contains("active"))
        ?.getAttribute("data-value") || "",
      activeBudget: Array.from(document.querySelectorAll("#budgetChips .choice-button")).find((node) => node.classList.contains("active"))
        ?.getAttribute("data-value") || "",
      activeDuration: Array.from(document.querySelectorAll("#durationChips .choice-button")).find((node) => node.classList.contains("active"))
        ?.getAttribute("data-value") || "",
      query: window.location.search,
    }));

    if (
      sharedLink.lang !== "de" ||
      !sharedLink.visible ||
      !sharedLink.title ||
      sharedLink.activeCategory !== "Creative" ||
      sharedLink.activeBudget !== "Up to 40 EUR" ||
      sharedLink.activeDuration !== "60-90 min"
    ) {
      throw new Error(`${viewport.name} shared idea link did not restore idea, language, and filters.`);
    }

    checks.push({
      viewport: viewport.name,
      homeScreenshot,
      resultScreenshot,
      categoryPanelScreenshot,
      canvas,
      result,
      filterFunction,
      sharedLink,
      layout,
    });

    await context.close();
  }
} finally {
  await browser.close();
}

console.log(JSON.stringify({ appUrl, checks }, null, 2));
