# DateHeart Store Console Values

Prepared on 2026-06-01 for the first native store release.

## Current Release Position

- Release model: free, ad-supported native app
- Native purchases: none
- Web-only Stripe purchase/subscription: hidden in iOS and Android native builds
- Accounts/login: none
- Ads: Google AdMob banner and interstitial ads
- Separate analytics SDK: none
- User-generated public content: none
- Native permissions: Android `INTERNET`; no iOS camera, microphone, location, photo library or contacts permission

## Blocking Items

- Google Play organization account: waiting for D-U-N-S number from Dun & Bradstreet
- iOS archive: waiting for Apple Team ID/signing access in the local build environment
- Final public legal address: replace temporary private address when the Leipzig business address is available

Google states that organization accounts need a D-U-N-S number and that the process can take up to 30 days. Do not enter a guessed D-U-N-S number in Play Console.

## Shared Store Identity

- App name: DateHeart
- Developer/owner name: Julius Kaiser
- Android package name: `com.czarletsgo.dateheart`
- iOS bundle id: `com.czarletsgo.dateheart`
- Support email: `ceo@juliuskaiser.app`
- Business email: `ceo@juliuskaiser.app`
- Support URL: `https://juliuskaiser.app/dateheart/support.html`
- Privacy Policy URL: `https://juliuskaiser.app/dateheart/privacy.html`
- Marketing/website URL: `https://juliuskaiser.app/dateheart/`
- Temporary legal address: Julius Kaiser, Karl-Rothe-Str. 4, 04105 Leipzig, Germany

## Google Play Console Values

- App type: App
- Category: Lifestyle
- Pricing: Free
- Contains ads: Yes
- Package name: `com.czarletsgo.dateheart`
- Version name: `1.0`
- Version code: `1`
- Minimum Android version: Android 7.0 / API 24
- Target SDK: API 36
- Default language: German or English; both listing drafts are prepared
- Tags: Dating, Lifestyle, Relationships, Planning
- Target audience: adults / general couple-planning audience, not child-directed
- App access: all functionality available without login
- Privacy policy: `https://juliuskaiser.app/dateheart/privacy.html`
- Support contact: `ceo@juliuskaiser.app`

Recommended app declaration:

```text
DateHeart is a free practical date idea app for couples. No login is required. The native Android build uses Google AdMob for ads and does not expose web-only Stripe purchases or subscriptions; any future native digital unlock will use Google Play Billing.
```

Content rating notes:

- No gambling
- No explicit sexual content
- No public user-generated content
- No unrestricted web browsing
- No location sharing
- Suggested activities are planning/entertainment content; users choose safe and appropriate activities themselves

## Google Play Data Safety Draft

Use `docs/STORE_COMPLIANCE.md` as the source of truth. Current short version:

- Data collected/shared: Yes, because Google Mobile Ads collects and shares ad-related data
- Data encrypted in transit: Yes
- Account creation: No
- Data deletion request: not applicable for DateHeart server-side account data; local app data can be cleared by uninstalling or clearing app storage
- Approximate location: Yes, derived by Google Mobile Ads from IP address
- Device or other IDs: Yes, Google Mobile Ads can process advertising IDs and related ad delivery identifiers
- App activity: Google Mobile Ads can process product interactions and ad interactions; DateHeart favorites/history/filters/language remain local
- App info and performance: Google Mobile Ads can process diagnostic/performance data
- Financial info: No native payments in the first release
- Personal info: No account or email collection in the first native release

## App Store Connect Values

- Platform: iOS
- Name: DateHeart
- Subtitle: Date ideas for couples / Date-Ideen fuer Paare
- Category: Lifestyle
- Pricing: Free
- Version: `1.0`
- Bundle ID: `com.czarletsgo.dateheart`
- Support URL: `https://juliuskaiser.app/dateheart/support.html`
- Marketing URL: `https://juliuskaiser.app/dateheart/`
- Privacy Policy URL: `https://juliuskaiser.app/dateheart/privacy.html`

Recommended review note:

```text
DateHeart is a free date idea generator for couples. No account is required. The native iOS build uses Google AdMob for ads and does not expose web-only Stripe purchases or subscriptions; any future native digital unlock will use Apple In-App Purchase. Favorites, history, filters and language are stored locally on device.
```

Age rating notes:

- No unrestricted web access
- No gambling or contests
- No user-generated public content
- No explicit sexual content
- No medical, financial or regulated advice

## App Store Privacy Draft

Use `docs/STORE_COMPLIANCE.md` as the source of truth. Current short version:

- DateHeart-owned data collection: no account, no native purchase/subscription, no direct contact info collection
- Google Mobile Ads: can collect or process IP address, advertising/device identifiers, product/ad interactions, advertising data and diagnostics
- Tracking prompt: DateHeart code does not request App Tracking Transparency permission
- Privacy manifest: `ios/App/App/PrivacyInfo.xcprivacy`

## Store Assets

App icon:

```text
store/assets/app-icon-1024.png
```

Google Play phone screenshots:

```text
store/screenshots/google-play/phone/01-home.png
store/screenshots/google-play/phone/02-result.png
store/screenshots/google-play/phone/03-filter.png
```

App Store iPhone 6.9" screenshots:

```text
store/screenshots/app-store/iphone-69/01-home.png
store/screenshots/app-store/iphone-69/02-result.png
store/screenshots/app-store/iphone-69/03-filter.png
```

Android upload artifact:

```text
android/app/build/outputs/bundle/release/app-release.aab
```

## Reference Links

- Google Play organization account requirements: https://support.google.com/googleplay/android-developer/answer/13628312
- Google Mobile Ads Android data disclosure: https://developers.google.com/admob/android/privacy/play-data-disclosure
- Google Mobile Ads iOS data disclosure: https://developers.google.com/admob/ios/privacy/data-disclosure
- Apple App Privacy details: https://developer.apple.com/app-store/app-privacy-details/
