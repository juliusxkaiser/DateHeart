import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import {
  JSON_BODY_LIMIT_BYTES,
  WEBHOOK_BODY_LIMIT_BYTES,
  clientIpFromHeaders,
  corsHeaders,
  createCheckoutSession,
  errorPayload,
  handleStripeWebhook,
  paymentEnvironmentStatus,
  requestTooLargeError,
  restorePurchaseByEmail,
  verifyCheckoutSession,
} from "./stripe-checkout.mjs";

const PORT = Number(process.env.PORT || 8080);
const DIST_DIR = new URL("../dist/", import.meta.url).pathname;

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
};

function sendJson(response, statusCode, payload, extraHeaders = {}) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    ...extraHeaders,
  });
  response.end(JSON.stringify(payload));
}

async function readJson(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > JSON_BODY_LIMIT_BYTES) throw requestTooLargeError();
    chunks.push(chunk);
  }
  const text = Buffer.concat(chunks).toString("utf8");
  return text ? JSON.parse(text) : {};
}

async function readRaw(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > WEBHOOK_BODY_LIMIT_BYTES) throw requestTooLargeError();
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

function hostOrigin(request) {
  const host = request.headers["x-forwarded-host"] || request.headers.host;
  const protocol = request.headers["x-forwarded-proto"] || "http";
  return host ? `${protocol}://${host}` : undefined;
}

async function handleApi(request, response, url) {
  const context = {
    // request.socket.remoteAddress = echte Peer-IP (unspoofbar bei self-host),
    // gewinnt gegen client-gesetzte x-forwarded-for-Header im Rate-Limiter.
    clientIp: clientIpFromHeaders(request.headers, request.socket?.remoteAddress),
    hostOrigin: hostOrigin(request),
    origin: request.headers.origin,
  };
  const headers = corsHeaders(context.origin, context.hostOrigin);

  try {
    if (url.pathname === "/api/create-checkout-session" && request.method === "POST") {
      sendJson(response, 200, await createCheckoutSession(await readJson(request), context), headers);
      return true;
    }

    if (url.pathname === "/api/health" && request.method === "GET") {
      sendJson(response, 200, paymentEnvironmentStatus(), headers);
      return true;
    }

    if (url.pathname === "/api/verify-checkout-session" && request.method === "GET") {
      sendJson(response, 200, await verifyCheckoutSession(url.searchParams.get("session_id"), context), headers);
      return true;
    }

    if (url.pathname === "/api/restore-purchase" && request.method === "POST") {
      sendJson(response, 200, await restorePurchaseByEmail((await readJson(request)).email, context), headers);
      return true;
    }

    if (url.pathname === "/api/stripe-webhook" && request.method === "POST") {
      sendJson(response, 200, await handleStripeWebhook(await readRaw(request), request.headers["stripe-signature"]));
      return true;
    }

    if (url.pathname.startsWith("/api/")) {
      sendJson(response, 404, { error: "not_found" }, headers);
      return true;
    }
  } catch (error) {
    sendJson(response, error.statusCode || 500, errorPayload(error), headers);
    return true;
  }

  return false;
}

async function serveStatic(request, response, url) {
  const rawPath = url.pathname === "/" ? "/index.html" : url.pathname;
  const normalizedPath = normalize(decodeURIComponent(rawPath)).replace(/^(\.\.[/\\])+/, "");
  let filePath = join(DIST_DIR, normalizedPath);

  try {
    const fileStat = await stat(filePath);
    if (fileStat.isDirectory()) filePath = join(filePath, "index.html");
  } catch {
    filePath = join(DIST_DIR, "index.html");
  }

  const extension = extname(filePath);
  const cacheControl = filePath.includes("/assets/") ? "public, max-age=31536000, immutable" : "no-cache";

  response.writeHead(200, {
    "Cache-Control": cacheControl,
    "Content-Type": contentTypes[extension] || "application/octet-stream",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
  });
  createReadStream(filePath).pipe(response);
}

createServer(async (request, response) => {
  const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);

  if (request.method === "OPTIONS" && url.pathname.startsWith("/api/")) {
    sendJson(response, 204, {}, corsHeaders(request.headers.origin, hostOrigin(request)));
    return;
  }

  if (await handleApi(request, response, url)) return;

  try {
    await serveStatic(request, response, url);
  } catch {
    response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("DateHeart server error");
  }
}).listen(PORT, () => {
  console.log(`DateHeart listening on :${PORT}`);
});
