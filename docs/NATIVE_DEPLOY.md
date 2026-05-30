# DateHeart Native Deploy

DateHeart native builds use Capacitor with the app id `com.czarletsgo.dateheart`.

## Prepared

- iOS project: `ios/App/App.xcodeproj`
- Android project: `android/`
- Native icon and splash assets generated from `store/assets/app-icon-1024.png`
- Native builds hide the web-only Stripe no-ads purchase until Apple IAP and Google Play Billing are implemented
- Android release signing can be enabled with `android/key.properties`

## Build

```bash
npm run native:build
```

Android debug APK:

```bash
npm run android:debug
```

Output:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

Android release bundle:

```bash
npm run android:bundle
```

Output:

```text
android/app/build/outputs/bundle/release/app-release.aab
```

iOS simulator build:

```bash
npm run ios:build
```

Output:

```text
build/ios/Build/Products/Debug-iphonesimulator/App.app
```

Android builds use the bundled Android Studio JDK 21 by default. Override it if needed:

```bash
DATEHEART_ANDROID_JAVA_HOME=/path/to/jdk-21 npm run android:bundle
```

## Android Signing

Create a Play upload keystore outside Git, then copy the example config:

```bash
cp android/key.properties.example android/key.properties
```

Fill `android/key.properties` with the upload keystore values. `storeFile` is resolved from the `android/` directory. The file and keystore extensions are ignored by Git.

Without `android/key.properties`, `npm run android:bundle` still validates that the native project builds, but the generated bundle is not a store-ready signed upload artifact.

To generate a local upload keystore and `android/key.properties` in one step:

```bash
DATEHEART_KEYSTORE_PASSWORD='replace-with-strong-password' \
DATEHEART_KEY_PASSWORD='replace-with-strong-password' \
npm run android:keystore
```

Then build the signed AAB:

```bash
npm run android:bundle
```

The upload artifact remains:

```text
android/app/build/outputs/bundle/release/app-release.aab
```

## iOS Archive

The iOS target is configured as iPhone-only for the first store release.

After the bundle id `com.czarletsgo.dateheart` exists in Apple Developer and the local Xcode account can sign it:

```bash
DATEHEART_IOS_TEAM_ID=YOURTEAMID npm run ios:archive
```

If Xcode should create/update signing profiles automatically:

```bash
DATEHEART_IOS_TEAM_ID=YOURTEAMID DATEHEART_IOS_ALLOW_PROVISIONING_UPDATES=true npm run ios:archive
```

Output:

```text
build/ios/DateHeart.xcarchive
```

Validate and upload the archive from Xcode Organizer or export/upload it with `xcodebuild` after App Store Connect signing is configured.

## Store Screenshots

With a local preview running at `http://127.0.0.1:4173/`:

```bash
npm run screenshots:stores
```

Outputs:

```text
store/screenshots/app-store/iphone-69/
store/screenshots/google-play/phone/
```

## Store Upload Blockers

- Android: Google Play Console app, Play App Signing/upload key, final data-safety answers and production track access.
- iOS: Apple Developer team, registered bundle id, signing certificate/provisioning profile, App Store Connect app record and privacy labels.
- Native payments: implement Apple IAP and Google Play Billing before selling the no-ads unlock inside the native apps.
- Legal pages: replace placeholder operator/contact data before public launch.
