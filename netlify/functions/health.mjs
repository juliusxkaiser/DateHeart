import { corsHeaders, hostOriginFromHeaders, originFromHeaders, paymentEnvironmentStatus } from "../../server/stripe-checkout.mjs";

export async function handler(event) {
  const origin = originFromHeaders(event.headers);
  const hostOrigin = hostOriginFromHeaders(event.headers);
  const headers = corsHeaders(origin, hostOrigin);

  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers,
      body: "",
    };
  }

  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        ...headers,
      },
      body: JSON.stringify({ error: "method_not_allowed" }),
    };
  }

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...headers,
    },
    body: JSON.stringify(paymentEnvironmentStatus()),
  };
}
