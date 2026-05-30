import { corsHeaders, errorPayload, hostOriginFromHeaders, originFromHeaders, restorePurchaseByEmail } from "../server/stripe-checkout.mjs";

async function readBody(request) {
  if (request.body && typeof request.body === "object") return request.body;
  if (typeof request.body === "string") return JSON.parse(request.body || "{}");

  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
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
    const payload = await restorePurchaseByEmail((await readBody(request)).email);
    response.status(200).json(payload);
  } catch (error) {
    response.status(error.statusCode || 500).json(errorPayload(error));
  }
}
