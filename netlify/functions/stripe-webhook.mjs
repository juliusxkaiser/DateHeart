import { WEBHOOK_BODY_LIMIT_BYTES, errorPayload, handleStripeWebhook, requestTooLargeError } from "../../server/stripe-checkout.mjs";

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "method_not_allowed" }) };
  }

  try {
    const rawBody = Buffer.from(event.body || "", event.isBase64Encoded ? "base64" : "utf8");
    if (rawBody.length > WEBHOOK_BODY_LIMIT_BYTES) throw requestTooLargeError();
    const payload = await handleStripeWebhook(rawBody, event.headers["stripe-signature"] || event.headers["Stripe-Signature"]);
    return { statusCode: 200, body: JSON.stringify(payload) };
  } catch (error) {
    return { statusCode: error.statusCode || 400, body: JSON.stringify(errorPayload(error)) };
  }
}
