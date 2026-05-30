import Stripe from "stripe";
import { PRODUCT_ID, PRODUCT_NAME, stripeUnitAmountForCurrency } from "./pricing.mjs";

let stripeClient;

function stripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw Object.assign(new Error("STRIPE_SECRET_KEY is missing."), { statusCode: 503, publicCode: "payment_unavailable" });
  }

  stripeClient ??= new Stripe(process.env.STRIPE_SECRET_KEY);
  return stripeClient;
}

function webhookSecret() {
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    throw Object.assign(new Error("STRIPE_WEBHOOK_SECRET is missing."), { statusCode: 503, publicCode: "webhook_unavailable" });
  }

  return process.env.STRIPE_WEBHOOK_SECRET;
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

export async function verifyCheckoutSession(sessionId) {
  if (!sessionId || typeof sessionId !== "string" || !sessionId.startsWith("cs_")) {
    throw Object.assign(new Error("Invalid Checkout Session ID."), { statusCode: 400, publicCode: "bad_session_id" });
  }

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

export async function restorePurchaseByEmail(emailInput) {
  const email = normalizeEmail(emailInput);
  if (!email) {
    throw Object.assign(new Error("A valid email is required."), { statusCode: 400, publicCode: "bad_email" });
  }

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
