import { createCheckoutSession, corsHeaders, errorPayload, hostOriginFromHeaders, originFromHeaders } from "../../server/stripe-checkout.mjs";

export async function handler(event) {
  const origin = originFromHeaders(event.headers);
  const hostOrigin = hostOriginFromHeaders(event.headers);
  const headers = corsHeaders(origin, hostOrigin);

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "method_not_allowed" }) };
  }

  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const payload = await createCheckoutSession(body, { origin, hostOrigin });
    return { statusCode: 200, headers, body: JSON.stringify(payload) };
  } catch (error) {
    return { statusCode: error.statusCode || 500, headers, body: JSON.stringify(errorPayload(error)) };
  }
}
