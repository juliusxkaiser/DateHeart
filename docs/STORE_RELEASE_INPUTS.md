# DateHeart Store Release Inputs

Current owner-controlled values and blockers before final App Store and Google Play submission.

## Legal

- Temporary legal operator: Julius Kaiser
- Temporary street and house number: Karl-Rothe-Str. 4
- Temporary postal code and city: 04105 Leipzig
- Country: Germany
- Support email: `ceo@juliuskaiser.app`
- Business email: `ceo@juliuskaiser.app`
- Responsible person for the German Impressum: Julius Kaiser
- VAT ID or business register details: not entered yet

The public files currently contain a temporary private operator address and should be updated once the business address is available:

- `public/privacy.html`
- `public/terms.html`
- `public/impressum.html`

Keep `noindex` on those pages until the final business address is in place and the text is reviewed.

## Apple

- Apple Developer Team ID
- App Store Connect app record for bundle id `com.czarletsgo.dateheart`
- Distribution certificate and provisioning access
- Privacy details answers
- Support email: `ceo@juliuskaiser.app`
- Support URL: `https://juliuskaiser.app/dateheart/support.html`
- Privacy Policy URL: `https://juliuskaiser.app/dateheart/privacy.html`
- Marketing URL: `https://juliuskaiser.app/dateheart/`
- Copy the prepared answers from `docs/STORE_COMPLIANCE.md` if the submitted build is still the free native release with Google AdMob ads, no separate analytics, no login and no native payments

## Google Play

- Google Play Console organization account waits for the D-U-N-S number request
- Google Play Console app record for package `com.czarletsgo.dateheart`
- Play App Signing enabled
- Upload key exists locally and is ignored by Git
- Data Safety answers
- Content rating questionnaire
- Support email: `ceo@juliuskaiser.app`
- Support URL: `https://juliuskaiser.app/dateheart/support.html`
- Privacy policy URL: `https://juliuskaiser.app/dateheart/privacy.html`
- Copy the prepared answers from `docs/STORE_COMPLIANCE.md` if the submitted build is still the free native release with Google AdMob ads, no separate analytics, no login and no native payments

## Recommended First Store Release

Ship the native apps as free downloads. Enable the native no-ads and DateHeart Pro products only after `dateheart_no_ads`, `dateheart_pro_monthly` and `dateheart_pro_yearly` are created, approved and tested in App Store Connect / Play Console.
