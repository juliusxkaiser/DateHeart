import { clientIpFromHeaders, corsHeaders, errorPayload, hostOriginFromHeaders, originFromHeaders, verifyCheckoutSession } from "../server/stripe-checkout.mjs";

export default async function handler(request, response) {
  const origin = originFromHeaders(request.headers);
  const hostOrigin = hostOriginFromHeaders(request.headers);
  const headers = corsHeaders(origin, hostOrigin);

  Object.entries(headers).forEach(([key, value]) => response.setHeader(key, value));

  if (request.method === "OPTIONS") {
    response.status(204).end();
    return;
  }

  if (request.method !== "GET") {
    response.status(405).json({ error: "method_not_allowed" });
    return;
  }

  try {
    const url = new URL(request.url ?? "", hostOrigin);
    const payload = await verifyCheckoutSession(url.searchParams.get("session_id"), { origin, hostOrigin, clientIp: clientIpFromHeaders(request.headers) });
    response.status(200).json(payload);
  } catch (error) {
    response.status(error.statusCode || 500).json(errorPayload(error));
  }
}
