# DateHeart

Free date-cue app for couples with a red animated 3D heart. The core interaction is deliberately simple: tap the heart, get a practical idea, save the good ones.

## Inhalt

- Sehr grosser Ideenpool durch kuratierte Basisideen plus sinnvolle Varianten
- Animiertes Three.js-Herz mit starker Tap-Reaktion
- Ergebnis-Popup mit Kategorie, Budget, Dauer, Vorbereitung und Tags
- Filter nach Kategorie, Budget und Dauer, inklusive `Unbegrenzt`
- Getrennte Bereiche fuer History und Favorites
- Info-Tafel ohne Date-Metadaten, Merken-Button oder Teilen-Button
- ISO-639-1-Sprachkatalog mit 184 Sprachen; auswaehlbar sind nur gepruefte Uebersetzungspakete
- Werbe-Banner und Interstitial bleiben im Code vorbereitet, sind aber deaktiviert
- PWA-Manifest, Service Worker und eigenes SVG-App-Logo

## Entwicklung

```bash
npm install
npm run dev
```

Lokaler Prototyp:

```text
http://127.0.0.1:5174/
```

## Build

```bash
npm run build
```

## Sprachprüfung

```bash
npm run i18n:check
```

## Visueller Check

```bash
node scripts/cdp-check.mjs
```

Screenshots landen unter `/private/tmp/dateheart-cdp-*.png`.
