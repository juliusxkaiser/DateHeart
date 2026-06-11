// Entfernt Google-Play-Referenzen aus dist/ für den iOS-Build (App Review
// Guideline 2.3.10: keine Verweise auf fremde Plattformen im iOS-Binary).
// Wird NUR vor dem iOS-Sync ausgeführt — der Android-Build behält die Texte.
import { readdir, readFile, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";

const DIST = "dist";
const TEXT_EXTENSIONS = new Set([".js", ".mjs", ".css", ".html", ".json", ".txt", ".webmanifest", ".xml", ".svg"]);

// Muster 1: "App Store <Konnektor> Google Play" → "App Store"
// (deckt alle Sprachen ab, der Konnektor steht zwischen den Markennamen)
const STORE_PAIR = /App Store(.{1,24}?)Google Play/gs;
// Muster 1b: "App Store Connect <Konnektor> Play Console[Suffix]" (statusUnavailable, alle Sprachen)
const CONSOLE_PAIR = /App Store Connect(.{1,14}?)Play Console[^\s"`'.,)]*/gs;
// Muster 2: Aufzählungen/Billing-Formulierungen in den Rechtstexten
const EXTRA_PATTERNS = [
  [/,?\s*Google Play Billing/g, ""],
  [/,\s*Google Play\b/g, ""],
  [/\bGoogle Play Store\b/g, "App Store"],
  // Interne Anzeige-Labels der cdv-purchase-Library (auf iOS nie erreichbar)
  [/(["'`])Google Play\1/g, "$1External Store$1"],
  // Debug-Log-Texte der Library (Android-Codepfad, auf iOS nie erreichbar)
  [/\bGoogle Play\b/g, "external store"],
];

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else yield path;
  }
}

let changedFiles = 0;
let replacements = 0;

for await (const path of walk(DIST)) {
  if (!TEXT_EXTENSIONS.has(extname(path))) continue;
  const before = await readFile(path, "utf8");
  if (!/google play|play console|play store|play\.google/i.test(before)) continue;

  let after = before.replace(STORE_PAIR, "App Store").replace(CONSOLE_PAIR, "App Store Connect");
  for (const [pattern, replacement] of EXTRA_PATTERNS) after = after.replace(pattern, replacement);

  const remaining = after.match(/google play|play\.google\.com|play store|play console/gi);
  if (remaining) {
    console.error(`✗ ${path}: ${remaining.length} Google-Play-Referenz(en) nicht abgedeckt:`);
    const idx = after.search(/google play|play\.google\.com|play store/i);
    console.error("  Kontext: …" + after.slice(Math.max(0, idx - 60), idx + 60).replace(/\s+/g, " ") + "…");
    process.exit(1);
  }

  if (after !== before) {
    replacements += (before.match(/google play/gi) || []).length;
    changedFiles += 1;
    await writeFile(path, after);
  }
}

console.log(`✓ iOS-Strip: ${replacements} Google-Play-Referenzen in ${changedFiles} Datei(en) entfernt.`);
