import { noAdsPriceByCurrency, stripeUnitAmountForCurrency } from "../server/pricing.mjs";

const requireConfiguredPayment = process.env.REQUIRE_CONFIGURED_PAYMENT === "true";
const errors = [];
const warnings = [];

function value(name) {
  return process.env[name]?.trim() ?? "";
}

function secretState(name, prefix) {
  const raw = value(name);
  const placeholder = raw.includes("replace_me");
  const present = Boolean(raw) && !placeholder && raw.startsWith(prefix);

  if (requireConfiguredPayment && !present) {
    errors.push(`${name} must be set to a real ${prefix}... value.`);
  } else if (!present) {
    warnings.push(`${name} is not set to a usable ${prefix}... value; live payments stay disabled.`);
  }

  if (raw && !placeholder && !raw.startsWith(prefix)) {
    errors.push(`${name} has the wrong prefix. Expected ${prefix}...`);
  }

  return {
    present,
    placeholder,
    prefixOk: !raw || placeholder ? false : raw.startsWith(prefix),
    mode: name === "STRIPE_SECRET_KEY" ? stripeMode(raw, placeholder) : undefined,
  };
}

function stripeMode(secret, placeholder) {
  if (placeholder) return "placeholder";
  if (secret.startsWith("sk_live_")) return "live";
  if (secret.startsWith("sk_test_")) return "test";
  if (secret.startsWith("sk_")) return "unknown";
  return "missing";
}

function validateBoolean(name) {
  const raw = value(name);
  if (raw && raw !== "true" && raw !== "false") {
    errors.push(`${name} must be either true or false.`);
  }
  return raw || "unset";
}

function validateOriginList(name) {
  const raw = value(name);
  const entries = raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

  for (const entry of entries) {
    if (entry === "*") {
      warnings.push(`${name}=* is useful for a throwaway preview, but too open for production payments.`);
      continue;
    }

    try {
      const parsed = new URL(entry);
      if (!["https:", "http:"].includes(parsed.protocol)) throw new Error("bad protocol");
      if (parsed.pathname !== "/" || parsed.search || parsed.hash) {
        errors.push(`${name} entry ${entry} must be an origin only, for example https://dateheart.example`);
      }
      if (parsed.protocol !== "https:" && parsed.hostname !== "localhost" && parsed.hostname !== "127.0.0.1") {
        errors.push(`${name} entry ${entry} must use HTTPS outside local development.`);
      }
    } catch {
      errors.push(`${name} entry ${entry} is not a valid URL origin.`);
    }
  }

  return entries.length;
}

function validateEndpoint(name, expectedTail) {
  const raw = value(name);
  if (!raw) return { configured: false };

  try {
    const parsed = new URL(raw);
    if (!["https:", "http:"].includes(parsed.protocol)) throw new Error("bad protocol");
    if (parsed.protocol !== "https:" && parsed.hostname !== "localhost" && parsed.hostname !== "127.0.0.1") {
      errors.push(`${name} must use HTTPS outside local development.`);
    }
    if (!parsed.pathname.endsWith(expectedTail)) {
      warnings.push(`${name} does not end with ${expectedTail}; verify it points to the intended payment function.`);
    }
    return { configured: true, origin: parsed.origin };
  } catch {
    errors.push(`${name} is not a valid absolute URL.`);
    return { configured: true, origin: null };
  }
}

function validateViteEndpointSet() {
  const endpoints = {
    VITE_CHECKOUT_ENDPOINT: validateEndpoint("VITE_CHECKOUT_ENDPOINT", "create-checkout-session"),
    VITE_VERIFY_PAYMENT_ENDPOINT: validateEndpoint("VITE_VERIFY_PAYMENT_ENDPOINT", "verify-checkout-session"),
    VITE_RESTORE_PAYMENT_ENDPOINT: validateEndpoint("VITE_RESTORE_PAYMENT_ENDPOINT", "restore-purchase"),
  };
  const configuredCount = Object.values(endpoints).filter((endpoint) => endpoint.configured).length;
  if (configuredCount > 0 && configuredCount < 3) {
    errors.push("Set all three VITE_* payment endpoints together when the frontend and backend are split.");
  }
  return endpoints;
}

function validatePricing() {
  const currencies = Object.keys(noAdsPriceByCurrency);
  if (noAdsPriceByCurrency.EUR !== 4.99) errors.push("EUR price must stay fixed at 4.99.");

  for (const currency of currencies) {
    const amount = noAdsPriceByCurrency[currency];
    if (!/^[A-Z]{3}$/.test(currency)) errors.push(`Invalid currency code: ${currency}`);
    if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
      errors.push(`${currency} price must be a positive number.`);
      continue;
    }

    const unitAmount = stripeUnitAmountForCurrency(currency).unitAmount;
    if (!Number.isInteger(unitAmount) || unitAmount <= 0) {
      errors.push(`${currency} Stripe unit_amount must be a positive integer.`);
    }
  }

  return {
    currencies: currencies.length,
    eur: noAdsPriceByCurrency.EUR,
    usd: noAdsPriceByCurrency.USD,
    gbp: noAdsPriceByCurrency.GBP,
  };
}

const stripeSecret = secretState("STRIPE_SECRET_KEY", "sk_");
const webhookSecret = secretState("STRIPE_WEBHOOK_SECRET", "whsec_");
const automaticTax = validateBoolean("STRIPE_AUTOMATIC_TAX");
const allowedOriginsConfigured = validateOriginList("PAYMENT_ALLOWED_ORIGINS");
const endpoints = validateViteEndpointSet();
const pricing = validatePricing();

if (stripeSecret.present && stripeSecret.mode === "test") {
  warnings.push("STRIPE_SECRET_KEY is a test key. Use sk_live_... for production after test checkout is verified.");
}

const result = {
  ok: errors.length === 0,
  requireConfiguredPayment,
  paymentReady: stripeSecret.present && webhookSecret.present,
  secrets: {
    STRIPE_SECRET_KEY: {
      present: stripeSecret.present,
      placeholder: stripeSecret.placeholder,
      prefixOk: stripeSecret.prefixOk,
      mode: stripeSecret.mode,
    },
    STRIPE_WEBHOOK_SECRET: {
      present: webhookSecret.present,
      placeholder: webhookSecret.placeholder,
      prefixOk: webhookSecret.prefixOk,
    },
  },
  automaticTax,
  allowedOriginsConfigured,
  endpoints,
  pricing,
  warnings,
  errors,
};

console.log(JSON.stringify(result, null, 2));

if (!result.ok) {
  process.exit(1);
}
