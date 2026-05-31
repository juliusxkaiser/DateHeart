# DateHeart Store Release Inputs

These values must come from the app owner before final App Store and Google Play submission.

## Legal

- Legal operator name or company name
- Street and house number
- Postal code and city
- Country
- Support email: `support@dateheart.app`
- Responsible person for the German Impressum
- VAT ID or business register details, if applicable

The public files that need these values are:

- `public/privacy.html`
- `public/terms.html`
- `public/impressum.html`

Keep `noindex` on those pages until the placeholders are replaced and the text is reviewed.

## Apple

- Apple Developer Team ID
- App Store Connect app record for bundle id `com.czarletsgo.dateheart`
- Distribution certificate and provisioning access
- Privacy details answers
- Support email: `support@dateheart.app`
- Support URL and marketing URL
- Copy the prepared answers from `docs/STORE_COMPLIANCE.md` if the submitted build is still the free native release without ads, analytics, login or native payments

## Google Play

- Google Play Console app record for package `com.czarletsgo.dateheart`
- Play App Signing enabled
- Upload key stored outside Git
- Data Safety answers
- Content rating questionnaire
- Support email: `support@dateheart.app`
- Privacy policy URL
- Copy the prepared answers from `docs/STORE_COMPLIANCE.md` if the submitted build is still the free native release without ads, analytics, login or native payments

## Recommended First Store Release

Ship the native apps as free apps first. The web-only Stripe no-ads purchase is already hidden in native builds. Add Apple In-App Purchase and Google Play Billing later if the no-ads unlock should be sold inside the native apps.
