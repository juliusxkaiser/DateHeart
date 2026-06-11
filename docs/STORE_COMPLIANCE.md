# DateHeart Store Compliance Draft

This file captures the current first native release state. Update it before submission if payments, analytics, accounts or native permissions are added.

## Current Native App State

- App id / package: `com.czarletsgo.dateheart`
- Release model: free first native release
- Accounts: no account required
- Payments: no native payment, Stripe purchase or Stripe subscription exposed in the iOS/Android builds
- Ads: Google AdMob is integrated for native iOS/Android ads
- Analytics: no separate third-party analytics SDK loaded
- User-generated public content: none
- Native permissions: Android `INTERNET` only; no iOS camera, microphone, location, photo-library or tracking prompt
- Local data: favorites, history, filters, language, no-ads state and Pro state are stored locally on the user's device
- AdMob/Google Mobile Ads can process IP address, ad/device identifiers, product interactions, ad interaction data and diagnostics for ad delivery, measurement, analytics and fraud prevention.

## Apple App Privacy Answers

Use the following draft for the first native iOS release if the submitted build still matches the state above.

Recommended answers:

- Third-party tracking: No App Tracking Transparency prompt is requested by DateHeart
- Data linked to the user: Review Google Mobile Ads SDK privacy manifest and App Store Connect report before submission
- Data used to track the user: Review AdMob's current App Store privacy guidance before submission and mark Google Mobile Ads data as required by Apple if personalized ads or cross-app advertising measurement are enabled
- Contact info: Not collected
- Location: DateHeart does not request device location; Google Mobile Ads can use IP address to estimate general location
- Identifiers: Google Mobile Ads can process device IDs and advertising IDs
- Purchases: Not collected in the first native release
- User content: Not collected
- Usage data / diagnostics: DateHeart does not collect these directly; Google Mobile Ads can process ad interaction and delivery data
- Recommended App Store data categories to review: approximate location, device ID, product interaction, advertising data, crash data and performance data.

Review note:

```text
DateHeart is a free date idea generator. The iOS build does not require an account, uses Google AdMob for ads, does not include a separate analytics SDK, and does not expose the web-only Stripe purchase or subscription. Favorites, history, filters and language are stored locally on device.
```

The iOS project includes `ios/App/App/PrivacyInfo.xcprivacy` declaring no DateHeart-owned collected data and no App Tracking Transparency prompt. The Google Mobile Ads SDK can include its own privacy manifest data; confirm the final App Store Connect privacy labels before submission.

## Google Play Data Safety Answers

Use the following draft for the first native Android release if the submitted build still matches the state above.

- Does your app collect or share any required user data types? Yes, because Google Mobile Ads collects and shares ad-related data.
- Is all user data collected encrypted in transit? Yes. Google documents that Google Mobile Ads SDK user data is encrypted in transit with TLS.
- Do users have a way to request data deletion? Not applicable for server-side data; local app data can be cleared by uninstalling or clearing app storage
- Location: Approximate location can be derived by Google Mobile Ads from IP address
- Personal info: No
- Financial info: No
- App activity: favorites/history/filters/language remain local only in DateHeart; Google Mobile Ads can process user product interactions and ad interactions
- App info and performance: Google Mobile Ads can process diagnostic/performance data
- Device or other IDs: Google Mobile Ads can process advertising identifiers and related ad delivery data
- Data shared with third parties: Google AdMob receives ad delivery, measurement, frequency-capping and fraud-prevention data

App access:

- All functionality is available without login.

Ads declaration:

- The first native release contains ads through Google AdMob.

Content rating notes:

- No gambling
- No explicit sexual content
- No public user-generated content
- No unrestricted web browsing
- Suggested activities are entertainment/planning content; users choose safe, lawful and appropriate activities themselves

Target audience:

- Recommended target audience: adults / general couple planning audience, not child-directed

## When This Must Change

Update this file and the store answers before release if any of these are added:

- Apple In-App Purchase or Google Play Billing
- Stripe or any other checkout/subscription inside native builds
- Another ad network or a material AdMob configuration change
- Analytics, crash reporting or attribution SDKs
- Account login, email collection or cloud sync
- Location, camera, photo library, microphone, contacts or notification permissions

## Reference Links

- Google Play data disclosure for Google Mobile Ads SDK: https://developers.google.com/admob/android/privacy/play-data-disclosure
- Apple App privacy details: https://developer.apple.com/app-store/app-privacy-details/
- Google Mobile Ads SDK iOS data disclosure: https://developers.google.com/admob/ios/privacy/data-disclosure
