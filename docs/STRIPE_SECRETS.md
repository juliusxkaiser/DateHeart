# Stripe Secrets Runbook

DateHeart is already wired for Stripe Checkout. The only missing part for live payments is setting real hosting secrets and creating the webhook in Stripe.

Official Stripe references:

- Checkout Sessions API: https://docs.stripe.com/api/checkout/sessions/create
- Checkout flow: https://docs.stripe.com/payments/checkout/how-checkout-works
- Webhook signatures: https://docs.stripe.com/webhooks/signatures
- Automatic taxes: https://docs.stripe.com/payments/checkout/automatic_taxes

## Required hosting secrets

Set these in the production host, not in Git:

```text
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

For a test deploy, use `sk_test_...` first. `npm run payment:doctor` accepts test mode but warns that it is not production.

## Optional hosting variables

```text
STRIPE_AUTOMATIC_TAX=true
PAYMENT_ALLOWED_ORIGINS=https://dateheart.example
```

Use `STRIPE_AUTOMATIC_TAX=true` only after Stripe Tax is configured in the Stripe Dashboard. Use `PAYMENT_ALLOWED_ORIGINS` when the frontend is hosted on a different origin than the payment backend, for example GitHub Pages frontend plus Vercel backend.

If frontend and backend are split, set all three client build variables before building the frontend:

```text
VITE_CHECKOUT_ENDPOINT=https://dateheart-api.example/api/create-checkout-session
VITE_VERIFY_PAYMENT_ENDPOINT=https://dateheart-api.example/api/verify-checkout-session
VITE_RESTORE_PAYMENT_ENDPOINT=https://dateheart-api.example/api/restore-purchase
```

## Webhook endpoint

Vercel or the local Node server:

```text
https://your-domain.example/api/stripe-webhook
```

Netlify:

```text
https://your-domain.example/.netlify/functions/stripe-webhook
```

Subscribe to these events:

```text
checkout.session.completed
checkout.session.async_payment_succeeded
```

After creating the endpoint, copy the signing secret that starts with `whsec_` into `STRIPE_WEBHOOK_SECRET`.

## Verification commands

Without secrets, this should pass with warnings:

```bash
npm run payment:doctor
```

After production hosting secrets are set:

```bash
REQUIRE_CONFIGURED_PAYMENT=true npm run payment:doctor
APP_URL=https://your-domain.example/ REQUIRE_CONFIGURED_PAYMENT=true npm run api:smoke
```

The smoke test must return a Stripe Checkout URL for `create-checkout-session`.
