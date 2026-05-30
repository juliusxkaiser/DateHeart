import Stripe from "stripe";
import { PRODUCT_ID, PRODUCT_NAME, stripeUnitAmountForCurrency } from "./pricing.mjs";

export const JSON_BODY_LIMIT_BYTES = 16 * 1024;
export const WEBHOOK_BODY_LIMIT_BYTES = 1024 * 1024;

let stripeClient;
const rateBuckets = new Map();
const rateLimits = {
  checkout: { max: 20, windowMs: 5 * 60 * 1000 },
  restore: { max: 8, windowMs: 10 * 60 * 1000 },
  verify: { max: 80, windowMs: 10 * 60 * 1000 },
};

function configuredSecret(name, prefix) {
  const value = process.env[name]?.trim();
  if (!value || value.includes("replace_me") || !value.startsWith(prefix)) return undefined;
  return value;
}

function stripe() {
  const secretKey = configuredSecret("STRIPE_SECRET_KEY", "sk_");
  if (!secretKey) {
    throw Object.assign(new Error("STRIPE_SECRET_KEY is missing."), { statusCode: 503, publicCode: "payment_unavailable" });
  }

  stripeClient ??= new Stripe(secretKey);
  return stripeClient;
}

function webhookSecret() {
  const secret = configuredSecret("STRIPE_WEBHOOK_SECRET", "whsec_");
  if (!secret) {
    throw Object.assign(new Error("STRIPE_WEBHOOK_SECRET is missing."), { statusCode: 503, publicCode: "webhook_unavailable" });
  }

  return secret;
}

export function paymentEnvironmentStatus() {
  const stripeConfigured = Boolean(configuredSecret("STRIPE_SECRET_KEY", "sk_"));
  const webhookConfigured = Boolean(configuredSecret("STRIPE_WEBHOOK_SECRET", "whsec_"));

  return {
    ok: true,
    paymentReady: stripeConfigured && webhookConfigured,
    stripeConfigured,
    webhookConfigured,
    automaticTax: process.env.STRIPE_AUTOMATIC_TAX === "true",
    allowedOriginsConfigured: configuredAllowedOrigins().length,
  };
}

function configuredAllowedOrigins() {
  return (process.env.PAYMENT_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function hostOriginFromHeaders(headers = {}) {
  const host = headers["x-forwarded-host"] || headers.host;
  if (!host) return undefined;
  const protocol = headers["x-forwarded-proto"] || "https";
  return `${protocol}://${host}`;
}

export function originFromHeaders(headers = {}) {
  return headers.origin || headers.Origin;
}

export function clientIpFromHeaders(headers = {}) {
  const forwarded = headers["x-forwarded-for"] || headers["X-Forwarded-For"];
  if (typeof forwarded === "string" && forwarded.trim()) return forwarded.split(",")[0].trim();
  return headers["x-real-ip"] || headers["X-Real-IP"] || headers["cf-connecting-ip"] || headers["CF-Connecting-IP"] || undefined;
}

export function requestTooLargeError() {
  return Object.assign(new Error("Request body is too large."), { statusCode: 413, publicCode: "request_too_large" });
}

function isOriginAllowed(origin, hostOrigin) {
  if (!origin) return true;
  if (hostOrigin && origin === hostOrigin) return true;

  const allowed = configuredAllowedOrigins();
  return allowed.includes("*") || allowed.includes(origin);
}

export function corsHeaders(origin, hostOrigin) {
  if (!origin || !isOriginAllowed(origin, hostOrigin)) return {};

  return {
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Origin": origin,
    Vary: "Origin",
  };
}

function normalizeEmail(value) {
  if (typeof value !== "string") return undefined;
  const email = value.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : undefined;
}

function assertOriginAllowed(origin, hostOrigin) {
  if (!isOriginAllowed(origin, hostOrigin)) {
    throw Object.assign(new Error("Origin is not allowed."), { statusCode: 403, publicCode: "origin_not_allowed" });
  }
}

function cleanupRateBuckets(now = Date.now()) {
  for (const [key, bucket] of rateBuckets) {
    if (bucket.resetAt <= now) rateBuckets.delete(key);
  }
}

function assertRateLimit(context, action) {
  const limit = rateLimits[action];
  if (!limit) return;

  const now = Date.now();
  const actor = context.clientIp || context.origin || context.hostOrigin || "anonymous";
  const key = `${action}:${actor}`;
  const bucket = rateBuckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    rateBuckets.set(key, { count: 1, resetAt: now + limit.windowMs });
  } else if (bucket.count >= limit.max) {
    throw Object.assign(new Error("Too many payment requests."), { statusCode: 429, publicCode: "rate_limited" });
  } else {
    bucket.count += 1;
  }

  if (rateBuckets.size > 5000) cleanupRateBuckets(now);
}

function cleanReturnUrl(value, origin, hostOrigin) {
  const fallback = origin ?? hostOrigin;
  if (!fallback) {
    throw Object.assign(new Error("A return URL is required."), { statusCode: 400, publicCode: "bad_return_url" });
  }

  const url = new URL(value || fallback);
  assertOriginAllowed(url.origin, hostOrigin);
  url.searchParams.delete("checkout");
  url.searchParams.delete("session_id");
  return url.toString();
}

function appendCheckoutParams(url, params) {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}${params}`;
}

export async function createCheckoutSession(body = {}, context = {}) {
  const { origin, hostOrigin } = context;
  assertOriginAllowed(origin, hostOrigin);
  assertRateLimit(context, "checkout");

  const price = stripeUnitAmountForCurrency(body.currency);
  const returnUrl = cleanReturnUrl(body.returnUrl, origin, hostOrigin);
  const successUrl = appendCheckoutParams(returnUrl, "checkout=success&session_id={CHECKOUT_SESSION_ID}");
  const cancelUrl = appendCheckoutParams(returnUrl, "checkout=cancelled");
  const metadata = {
    product: PRODUCT_ID,
    currency: price.currency,
    locale: String(body.locale || ""),
    region: String(body.region || ""),
  };

  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    submit_type: "pay",
    locale: "auto",
    billing_address_collection: "auto",
    customer_creation: "always",
    automatic_tax: {
      enabled: process.env.STRIPE_AUTOMATIC_TAX === "true",
    },
    client_reference_id: typeof body.clientReferenceId === "string" ? body.clientReferenceId.slice(0, 200) : undefined,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: price.currency.toLowerCase(),
          unit_amount: price.unitAmount,
          product_data: {
            name: PRODUCT_NAME,
            description: "One-time purchase to remove future ad placements in DateHeart.",
            metadata: {
              product: PRODUCT_ID,
            },
          },
        },
      },
    ],
    metadata,
    payment_intent_data: {
      metadata,
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
  });

  return {
    amount: price.amount,
    currency: price.currency,
    sessionId: session.id,
    url: session.url,
  };
}

async function markPaidCustomer(session) {
  const isDateHeartPurchase = session.metadata?.product === PRODUCT_ID;
  const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
  if (!isDateHeartPurchase || session.payment_status !== "paid" || !customerId) return false;

  await stripe().customers.update(customerId, {
    metadata: {
      dateheart_no_ads: "true",
      dateheart_product: PRODUCT_ID,
      dateheart_last_checkout_session: session.id,
    },
  });

  return true;
}

export async function verifyCheckoutSession(sessionId, context = {}) {
  if (!sessionId || typeof sessionId !== "string" || !sessionId.startsWith("cs_")) {
    throw Object.assign(new Error("Invalid Checkout Session ID."), { statusCode: 400, publicCode: "bad_session_id" });
  }

  assertRateLimit(context, "verify");

  const session = await stripe().checkout.sessions.retrieve(sessionId);
  const isDateHeartPurchase = session.metadata?.product === PRODUCT_ID;
  const paid = Boolean(isDateHeartPurchase && session.payment_status === "paid");
  if (paid) await markPaidCustomer(session);

  return {
    amountTotal: session.amount_total,
    currency: session.currency?.toUpperCase() ?? null,
    paid,
    paymentStatus: session.payment_status,
    status: session.status,
  };
}

async function checkoutSessionsForCustomer(customerId) {
  const sessions = await stripe().checkout.sessions.list({
    customer: customerId,
    limit: 100,
  });

  return sessions.data;
}

export async function restorePurchaseByEmail(emailInput, context = {}) {
  const email = normalizeEmail(emailInput);
  if (!email) {
    throw Object.assign(new Error("A valid email is required."), { statusCode: 400, publicCode: "bad_email" });
  }

  assertRateLimit(context, "restore");

  const customers = await stripe().customers.list({ email, limit: 10 });

  for (const customer of customers.data) {
    if (customer.metadata?.dateheart_no_ads === "true") {
      return { paid: true, restored: true };
    }

    const sessions = await checkoutSessionsForCustomer(customer.id);
    const paidSession = sessions.find((session) => session.metadata?.product === PRODUCT_ID && session.payment_status === "paid");
    if (paidSession) {
      await markPaidCustomer(paidSession);
      return { paid: true, restored: true };
    }
  }

  return { paid: false, restored: false };
}

export async function handleStripeWebhook(rawBody, signature) {
  if (!signature) {
    throw Object.assign(new Error("Stripe signature is missing."), { statusCode: 400, publicCode: "bad_signature" });
  }

  const secret = webhookSecret();
  const event = stripe().webhooks.constructEvent(rawBody, signature, secret);

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    await markPaidCustomer(event.data.object);
  }

  return {
    received: true,
    type: event.type,
  };
}

export function errorPayload(error) {
  return {
    error: error.publicCode || "payment_error",
    message: error.publicCode ? undefined : "Payment request failed.",
  };
}
