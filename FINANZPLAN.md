# Finanzplan: DateHeart

DateHeart bleibt kostenlos. Werbung ist als spaetere Einnahmequelle vorgesehen, im aktuellen UI aber deaktiviert.

## Vorbereitete Platzierungen

- `ad-banner`: Bannerplatz am unteren Rand, aktuell per Feature Flag deaktiviert
- `ad-break`: Interstitial-Dialog, aktuell per Feature Flag deaktiviert

Die eigentliche Integration sollte erst passieren, wenn Store-Konzept, Datenschutz, Consent und echte Nutzerfunnel stehen.

## Umsatzlogik

```text
Monatsumsatz = Ad-Impressions / 1000 * eCPM
```

Wichtige Hebel:

- Taegliche aktive Nutzer
- Herz-Taps pro Session
- Retention durch Favorites, History und neue saisonale Cues
- Consent-Rate fuer personalisierte Werbung
- Frequency Capping ohne Nutzerfrust

## Release-Regeln

- Keine Werbung beim ersten Start.
- Kein Interstitial direkt nach dem ersten Date-Cue.
- Banner duerfen Herz, Kategoriebuttons und Ergebnis-Popup nicht blockieren.
- Kernfunktion bleibt kostenlos.
- Vor Store-Release: Datenschutz, Impressum, CMP, AdMob-App-ID und Analytics-Events ergaenzen.
