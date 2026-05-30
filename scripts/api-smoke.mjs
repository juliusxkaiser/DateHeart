const appUrl = process.env.APP_URL || "http://127.0.0.1:8080/";
const apiBaseUrl = process.env.API_BASE_URL || appUrl;
const requireConfiguredPayment = process.env.REQUIRE_CONFIGURED_PAYMENT === "true";

function endpoint(path) {
  return new URL(path, apiBaseUrl).toString();
}

async function json(response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Expected JSON from ${response.url}, got: ${text.slice(0, 120)}`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const checks = [];

async function check(name, run) {
  const result = await run();
  checks.push({ name, ...result });
}

await check("health", async () => {
  const response = await fetch(endpoint("/api/health"));
  const body = await json(response);
  assert(response.status === 200, `health returned ${response.status}`);
  assert(body.ok === true, "health did not return ok=true");

  if (requireConfiguredPayment) {
    assert(body.stripeConfigured === true, "STRIPE_SECRET_KEY is not configured in target environment.");
    assert(body.webhookConfigured === true, "STRIPE_WEBHOOK_SECRET is not configured in target environment.");
  }

  return {
    status: response.status,
    stripeConfigured: body.stripeConfigured,
    webhookConfigured: body.webhookConfigured,
  };
});

await check("checkout_without_or_with_secrets", async () => {
  const response = await fetch(endpoint("/api/create-checkout-session"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: new URL(appUrl).origin,
    },
    body: JSON.stringify({
      currency: "EUR",
      returnUrl: appUrl,
      clientReferenceId: "smoke-test",
    }),
  });
  const body = await json(response);

  if (requireConfiguredPayment) {
    assert(response.status === 200, `checkout expected 200 with configured payment, got ${response.status}`);
    assert(typeof body.url === "string" && body.url.startsWith("https://"), "checkout did not return a Stripe URL");
  } else {
    assert([200, 503].includes(response.status), `checkout returned unexpected ${response.status}`);
    if (response.status === 503) assert(body.error === "payment_unavailable", "checkout 503 did not return payment_unavailable");
  }

  return {
    status: response.status,
    error: body.error ?? null,
    hasUrl: typeof body.url === "string",
  };
});

await check("verify_validation", async () => {
  const response = await fetch(endpoint("/api/verify-checkout-session?session_id=bad"));
  const body = await json(response);
  assert(response.status === 400, `verify bad session expected 400, got ${response.status}`);
  assert(body.error === "bad_session_id", "verify bad session did not return bad_session_id");
  return { status: response.status, error: body.error };
});

await check("restore_validation", async () => {
  const response = await fetch(endpoint("/api/restore-purchase"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "not-an-email" }),
  });
  const body = await json(response);
  assert(response.status === 400, `restore bad email expected 400, got ${response.status}`);
  assert(body.error === "bad_email", "restore bad email did not return bad_email");
  return { status: response.status, error: body.error };
});

console.log(
  JSON.stringify(
    {
      appUrl,
      apiBaseUrl,
      requireConfiguredPayment,
      checks,
      ok: true,
    },
    null,
    2,
  ),
);
