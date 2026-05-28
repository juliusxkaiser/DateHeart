import { writeFile } from "node:fs/promises";

const cdpBase = process.env.CDP_URL || "http://127.0.0.1:9222";
const appUrl = process.env.APP_URL || "http://127.0.0.1:5174/";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function getTarget() {
  const targets = await fetch(`${cdpBase}/json/list`).then((response) => response.json());
  const appTarget = targets.find((target) => target.url?.startsWith(appUrl));

  if (appTarget?.webSocketDebuggerUrl) {
    return appTarget;
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
  await client.send("Page.bringToFront");
  const result = await client.send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false,
    fromSurface: false,
  });
  const path = `/private/tmp/${filename}`;
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
          count: document.querySelector('#ideaCounter')?.textContent || ''
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

    checks.push({
      viewport: name,
      homeScreenshot,
      resultScreenshot,
      canvas: canvasCheck.result.value,
      result: resultCheck.result.value,
      layout: layoutCheck.result.value,
    });
  }

  console.log(JSON.stringify({ appUrl, checks }, null, 2));
} finally {
  client.close();
}
