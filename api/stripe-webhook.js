import { errorPayload, handleStripeWebhook } from "../server/stripe-checkout.mjs";

async function readRawBody(request) {
  if (Buffer.isBuffer(request.body)) return request.body;
  if (typeof request.body === "string") return Buffer.from(request.body);
  if (request.body && typeof request.body === "object") return Buffer.from(JSON.stringify(request.body));

  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
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
