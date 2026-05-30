import { access, readFile } from "node:fs/promises";
import sharp from "sharp";

const requiredFiles = [
  "public/apple-touch-icon.png",
  "public/icons/icon-192.png",
  "public/icons/icon-512.png",
  "public/icons/maskable-512.png",
  "public/social-card.png",
  "public/404.html",
  "public/robots.txt",
  "public/sitemap.xml",
  "public/screenshots/dateheart-cdp-mobile-home.png",
  "public/screenshots/dateheart-cdp-mobile-result.png",
  "public/screenshots/dateheart-cdp-desktop-home.png",
  "public/screenshots/dateheart-cdp-desktop-result.png",
  "public/privacy.html",
  "public/terms.html",
  "public/impressum.html",
  "store/assets/app-icon-1024.png",
  "store/screenshots/dateheart-cdp-mobile-home.png",
  "store/screenshots/dateheart-cdp-mobile-result.png",
  "store/screenshots/dateheart-cdp-desktop-home.png",
  "store/screenshots/dateheart-cdp-desktop-result.png",
  "store/metadata/web-listing.md",
  "store/metadata/app-store-draft.md",
  "store/metadata/google-play-draft.md",
  "api/create-checkout-session.js",
  "api/health.js",
  "api/restore-purchase.js",
  "api/stripe-webhook.js",
  "api/verify-checkout-session.js",
  "netlify/functions/create-checkout-session.mjs",
  "netlify/functions/health.mjs",
  "netlify/functions/restore-purchase.mjs",
  "netlify/functions/stripe-webhook.mjs",
  "netlify/functions/verify-checkout-session.mjs",
  "scripts/idea-repeat-check.mjs",
  "scripts/api-smoke.mjs",
  "scripts/payment-doctor.mjs",
  "scripts/live-check.mjs",
  "docs/STRIPE_SECRETS.md",
  "LAUNCH_CHECKLIST.md",
  ".env.example",
];

const errors = [];

function manifestSize(value) {
  const match = /^(\d+)x(\d+)$/.exec(value ?? "");
  if (!match) return undefined;
  return { width: Number(match[1]), height: Number(match[2]) };
}

async function assertManifestAsset(asset, label) {
  const path = `public/${asset.src}`;
  try {
    await access(path);
  } catch {
    errors.push(`${label} missing: ${asset.src}`);
    return;
  }

  const expectedSize = manifestSize(asset.sizes);
  if (!expectedSize || asset.type === "image/svg+xml") return;

  const metadata = await sharp(path).metadata();
  if (metadata.width !== expectedSize.width || metadata.height !== expectedSize.height) {
    errors.push(
      `${label} size mismatch: ${asset.src} declares ${asset.sizes}, actual ${metadata.width}x${metadata.height}`,
    );
  }
}

for (const file of requiredFiles) {
  try {
    await access(file);
  } catch {
    errors.push(`Missing launch file: ${file}`);
  }
}

const manifest = JSON.parse(await readFile("public/manifest.webmanifest", "utf8"));
for (const icon of manifest.icons ?? []) {
  await assertManifestAsset(icon, "Manifest icon");
}

for (const screenshot of manifest.screenshots ?? []) {
  await assertManifestAsset(screenshot, "Manifest screenshot");
}

const envExample = await readFile(".env.example", "utf8");
for (const key of ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "VITE_CHECKOUT_ENDPOINT", "VITE_VERIFY_PAYMENT_ENDPOINT", "VITE_RESTORE_PAYMENT_ENDPOINT"]) {
  if (!envExample.includes(key)) errors.push(`.env.example is missing ${key}`);
}

if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      launchAssets: requiredFiles.length,
      manifestIcons: manifest.icons?.length ?? 0,
      manifestScreenshots: manifest.screenshots?.length ?? 0,
      ok: true,
    },
    null,
    2,
  ),
);
