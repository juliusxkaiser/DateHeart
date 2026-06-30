import { mkdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";

const teamId = process.env.DATEHEART_IOS_TEAM_ID;
const archivePath = process.env.DATEHEART_IOS_ARCHIVE_PATH || "build/ios/DateHeart.xcarchive";
const allowProvisioningUpdates = process.env.DATEHEART_IOS_ALLOW_PROVISIONING_UPDATES === "true";

if (!teamId) {
  console.error("Set DATEHEART_IOS_TEAM_ID before archiving for App Store Connect.");
  process.exit(1);
}

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

await mkdir("build/ios", { recursive: true });

run("npm", ["run", "native:build"]);

// iOS-Binary darf keine Google-Play-Referenzen enthalten (Guideline 2.3.10).
// dist strippen und NUR iOS neu syncen — android/ behält die ungestrippte Fassung.
run("node", ["scripts/strip-google-play-ios.mjs"]);
run("npx", ["cap", "sync", "ios"]);

run("xcodebuild", [
  "-project",
  "ios/App/App.xcodeproj",
  "-scheme",
  "DateHeart",
  "-configuration",
  "Release",
  "-destination",
  "generic/platform=iOS",
  "-archivePath",
  archivePath,
  `DEVELOPMENT_TEAM=${teamId}`,
  "CODE_SIGN_STYLE=Automatic",
  ...(allowProvisioningUpdates ? ["-allowProvisioningUpdates"] : []),
  "archive",
]);

console.log(
  JSON.stringify(
    {
      ok: true,
      archivePath,
      next: "Open Xcode Organizer to validate and upload, or export/upload with xcodebuild after App Store Connect signing is configured.",
    },
    null,
    2,
  ),
);
