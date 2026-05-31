#!/usr/bin/env node
import { existsSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const requiredFiles = [
  "store/assets/app-icon-1024.png",
  "store/metadata/app-store-draft.md",
  "store/metadata/google-play-draft.md",
  "store/metadata/web-listing.md",
  "public/support.html",
  "docs/STORE_COMPLIANCE.md",
  "docs/STORE_RELEASE_INPUTS.md",
  "ios/App/App/PrivacyInfo.xcprivacy",
  "store/screenshots/app-store/iphone-69/01-home.png",
  "store/screenshots/app-store/iphone-69/02-result.png",
  "store/screenshots/app-store/iphone-69/03-filter.png",
  "store/screenshots/google-play/phone/01-home.png",
  "store/screenshots/google-play/phone/02-result.png",
  "store/screenshots/google-play/phone/03-filter.png",
];

const optionalLocalArtifacts = [
  "android/app/build/outputs/bundle/release/app-release.aab",
  "build/ios/DateHeart.xcarchive",
];

const failures = [];
const warnings = [];

for (const file of requiredFiles) {
  const path = resolve(root, file);
  if (!existsSync(path)) {
    failures.push(`${file} is missing`);
    continue;
  }

  if (statSync(path).size === 0) {
    failures.push(`${file} is empty`);
  }
}

for (const file of optionalLocalArtifacts) {
  const path = resolve(root, file);
  if (!existsSync(path)) {
    warnings.push(`${file} is not present locally yet`);
  }
}

if (failures.length > 0) {
  console.error("Store packet check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Store packet check passed.");
if (warnings.length > 0) {
  console.log("Warnings:");
  for (const warning of warnings) {
    console.log(`- ${warning}`);
  }
}
