#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

function read(relativePath) {
  return readFileSync(resolve(root, relativePath), "utf8");
}

function fail(message) {
  failures.push(message);
}

const androidManifestPath = "android/app/src/main/AndroidManifest.xml";
if (!existsSync(resolve(root, androidManifestPath))) {
  fail(`${androidManifestPath} is missing`);
} else {
  const manifest = read(androidManifestPath);
  const permissions = [...manifest.matchAll(/<uses-permission[^>]+android:name="([^"]+)"/g)].map((match) => match[1]);
  // AdMob (added 2026-06-15) legitimately requires AD_ID + ACCESS_NETWORK_STATE.
  const allowedPermissions = new Set([
    "android.permission.INTERNET",
    "com.google.android.gms.permission.AD_ID",
    "android.permission.ACCESS_NETWORK_STATE",
  ]);
  const unexpectedPermissions = permissions.filter((permission) => !allowedPermissions.has(permission));

  if (!permissions.includes("android.permission.INTERNET")) {
    fail("Android INTERNET permission is missing");
  }

  if (!manifest.includes('android:name="com.google.android.gms.ads.APPLICATION_ID"')) {
    fail("Android AdMob application id metadata is missing");
  }

  if (unexpectedPermissions.length > 0) {
    fail(`Unexpected Android permissions: ${unexpectedPermissions.join(", ")}`);
  }
}

const infoPlistPath = "ios/App/App/Info.plist";
if (!existsSync(resolve(root, infoPlistPath))) {
  fail(`${infoPlistPath} is missing`);
} else {
  const infoPlist = read(infoPlistPath);
  // These usage keys are NOT expected for these apps and would indicate scope creep.
  // NSUserTrackingUsageDescription is intentionally excluded: AdMob/ATT (added 2026-06-15)
  // requires it, so it is expected (and checked for presence below) rather than rejected.
  const sensitiveUsageKeys = [
    "NSCameraUsageDescription",
    "NSMicrophoneUsageDescription",
    "NSLocationWhenInUseUsageDescription",
    "NSLocationAlwaysAndWhenInUseUsageDescription",
    "NSPhotoLibraryUsageDescription",
  ];
  const presentUsageKeys = sensitiveUsageKeys.filter((key) => infoPlist.includes(`<key>${key}</key>`));

  if (presentUsageKeys.length > 0) {
    fail(`Unexpected iOS sensitive usage keys: ${presentUsageKeys.join(", ")}`);
  }

  // DateHeart serves non-personalized AdMob ads (npa:true) and does NOT track
  // users, so NSUserTrackingUsageDescription must be ABSENT — Apple rejects the
  // binary with BINARY_INDICATES_APP_TRACKS_USERS if the key is present without
  // actual tracking (see commit 05ba43b). Flag it if it sneaks back in.
  if (infoPlist.includes("<key>NSUserTrackingUsageDescription</key>")) {
    fail("iOS NSUserTrackingUsageDescription present but app does not track (triggers BINARY_INDICATES_APP_TRACKS_USERS); remove it");
  }

  if (!infoPlist.includes("<key>GADApplicationIdentifier</key>")) {
    fail("iOS GADApplicationIdentifier is missing");
  }

  if (!infoPlist.includes("<key>SKAdNetworkItems</key>")) {
    fail("iOS SKAdNetworkItems is missing");
  }
}

const privacyManifestPath = "ios/App/App/PrivacyInfo.xcprivacy";
const xcodeProjectPath = "ios/App/App.xcodeproj/project.pbxproj";
if (!existsSync(resolve(root, privacyManifestPath))) {
  fail(`${privacyManifestPath} is missing`);
} else {
  const privacyManifest = read(privacyManifestPath);
  for (const key of ["NSPrivacyCollectedDataTypes", "NSPrivacyAccessedAPITypes", "NSPrivacyTrackingDomains", "NSPrivacyTracking"]) {
    if (!privacyManifest.includes(`<key>${key}</key>`)) {
      fail(`${privacyManifestPath} is missing ${key}`);
    }
  }

  if (!privacyManifest.includes("<false/>")) {
    fail(`${privacyManifestPath} should declare NSPrivacyTracking false`);
  }
}

if (!existsSync(resolve(root, xcodeProjectPath))) {
  fail(`${xcodeProjectPath} is missing`);
} else if (!read(xcodeProjectPath).includes("PrivacyInfo.xcprivacy in Resources")) {
  fail("PrivacyInfo.xcprivacy is not included in the iOS app resources");
}

if (failures.length > 0) {
  console.error("Native compliance check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Native compliance check passed.");
