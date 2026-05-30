# DateHeart Launch Checklist

## Done in code

- Static deploy configuration for Vercel, Netlify, GitHub Pages and Docker.
- Stripe Checkout session creation with local one-time prices.
- Germany/EUR price fixed at `4.99`.
- Paid-session verification before unlocking the no-ads purchase.
- Purchase restore by checkout email through Stripe Customer data.
- Stripe webhook endpoint for `checkout.session.completed` and `checkout.session.async_payment_succeeded`.
- PWA manifest and service worker adjusted for root and subpath deploys.
- PNG app icons, Apple touch icon and social preview generated from the source SVG.
- Store listing drafts added under `store/metadata`.
- PWA and store screenshot scripts prepared.
- 20-card repeat simulation added via `npm run ideas:check`.
- Strict deploy doctor added via `npm run deploy:doctor`.
- Payment configuration doctor added via `npm run payment:doctor`.
- One-command deploy readiness check added via `npm run deploy:today`.
- GitHub Actions deploy workflows added for GitHub Pages, Vercel and Netlify.
- CI workflow added for launch checks and API smoke tests.
- Public GitHub Pages artifact deploy is live at `https://czarletsgo.github.io/dateheart-web/`.
- Public GitHub Pages artifact deploy can be refreshed with `npm run deploy:github-pages`.
- Backend health endpoint added at `/api/health` and `/.netlify/functions/health`.
- Static launch files added: `robots.txt`, `sitemap.xml` and `404.html`.
- Legal page routes added: `privacy.html`, `terms.html`, `impressum.html`.

## Needs owner action before public launch

- Add real operator/contact details to the legal pages.
- Choose the production host: Vercel/Netlify with serverless payments, or GitHub Pages plus an external payment backend.
- Set the selected host deploy credentials (`VERCEL_TOKEN`/project IDs or `NETLIFY_AUTH_TOKEN`/site ID).
- Set `STRIPE_SECRET_KEY` in the hosting provider.
- Set `STRIPE_WEBHOOK_SECRET` after creating the Stripe webhook.
- In Stripe, point the webhook to `/api/stripe-webhook` or `/.netlify/functions/stripe-webhook`.
- Run `REQUIRE_CONFIGURED_PAYMENT=true npm run payment:doctor` after the hosting secrets are set.
- Run live-mode payment tests for at least DE/EUR and one non-EUR market.
- Run `APP_URL=https://your-production-domain REQUIRE_CONFIGURED_PAYMENT=true npm run api:smoke` after Stripe secrets are configured.
- Resolve the GitHub Actions billing/spending-limit blocker so manual CI/deploy workflows can start.
- Decide whether the native iOS/Android apps use Apple IAP and Google Play Billing for the same purchase.
