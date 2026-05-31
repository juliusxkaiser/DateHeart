# DateHeart Store Submission Packet

Use this as the transfer checklist for App Store Connect and Google Play Console.

## App Identity

- App name: DateHeart
- iOS bundle id: `com.czarletsgo.dateheart`
- Android package name: `com.czarletsgo.dateheart`
- Support email: `support@dateheart.app`
- Support URL: `https://czarletsgo.github.io/dateheart-web/support.html`
- Privacy Policy URL: `https://czarletsgo.github.io/dateheart-web/privacy.html`
- Marketing URL: `https://czarletsgo.github.io/dateheart-web/`
- First native release: free app, no native purchase, no ads, no analytics, no login

## Required Repo Files

- App icon: `store/assets/app-icon-1024.png`
- App Store listing: `store/metadata/app-store-draft.md`
- Google Play listing: `store/metadata/google-play-draft.md`
- Support page: `public/support.html`
- Store privacy/data-safety answers: `docs/STORE_COMPLIANCE.md`
- Owner input checklist: `docs/STORE_RELEASE_INPUTS.md`
- iOS Privacy Manifest: `ios/App/App/PrivacyInfo.xcprivacy`

## Screenshots

App Store iPhone 6.9":

- `store/screenshots/app-store/iphone-69/01-home.png`
- `store/screenshots/app-store/iphone-69/02-result.png`
- `store/screenshots/app-store/iphone-69/03-filter.png`

Google Play phone:

- `store/screenshots/google-play/phone/01-home.png`
- `store/screenshots/google-play/phone/02-result.png`
- `store/screenshots/google-play/phone/03-filter.png`

Regenerate screenshots with:

```bash
npm run screenshots:stores
```

Check the packet with:

```bash
npm run store:check
```

## Build Artifacts

Android AAB:

```text
android/app/build/outputs/bundle/release/app-release.aab
```

The AAB is only final upload-ready after `android/key.properties` exists and the upload key is configured.

iOS archive:

```text
build/ios/DateHeart.xcarchive
```

The iOS archive requires Apple Team ID, bundle-id registration and local Xcode signing access.

## Still Waiting On Owner Data

- Final legal/operator address from Leipzig address provider
- Apple Developer Team ID
- App Store Connect app record
- Google Play Console app record
- Android upload-keystore passwords
