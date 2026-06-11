# DateHeart Launch Checklist

## Done in code

- Static deploy configuration for Vercel, Netlify, GitHub Pages and Docker.
- Stripe Checkout session creation with local one-time and Pro subscription prices.
- Native Apple/Google in-app purchase bridge for no-ads and DateHeart Pro.
- Germany/EUR prices fixed at `4.99` for no-ads, `1.99` monthly Pro and `14.99` yearly Pro.
- Paid-session verification before unlocking the no-ads purchase or DateHeart Pro.
- Purchase restore by checkout email through Stripe Customer and subscription data.
- Stripe webhook endpoint for `checkout.session.completed`, `checkout.session.async_payment_succeeded` and `customer.subscription.deleted`.
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
- Native builds use Apple In-App Purchase / Google Play Billing for Pro and no-ads.
- Native compliance check added via `npm run native:compliance`.
- iOS app Privacy Manifest added at `ios/App/App/PrivacyInfo.xcprivacy`.
- Apple App Privacy and Google Play Data Safety draft answers added at `docs/STORE_COMPLIANCE.md`.
- Store submission packet check added via `npm run store:check`.
- Android AdMob banner and interstitial unit IDs are configured.
- iOS AdMob banner and interstitial unit IDs are configured.
- Temporary legal/operator address is published in the legal pages until the business address is available.
- Android upload keystore and signed release AAB are available locally.

## Needs owner action before public launch

- Replace the temporary private legal address with the final business address once the Leipzig address provider is ready.
- Choose the production host: Vercel/Netlify with serverless payments, or GitHub Pages plus an external payment backend.
- Set the selected host deploy credentials (`VERCEL_TOKEN`/project IDs or `NETLIFY_AUTH_TOKEN`/site ID).
- Set `STRIPE_SECRET_KEY` in the hosting provider.
- Set `STRIPE_WEBHOOK_SECRET` after creating the Stripe webhook.
- In Stripe, point the webhook to `/api/stripe-webhook` or `/.netlify/functions/stripe-webhook`.
- Run `REQUIRE_CONFIGURED_PAYMENT=true npm run payment:doctor` after the hosting secrets are set.
- Run live-mode payment tests for at least DE/EUR and one non-EUR market.
- Run `APP_URL=https://your-production-domain REQUIRE_CONFIGURED_PAYMENT=true npm run api:smoke` after Stripe secrets are configured.
- Resolve the GitHub Actions billing/spending-limit blocker so manual CI/deploy workflows can start.
- Wait for the D-U-N-S response before finishing the Google Play Console organization account, or use an individual account if an immediate Android test upload is required.
- Create the Google Play Console app record after the developer account exists.
- Create the App Store Connect app record for bundle id `com.czarletsgo.dateheart`.
- Add iOS signing with Apple team, bundle id, certificate and provisioning profile.
- Transfer the prepared Apple/Google privacy answers from `docs/STORE_COMPLIANCE.md` into the store consoles.
- Transfer the app listing values from `docs/STORE_CONSOLE_VALUES.md` into the store consoles.
- Use `docs/STORE_SUBMISSION_PACKET.md` when transferring assets and text into the store consoles.
- Create and review Apple IAP / Google Play Billing products for `dateheart_no_ads`, `dateheart_pro_monthly` and `dateheart_pro_yearly` before enabling purchases in the submitted builds.
