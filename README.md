# DateHeart

Free date-cue app for couples with a red animated 3D heart. The core interaction is deliberately simple: tap the heart, get a practical idea, save the good ones.

## Inhalt

- Sehr grosser Ideenpool durch kuratierte Basisideen plus sinnvolle Varianten
- Animiertes Three.js-Herz mit starker Tap-Reaktion
- Ergebnis-Popup mit Kategorie, Budget, Dauer, Vorbereitung und Tags
- Filter nach Kategorie, Budget und Dauer, inklusive `Unbegrenzt`
- Getrennte Bereiche fuer History und Favorites
- Info-Tafel ohne Date-Metadaten, Merken-Button oder Teilen-Button
- ISO-639-1-Sprachkatalog mit 184 Sprachen plus US-English; 22 Sprachen sind als gepruefte Uebersetzungspakete auswaehlbar
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
npm run assets:generate
npm run build
```

Der fertige statische Build liegt danach in `dist/`.

## Deploy

```bash
npm ci
npm run deploy:today
```

`deploy:today` baut Assets, prueft alle Sprachen, baut Production, validiert Launch-Dateien und zeigt mit `deploy:doctor`, welcher Deploy-Pfad gerade nutzbar ist.

DateHeart ist als statische Vite-App deploybar. Vercel und Netlify nutzen die mitgelieferten Dateien `vercel.json` und `netlify.toml`; als Output-Verzeichnis gilt jeweils `dist`. Fuer echte Payments sind Vercel oder Netlify der bessere Web-Deploy, weil dort die Serverless-Endpunkte mit ausgerollt werden.

Direkte Deploy-Kommandos:

```bash
npm run deploy:github-pages
npm run deploy:vercel
npm run deploy:netlify
```

Fuer GitHub Pages ist ein Workflow unter `.github/workflows/deploy-pages.yml` vorbereitet. Er baut mit `VITE_BASE_PATH=/<repo-name>/`, damit Assets, Manifest und Service Worker auch unter einer Repo-Unterseite funktionieren. Wenn das Source-Repo privat ist und der GitHub-Plan Pages fuer private Repos nicht erlaubt, kann stattdessen ein oeffentliches Artefakt-Repo nur mit `dist/` verwendet werden.

Aktueller Web-Deploy:

```text
https://czarletsgo.github.io/dateheart-web/
```

Der aktuelle Web-Deploy ist als Ein-Kommando-Artefaktdeploy automatisiert:

```bash
npm run deploy:github-pages
```

Standardwerte:

```text
DEPLOY_REPO=czarletsgo/dateheart-web
DEPLOY_BASE_PATH=/dateheart-web/
```

Weitere manuelle GitHub Actions liegen unter:

- `.github/workflows/deploy-vercel.yml`
- `.github/workflows/deploy-netlify.yml`

Sie brauchen nur die jeweiligen Repository-Secrets (`VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` bzw. `NETLIFY_AUTH_TOKEN`, `NETLIFY_SITE_ID`) und die Stripe-Secrets.

Wenn ein anderer Unterpfad gebraucht wird:

```bash
VITE_BASE_PATH=/dein-pfad/ npm run build
```

Docker ist ebenfalls vorbereitet:

```bash
docker build -t dateheart .
docker run --rm -p 8080:80 dateheart
```

## Production Checks

Lokaler Server plus API-Smoke-Test:

```bash
npm run launch:check
PORT=4180 node server/node-server.mjs
APP_URL=http://127.0.0.1:4180/ npm run api:smoke
```

Auf einem echten Vercel-/Netlify-Backend mit gesetzten Stripe-Secrets:

```bash
APP_URL=https://deine-domain.example/ REQUIRE_CONFIGURED_PAYMENT=true npm run api:smoke
```

Der Smoke-Test prueft `/api/health`, Checkout-Start, Session-Validation und Restore-Validation. Ohne Stripe-Secrets ist ein kontrolliertes `payment_unavailable` korrekt; mit `REQUIRE_CONFIGURED_PAYMENT=true` muss Checkout eine Stripe-URL liefern.

## Zahlung

Der einmalige Kauf `DateHeart ohne Werbung` laeuft ueber Stripe Checkout. Deutschland/EUR ist auf `4,99 EUR` gesetzt; fuer wichtige Maerkte gibt es eigene lokale Preise, z. B. USD, GBP, PLN, INR, JPY, KRW, SEK, CZK, UAH, VND und THB. Nicht konfigurierte Waehrungen fallen sicher auf EUR zurueck.

Noetige Umgebung:

```bash
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

Optional:

```bash
STRIPE_AUTOMATIC_TAX=true
PAYMENT_ALLOWED_ORIGINS=https://dein-github-pages-host
VITE_CHECKOUT_ENDPOINT=https://dein-backend.example/api/create-checkout-session
VITE_VERIFY_PAYMENT_ENDPOINT=https://dein-backend.example/api/verify-checkout-session
VITE_RESTORE_PAYMENT_ENDPOINT=https://dein-backend.example/api/restore-purchase
```

Vercel nutzt `/api/create-checkout-session`, `/api/verify-checkout-session`, `/api/restore-purchase` und `/api/stripe-webhook`. Netlify nutzt die entsprechenden Funktionen unter `/.netlify/functions/...`. GitHub Pages braucht wegen fehlender Serverless-Funktionen ein externes Backend ueber die `VITE_*_ENDPOINT` Variablen.

Der Webhook sollte in Stripe auf `checkout.session.completed` und `checkout.session.async_payment_succeeded` zeigen. Nach erfolgreichem Kauf wird der Stripe-Kunde mit `dateheart_no_ads=true` markiert; dadurch kann ein Kauf spaeter per Checkout-E-Mail wiederhergestellt werden.

Die rechtlichen Seiten liegen als auslieferbare Platzhalter in `public/privacy.html`, `public/terms.html` und `public/impressum.html`. Vor oeffentlichem Launch muessen dort echte Betreiber- und Kontaktdaten rein. Die verbleibenden Owner-Schritte stehen in `LAUNCH_CHECKLIST.md`.

## Sprachprüfung

```bash
npm run i18n:check
```

## Visueller Check

```bash
node scripts/cdp-check.mjs
```

Screenshots landen unter `/private/tmp/dateheart-cdp-*.png`.

Store-/Launch-Screenshots koennen mit laufender App so erzeugt werden:

```bash
APP_URL=http://127.0.0.1:4173/ npm run screenshots:pwa
APP_URL=http://127.0.0.1:4173/ npm run screenshots:store
```
