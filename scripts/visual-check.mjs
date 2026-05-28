import { writeFile } from "node:fs/promises";

const webdriverBase = process.env.WEBDRIVER_URL || "http://127.0.0.1:4444";
const appUrl = process.env.APP_URL || "http://127.0.0.1:5174/";

async function wd(path, method = "GET", body) {
  const response = await fetch(`${webdriverBase}${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};

  if (!response.ok) {
    throw new Error(`${method} ${path} failed with ${response.status}: ${text}`);
  }

  return payload.value ?? payload;
}

async function screenshot(sessionId, filename) {
  const base64 = await wd(`/session/${sessionId}/screenshot`);
  const path = `/private/tmp/${filename}`;
  await writeFile(path, Buffer.from(base64, "base64"));
  return path;
}

async function click(sessionId, selector) {
  const element = await wd(`/session/${sessionId}/element`, "POST", {
    using: "css selector",
    value: selector,
  });
  const elementId = element["element-6066-11e4-a52e-4f735466cecf"];
  await wd(`/session/${sessionId}/element/${elementId}/click`, "POST", {});
}

const session = await wd("/session", "POST", {
  capabilities: { alwaysMatch: { browserName: "safari" } },
});

const sessionId = session.sessionId;

try {
  await wd(`/session/${sessionId}/window/rect`, "POST", {
    width: 390,
    height: 844,
    x: 60,
    y: 40,
  });
  await wd(`/session/${sessionId}/url`, "POST", { url: appUrl });
  await new Promise((resolve) => setTimeout(resolve, 2500));

  const homeScreenshot = await screenshot(sessionId, "dateheart-home.png");
  await click(sessionId, "#heartButton");
  await new Promise((resolve) => setTimeout(resolve, 1100));
  const resultScreenshot = await screenshot(sessionId, "dateheart-result.png");

  const source = await wd(`/session/${sessionId}/source`);
  const resultHasIdea = source.includes("Euer Date heute:");
  const canvasPixels = await wd(`/session/${sessionId}/execute/sync`, "POST", {
    script:
      "const canvas = document.querySelector('#heartCanvas'); const ctx = canvas.getContext('2d'); const data = ctx.getImageData(Math.floor(canvas.width/2), Math.floor(canvas.height/2), 1, 1).data; return Array.from(data);",
    args: [],
  });

  console.log(
    JSON.stringify(
      {
        appUrl,
        homeScreenshot,
        resultScreenshot,
        resultHasIdea,
        canvasPixels,
      },
      null,
      2,
    ),
  );
} finally {
  await wd(`/session/${sessionId}`, "DELETE", {});
}
