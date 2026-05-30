import {
  JSON_BODY_LIMIT_BYTES,
  clientIpFromHeaders,
  createCheckoutSession,
  corsHeaders,
  errorPayload,
  hostOriginFromHeaders,
  originFromHeaders,
  requestTooLargeError,
} from "../server/stripe-checkout.mjs";

async function readBody(request) {
  if (request.body && typeof request.body === "object") {
    if (Buffer.byteLength(JSON.stringify(request.body)) > JSON_BODY_LIMIT_BYTES) throw requestTooLargeError();
    return request.body;
  }
  if (typeof request.body === "string") {
    if (Buffer.byteLength(request.body) > JSON_BODY_LIMIT_BYTES) throw requestTooLargeError();
    return JSON.parse(request.body || "{}");
  }

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

export default async function handler(request, response) {
  const origin = originFromHeaders(request.headers);
  const hostOrigin = hostOriginFromHeaders(request.headers);
  const headers = corsHeaders(origin, hostOrigin);

  Object.entries(headers).forEach(([key, value]) => response.setHeader(key, value));

  if (request.method === "OPTIONS") {
    response.status(204).end();
    return;
  }

  if (request.method !== "POST") {
    response.status(405).json({ error: "method_not_allowed" });
    return;
  }

  try {
    const body = await readBody(request);
    const payload = await createCheckoutSession(body, { origin, hostOrigin, clientIp: clientIpFromHeaders(request.headers) });
    response.status(200).json(payload);
  } catch (error) {
    response.status(error.statusCode || 500).json(errorPayload(error));
  }
}
