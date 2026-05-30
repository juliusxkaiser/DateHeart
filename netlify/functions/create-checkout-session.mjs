import {
  JSON_BODY_LIMIT_BYTES,
  clientIpFromHeaders,
  createCheckoutSession,
  corsHeaders,
  errorPayload,
  hostOriginFromHeaders,
  originFromHeaders,
  requestTooLargeError,
} from "../../server/stripe-checkout.mjs";

function readJsonBody(event) {
  const text = event.isBase64Encoded ? Buffer.from(event.body || "", "base64").toString("utf8") : event.body || "";
  if (Buffer.byteLength(text) > JSON_BODY_LIMIT_BYTES) throw requestTooLargeError();
  return text ? JSON.parse(text) : {};
}

export async function handler(event) {
  const origin = originFromHeaders(event.headers);
  const hostOrigin = hostOriginFromHeaders(event.headers);
  const clientIp = clientIpFromHeaders(event.headers);
  const headers = corsHeaders(origin, hostOrigin);

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "method_not_allowed" }) };
  }

  try {
    const payload = await createCheckoutSession(readJsonBody(event), { origin, hostOrigin, clientIp });
    return { statusCode: 200, headers, body: JSON.stringify(payload) };
  } catch (error) {
    return { statusCode: error.statusCode || 500, headers, body: JSON.stringify(errorPayload(error)) };
  }
}
