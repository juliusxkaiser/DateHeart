import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const cdpBase = process.env.CDP_URL || "http://127.0.0.1:9222";
const appUrl = process.env.APP_URL || "http://127.0.0.1:5174/";
const screenshotDir = process.env.SCREENSHOT_DIR || "/private/tmp";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function getTarget() {
  if (process.env.REUSE_CDP_TARGET === "true") {
    const targets = await fetch(`${cdpBase}/json/list`).then((response) => response.json());
    const appTarget = targets.find((target) => target.url?.startsWith(appUrl));

    if (appTarget?.webSocketDebuggerUrl) {
      return appTarget;
    }
  }

  const newTarget = await fetch(`${cdpBase}/json/new?${encodeURIComponent(appUrl)}`, {
    method: "PUT",
  }).then((response) => response.json());

  if (!newTarget.webSocketDebuggerUrl) {
    throw new Error("No debuggable page target found.");
  }

  return newTarget;
}

function connect(wsUrl) {
  const socket = new WebSocket(wsUrl);
  const pending = new Map();
  let nextId = 1;

  socket.addEventListener("message", (event) => {
    const payload = JSON.parse(event.data);
    if (!payload.id) return;

    const request = pending.get(payload.id);
    if (!request) return;

    pending.delete(payload.id);

    if (payload.error) {
      request.reject(new Error(`${request.method}: ${payload.error.message}`));
      return;
    }

    request.resolve(payload.result);
  });

  return new Promise((resolve, reject) => {
    socket.addEventListener("open", () => {
      resolve({
        send(method, params = {}) {
          const id = nextId;
          nextId += 1;
          socket.send(JSON.stringify({ id, method, params }));
          return new Promise((requestResolve, requestReject) => {
            pending.set(id, {
              method,
              resolve: requestResolve,
              reject: requestReject,
            });
          });
        },
        close() {
          socket.close();
        },
      });
    });
    socket.addEventListener("error", () => reject(new Error("CDP WebSocket failed.")));
  });
}

async function saveScreenshot(client, filename) {
  await mkdir(screenshotDir, { recursive: true });
  await client.send("Page.bringToFront");
  const result = await client.send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false,
    fromSurface: true,
  });
  const path = join(screenshotDir, filename);
  await writeFile(path, Buffer.from(result.data, "base64"));
  return path;
}

const target = await getTarget();
const client = await connect(target.webSocketDebuggerUrl);

try {
  await client.send("Page.enable");
  await client.send("Network.enable");
  await client.send("Network.setBypassServiceWorker", { bypass: true });
  await client.send("Network.setCacheDisabled", { cacheDisabled: true });
  await client.send("Runtime.enable");
  await client.send("Emulation.setDefaultBackgroundColorOverride", {
    color: { r: 201, g: 4, b: 50, a: 1 },
  });

  const viewports = [
    { name: "mobile", width: 390, height: 844, deviceScaleFactor: 2, mobile: true },
    { name: "desktop", width: 1280, height: 900, deviceScaleFactor: 1, mobile: false },
  ];

  const checks = [];

  for (const viewport of viewports) {
    const { name, ...metrics } = viewport;
    await client.send("Emulation.setDeviceMetricsOverride", metrics);
    await client.send("Page.navigate", { url: appUrl });
    await wait(700);
    await client.send("Runtime.evaluate", {
      expression: "localStorage.clear(); sessionStorage.clear();",
    });
    await client.send("Page.navigate", { url: appUrl });
    await wait(2600);

    const homeScreenshot = await saveScreenshot(client, `dateheart-cdp-${name}-home.png`);
    const canvasCheck = await client.send("Runtime.evaluate", {
      expression: `
        (() => {
          const canvas = document.querySelector('#heartCanvas');
          if (!canvas) return { ok: false, reason: 'missing-canvas' };
          const ctx = canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
          return {
            ok: Boolean(ctx),
            width: canvas.width,
            height: canvas.height,
            rect: canvas.getBoundingClientRect().toJSON(),
          };
        })()
      `,
      returnByValue: true,
    });

    await client.send("Runtime.evaluate", {
      expression: "document.querySelector('#heartButton').click()",
      awaitPromise: false,
    });
    await wait(1300);
    const resultScreenshot = await saveScreenshot(client, `dateheart-cdp-${name}-result.png`);
    const resultCheck = await client.send("Runtime.evaluate", {
      expression: `
        (() => ({
          title: document.querySelector('#resultTitle')?.textContent || '',
          prompt: document.querySelector('#resultPrompt')?.textContent || '',
          visible: !document.querySelector('#resultOverlay')?.hidden,
          count: document.querySelector('#ideaCounter')?.textContent || '',
          filterAction: document.querySelector('#filterActionButton')?.textContent?.trim() || '',
          planItems: Array.from(document.querySelectorAll('#resultPlan li')).map((node) => node.textContent?.trim() || ''),
          aiPromptLength: document.querySelector('#resultAiPrompt')?.textContent?.trim().length || 0,
          copyPlanLabel: document.querySelector('#copyPlanButton')?.textContent?.trim() || ''
        }))()
      `,
      returnByValue: true,
    });
    const layoutCheck = await client.send("Runtime.evaluate", {
      expression: `
        (() => {
          const box = (selector) => {
            const node = document.querySelector(selector);
            if (!node) return null;
            const rect = node.getBoundingClientRect();
            return {
              x: Math.round(rect.x),
              y: Math.round(rect.y),
              width: Math.round(rect.width),
              height: Math.round(rect.height),
              bottom: Math.round(rect.bottom)
            };
          };

          return {
            viewport: { width: window.innerWidth, height: window.innerHeight },
            shell: box('.app-shell'),
            topbar: box('.topbar'),
            title: box('.brand-title'),
            heart: box('.heart-wrap'),
            resultCard: box('.result-card'),
          };
        })()
      `,
      returnByValue: true,
    });

    await client.send("Runtime.evaluate", {
      expression: "document.querySelector('#closeResultButton')?.click()",
    });
    await wait(260);
    await client.send("Runtime.evaluate", {
      expression: `
        (() => {
          document.querySelector('#filterActionButton')?.click();
          const category = Array.from(document.querySelectorAll('#categoryChips .choice-button')).find((node) => node.dataset.value === 'Creative');
          category?.click();
          document.querySelector('#closeFilterButton')?.click();
          document.querySelector('#heartButton')?.click();
        })()
      `,
    });
    await wait(1300);
    const filterFunctionCheck = await client.send("Runtime.evaluate", {
      expression: `
        (() => ({
          filterAction: document.querySelector('#filterActionButton')?.textContent?.trim() || '',
          activeCategory: Array.from(document.querySelectorAll('#categoryChips .choice-button')).find((node) => node.classList.contains('active'))?.dataset.value || '',
          meta: document.querySelector('#resultMeta')?.textContent || '',
          title: document.querySelector('#resultTitle')?.textContent || '',
          prompt: document.querySelector('#resultPrompt')?.textContent || '',
          visible: !document.querySelector('#resultOverlay')?.hidden
        }))()
      `,
      returnByValue: true,
    });

    const resultValue = resultCheck.result.value;
    const canvasValue = canvasCheck.result.value;

    if (!canvasValue.ok || canvasValue.width < 120 || canvasValue.height < 120) {
      throw new Error(`${name} canvas did not initialise correctly.`);
    }

    if (!resultValue.visible || !resultValue.title || !resultValue.prompt) {
      throw new Error(`${name} result card did not reveal an idea.`);
    }

    if (!resultValue.filterAction) {
      throw new Error(`${name} filter action is missing.`);
    }

    if (resultValue.planItems.length < 3 || resultValue.aiPromptLength < 80 || !resultValue.copyPlanLabel) {
      throw new Error(`${name} result plan tools are incomplete.`);
    }

    const filterFunctionValue = filterFunctionCheck.result.value;
    if (filterFunctionValue.activeCategory !== "Creative" || !filterFunctionValue.visible || !filterFunctionValue.meta.includes("Creative")) {
      throw new Error(`${name} category filter did not produce a Creative idea.`);
    }

    checks.push({
      viewport: name,
      homeScreenshot,
      resultScreenshot,
      canvas: canvasValue,
      result: resultValue,
      filterFunction: filterFunctionValue,
      layout: layoutCheck.result.value,
    });
  }

  console.log(JSON.stringify({ appUrl, checks }, null, 2));
} finally {
  client.close();
}
