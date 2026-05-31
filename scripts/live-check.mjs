const appUrl = new URL(process.env.APP_URL || "https://czarletsgo.github.io/dateheart-web/");
const apiBaseUrl = new URL(process.env.API_BASE_URL || appUrl);
const requireApi = process.env.REQUIRE_API === "true";
const requireConfiguredPayment = process.env.REQUIRE_CONFIGURED_PAYMENT === "true";
const requirePublicLaunch = process.env.REQUIRE_PUBLIC_LAUNCH === "true";

const errors = [];
const checks = [];

function absolute(path, base = appUrl) {
  return new URL(path, base).toString();
}

function assert(condition, message) {
  if (!condition) errors.push(message);
}

async function fetchText(path, options = {}) {
  const url = options.absolute ? path : absolute(path, options.base);
  const response = await fetch(url, {
    headers: {
      Accept: options.accept || "*/*",
    },
    redirect: "follow",
  });
  const text = await response.text();
  checks.push({
    name: options.name || path,
    status: response.status,
    contentType: response.headers.get("content-type") || "",
    bytes: text.length,
  });
  return { response, text, url };
}

async function fetchJson(path, options = {}) {
  const { response, text, url } = await fetchText(path, { ...options, accept: "application/json" });
  try {
    return { response, body: text ? JSON.parse(text) : {}, url };
  } catch {
    errors.push(`${url} did not return valid JSON.`);
    return { response, body: {}, url };
  }
}

function assertOkAsset(result, label, contentTypePattern) {
  assert(result.response.status === 200, `${label} returned ${result.response.status}.`);
  const contentType = result.response.headers.get("content-type") || "";
  if (contentTypePattern) assert(contentTypePattern.test(contentType), `${label} has unexpected content-type: ${contentType}`);
}

const index = await fetchText("./", { name: "index" });
assert(index.response.status === 200, `index returned ${index.response.status}.`);
assert(index.text.includes("DateHeart"), "index does not contain DateHeart.");
assert(index.text.includes("manifest.webmanifest"), "index does not link the web manifest.");
assert(!index.text.includes("/src/main.ts"), "index looks like a dev HTML file, not a production build.");

const manifestResult = await fetchJson("manifest.webmanifest", { name: "manifest" });
assert(manifestResult.response.status === 200, `manifest returned ${manifestResult.response.status}.`);
assert(manifestResult.body.name === "DateHeart", "manifest name is not DateHeart.");
assert(Array.isArray(manifestResult.body.icons) && manifestResult.body.icons.length >= 3, "manifest has too few icons.");
assert(Array.isArray(manifestResult.body.screenshots) && manifestResult.body.screenshots.length >= 2, "manifest has too few screenshots.");

for (const icon of manifestResult.body.icons || []) {
  const result = await fetchText(icon.src, { name: `icon:${icon.src}` });
  assertOkAsset(result, `icon ${icon.src}`, icon.type === "image/svg+xml" ? /image\/svg\+xml/ : /image\/png/);
}

for (const screenshot of manifestResult.body.screenshots || []) {
  const result = await fetchText(screenshot.src, { name: `screenshot:${screenshot.src}` });
  assertOkAsset(result, `screenshot ${screenshot.src}`, /image\/png/);
}

const requiredStaticFiles = [
  { path: "sw.js", type: /javascript|ecmascript|text\/plain/ },
  { path: "robots.txt", type: /text\/plain/ },
  { path: "sitemap.xml", type: /xml/ },
  { path: "404.html", type: /html/ },
  { path: "support.html", type: /html/ },
  { path: "privacy.html", type: /html/ },
  { path: "terms.html", type: /html/ },
  { path: "impressum.html", type: /html/ },
];

for (const file of requiredStaticFiles) {
  const result = await fetchText(file.path, { name: file.path });
  assertOkAsset(result, file.path, file.type);

  if (requirePublicLaunch && ["privacy.html", "terms.html", "impressum.html"].includes(file.path)) {
    assert(!/noindex|Launch note|\[add |\[Name|\[Stra|Support-E-Mail/i.test(result.text), `${file.path} is not public-launch ready.`);
  }
}

const apiHealth = await fetchText("api/health", { name: "api-health", base: apiBaseUrl, accept: "application/json" });
let apiHealthBody = {};
if ((apiHealth.response.headers.get("content-type") || "").includes("json") || apiHealth.text.trim().startsWith("{")) {
  try {
    apiHealthBody = apiHealth.text ? JSON.parse(apiHealth.text) : {};
  } catch {
    if (requireApi || requireConfiguredPayment) errors.push(`${apiHealth.url} did not return valid JSON.`);
  }
}
const apiLooksAvailable = apiHealth.response.status === 200 && apiHealthBody.ok === true;

if (requireApi || requireConfiguredPayment) {
  assert(apiLooksAvailable, `/api/health is required but returned ${apiHealth.response.status}.`);
}

if (apiLooksAvailable && requireConfiguredPayment) {
  assert(apiHealthBody.paymentReady === true, "paymentReady is not true on the live API.");
  assert(apiHealthBody.stripeConfigured === true, "STRIPE_SECRET_KEY is not configured on the live API.");
  assert(apiHealthBody.webhookConfigured === true, "STRIPE_WEBHOOK_SECRET is not configured on the live API.");
}

const result = {
  appUrl: appUrl.toString(),
  apiBaseUrl: apiBaseUrl.toString(),
  requireApi,
  requireConfiguredPayment,
  requirePublicLaunch,
  checks,
  apiAvailable: apiLooksAvailable,
  ok: errors.length === 0,
  errors,
};

console.log(JSON.stringify(result, null, 2));

if (errors.length > 0) {
  process.exit(1);
}
