# 🔴 SOFORT ROTIEREN — Secrets waren PUBLIC im Internet

Stand 2026-06-24. Gefunden im Security-Audit: hardcoded Credentials im
PUBLIC GitHub-Repo `juliusxkaiser/DateHeart` (jeder konnte sie lesen).

## Was ich (Claude) schon gemacht habe ✅
- Credentials aus dem Code entfernt (→ process.env)
- supabase-setup.mjs + hostinger-dns.mjs aus dem Repo entfernt + gitignored
- restore-purchase Rate-Limit verschärft (Email-Enumeration)
- Committet + gepusht

## ⚠️ WARUM DU TROTZDEM ROTIEREN MUSST
Die Werte stehen noch in der git-HISTORY (jeder kann `git log` machen + sie sehen).
Der Code-Fix entfernt sie aus der aktuellen Version, NICHT aus der Vergangenheit.
Die Secrets sind kompromittiert — sie MÜSSEN ungültig gemacht (rotiert) werden.

## 🔴 ROTIEREN — in dieser Reihenfolge (das waren public!):

### 1. GitHub-Passwort (`czarletsgo` / juliusxkaiser) — WICHTIGSTE
Das Passwort `Zerolado02*` war public. Es ist eine Variante deines Paperclip-
Passworts → ALLE deine `Zerolado...`-Passwörter sind verbrannt.
→ github.com/settings/security → Passwort ändern (neues aus Bitwarden, einzigartig)
→ Falls noch nicht: 2FA auf GitHub aktivieren (du wolltest das eh)

### 2. Resend-API-Key (`re_U81...`)
War public → jeder konnte Phishing-Mails an deine DateHeart-Nutzer senden
(als ob von dir). 
→ resend.com/api-keys → den alten Key LÖSCHEN → neuen generieren
→ neuen Key in die Server-env setzen (NICHT in den Code!)

### 3. Hostinger-Login (EMAIL + PASS aus hostinger-dns.mjs)
War public → Zugang zu deinem VPS-Anbieter (Server löschen/klauen möglich).
→ Hostinger-Passwort ändern (über Google-Login? dann ist es eh dein Gmail —
  prüfen ob hostinger-dns.mjs ein echtes PW oder Google-Login nutzte)
→ Falls echtes PW: ändern, in Bitwarden.

### 4. Paperclip-Passwort (`Zerolado02**`)
Gleiche Familie wie das geleakte GitHub-PW → auch verbrannt, rotieren.
(stand eh schon auf deiner Rotations-Liste)

## 📌 LEHRE fürs nächste Mal
- Niemals Passwörter/Keys in .mjs/.js/.py-Scripts hardcoden — immer process.env
- Setup-Scripts mit Credentials gehören in .gitignore (nie ins Repo)
- Repos mit sowas drin: privat lassen, nicht public
- Ab jetzt: jedes neue Secret → direkt in Bitwarden + env, nie in Code

## ✅ Audit-Ergebnis sonst (verifiziert, NICHT alle Audit-Behauptungen stimmten)
- Preis-Manipulation: FALSCH-Alarm (Server-Festpreis-Tabelle, kein Loch)
- Webhook-Replay: FALSCH-Alarm (markPaidCustomer ist idempotent)
- restore-Email-Enumeration: ECHT aber begrenzt (Gratis-Premium, kein Geld-
  Diebstahl) → Rate-Limit verschärft
- Famcube + GangGlow: sauber, keine hardcoded Secrets
- KIWI nutzt Supabase NICHT zur Laufzeit (nur das setup-script) → kein
  RLS-Cross-Leak zu den Lyne-Apps. Gut.
