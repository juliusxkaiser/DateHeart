# DateHeart Store Submission Packet

Use this as the transfer checklist for App Store Connect and Google Play Console.

## App Identity

- App name: DateHeart
- iOS bundle id: `com.czarletsgo.dateheart`
- Android package name: `com.czarletsgo.dateheart`
- Support email: `ceo@juliuskaiser.app`
- Business email: `ceo@juliuskaiser.app`
- Support URL: `https://juliuskaiser.app/dateheart/support.html`
- Privacy Policy URL: `https://juliuskaiser.app/dateheart/privacy.html`
- Marketing URL: `https://juliuskaiser.app/dateheart/`
- First native release: free app, no native purchase/subscription, Google AdMob ads, no separate analytics, no login

## Required Repo Files

- App icon: `store/assets/app-icon-1024.png`
- App Store listing: `store/metadata/app-store-draft.md`
- Google Play listing: `store/metadata/google-play-draft.md`
- Support page: `public/support.html`
- Store privacy/data-safety answers: `docs/STORE_COMPLIANCE.md`
- Store console transfer values: `docs/STORE_CONSOLE_VALUES.md`
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

The AAB is upload-ready after `npm run android:bundle`. `android/key.properties` and the upload keystore exist locally and are ignored by Git.

Current verified SHA-256:

```text
bcb69bd5717f2828e7b01c0edcfcc5dfc53b7e58903e06600da5980dd3d37fa0
```

iOS archive:

```text
build/ios/DateHeart.xcarchive
```

The iOS archive requires Apple Team ID, bundle-id registration and local Xcode signing access.

## Still Waiting On Owner Data

- D-U-N-S number response from Dun & Bradstreet for the Google Play organization account
- Final legal/operator address from Leipzig address provider, to replace the temporary private address
- Apple Developer Team ID, if not already copied into the shell environment
- App Store Connect app record
- Google Play Console app record
- Production phone number verification in the store consoles
