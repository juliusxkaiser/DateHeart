import { WEBHOOK_BODY_LIMIT_BYTES, errorPayload, handleStripeWebhook, requestTooLargeError } from "../server/stripe-checkout.mjs";

async function readRawBody(request) {
  if (Buffer.isBuffer(request.body)) {
    if (request.body.length > WEBHOOK_BODY_LIMIT_BYTES) throw requestTooLargeError();
    return request.body;
  }
  if (typeof request.body === "string") {
    if (Buffer.byteLength(request.body) > WEBHOOK_BODY_LIMIT_BYTES) throw requestTooLargeError();
    return Buffer.from(request.body);
  }
  if (request.body && typeof request.body === "object") {
    const text = JSON.stringify(request.body);
    if (Buffer.byteLength(text) > WEBHOOK_BODY_LIMIT_BYTES) throw requestTooLargeError();
    return Buffer.from(text);
  }

  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > WEBHOOK_BODY_LIMIT_BYTES) throw requestTooLargeError();
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.status(405).json({ error: "method_not_allowed" });
    return;
  }

  try {
    const payload = await handleStripeWebhook(await readRawBody(request), request.headers["stripe-signature"]);
    response.status(200).json(payload);
  } catch (error) {
    response.status(error.statusCode || 400).json(errorPayload(error));
  }
}
