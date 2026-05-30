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

## Store Upload Blockers

- Android: Google Play Console app, Play App Signing/upload key, final data-safety answers and production track access.
- iOS: Apple Developer team, registered bundle id, signing certificate/provisioning profile, App Store Connect app record and privacy labels.
- Native payments: implement Apple IAP and Google Play Billing before selling the no-ads unlock inside the native apps.
- Legal pages: replace placeholder operator/contact data before public launch.
