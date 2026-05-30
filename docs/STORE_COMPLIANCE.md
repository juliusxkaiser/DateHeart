# DateHeart Store Compliance Draft

This file captures the current first native release state. Update it before submission if payments, ads, analytics, accounts or native permissions are added.

## Current Native App State

- App id / package: `com.czarletsgo.dateheart`
- Release model: free first native release
- Accounts: no account required
- Payments: no native payment or Stripe purchase exposed in the iOS/Android builds
- Ads: no ad SDK loaded
- Analytics: no third-party analytics SDK loaded
- User-generated public content: none
- Native permissions: Android `INTERNET` only; no iOS camera, microphone, location, photo-library or tracking prompt
- Local data: favorites, history, filters, language and no-ads state are stored locally on the user's device

## Apple App Privacy Answers

Use "Data Not Collected" for the first native iOS release if the submitted build still matches the state above.

Recommended answers:

- Third-party tracking: No
- Data linked to the user: No
- Data used to track the user: No
- Contact info: Not collected
- Location: Not collected
- Identifiers: Not collected
- Purchases: Not collected in the first native release
- User content: Not collected
- Usage data / diagnostics: Not collected by DateHeart

Review note:

```text
DateHeart is a free date idea generator. The iOS build does not require an account, does not collect personal data, does not include analytics or advertising SDKs, and does not expose the web-only Stripe purchase. Favorites, history, filters and language are stored locally on device.
```

The iOS project includes `ios/App/App/PrivacyInfo.xcprivacy` declaring no collected data and no tracking.

## Google Play Data Safety Answers

Use the following answers for the first native Android release if the submitted build still matches the state above.

- Does your app collect or share any required user data types? No
- Is all user data collected encrypted in transit? Not applicable when no data is collected
- Do users have a way to request data deletion? Not applicable for server-side data; local app data can be cleared by uninstalling or clearing app storage
- Location: No
- Personal info: No
- Financial info: No
- App activity: No server collection; favorites/history/filters/language remain local only
- App info and performance: No DateHeart analytics/diagnostics collection
- Device or other IDs: No DateHeart collection
- Data shared with third parties: No for the first native release

App access:

- All functionality is available without login.

Ads declaration:

- The first native release does not contain ads.

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
- Stripe or any other checkout inside native builds
- AdMob or another ad network
- Analytics, crash reporting or attribution SDKs
- Account login, email collection or cloud sync
- Location, camera, photo library, microphone, contacts or notification permissions
