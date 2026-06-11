# DateHeart Google Play Upload Package

This folder is a local upload/copy package. It has not been submitted to Google Play Console and it does not publish anything by itself.

## App

- App name: DateHeart
- Package name: com.czarletsgo.dateheart
- Category: Lifestyle
- Locales: en-US, en-GB, de-DE, fr-FR, es-ES, pl-PL, it-IT, pt-BR, hi-IN, ar-SA, ja-JP, zh-CN, ru-RU, ko-KR, tr-TR, id-ID, nl-NL, sv-SE, cs-CZ, uk-UA, vi-VN, th-TH

## Manual Play Console Entry

For each locale in `fastlane/metadata/android/<locale>/`:

- `title.txt` -> Store listing app name
- `short_description.txt` -> Short description
- `full_description.txt` -> Full description

Set the app category in Play Console to `Lifestyle`. Mark the app as containing ads.

## Assets

The English asset set is under `fastlane/metadata/android/en-US/images/` when source files exist:

- `icon.png` -> app icon
- `featureGraphic.png` -> feature graphic
- `phoneScreenshots/*.png` -> phone screenshots

## Fastlane Note

This follows the common Fastlane Supply metadata layout. Actual upload still requires a created Play Console app, a service account JSON with the right permissions, and an intentional upload command from the project root.
