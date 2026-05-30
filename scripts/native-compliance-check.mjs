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
  const allowedPermissions = new Set(["android.permission.INTERNET"]);
  const unexpectedPermissions = permissions.filter((permission) => !allowedPermissions.has(permission));

  if (!permissions.includes("android.permission.INTERNET")) {
    fail("Android INTERNET permission is missing");
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
  const sensitiveUsageKeys = [
    "NSCameraUsageDescription",
    "NSMicrophoneUsageDescription",
    "NSLocationWhenInUseUsageDescription",
    "NSLocationAlwaysAndWhenInUseUsageDescription",
    "NSPhotoLibraryUsageDescription",
    "NSUserTrackingUsageDescription",
  ];
  const presentUsageKeys = sensitiveUsageKeys.filter((key) => infoPlist.includes(`<key>${key}</key>`));

  if (presentUsageKeys.length > 0) {
    fail(`Unexpected iOS sensitive usage keys: ${presentUsageKeys.join(", ")}`);
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
