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
- Support and legal page routes added: `support.html`, `privacy.html`, `terms.html`, `impressum.html`.
- Share links generate app deep links with idea, language and active filters.
- Capacitor native projects added for iOS and Android with DateHeart app icon/splash assets.
- Android debug APK and release AAB build commands added.
- iOS simulator build command added.
- Android upload-keystore helper added via `npm run android:keystore`.
- iOS App Store archive helper added via `npm run ios:archive`.
- Store screenshot generator added via `npm run screenshots:stores`.
- Native builds hide the web-only Stripe no-ads purchase until store billing is implemented.
- Native compliance check added via `npm run native:compliance`.
- iOS app Privacy Manifest added at `ios/App/App/PrivacyInfo.xcprivacy`.
- Apple App Privacy and Google Play Data Safety draft answers added at `docs/STORE_COMPLIANCE.md`.
- Store submission packet check added via `npm run store:check`.

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
- Create Google Play Console and Apple Developer/App Store Connect app records.
- Add Android Play upload signing via `android/key.properties`.
- Add iOS signing with Apple team, bundle id, certificate and provisioning profile.
- Transfer the prepared Apple/Google privacy answers from `docs/STORE_COMPLIANCE.md` into the store consoles.
- Use `docs/STORE_SUBMISSION_PACKET.md` when transferring assets and text into the store consoles.
- Implement Apple IAP and Google Play Billing before selling the no-ads unlock in native apps.
