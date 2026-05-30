import { chmod, copyFile, mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const androidDir = "android";
const keyAlias = process.env.DATEHEART_KEY_ALIAS || "dateheart";
const storePassword = process.env.DATEHEART_KEYSTORE_PASSWORD;
const keyPassword = process.env.DATEHEART_KEY_PASSWORD || storePassword;
const storeFile = process.env.DATEHEART_KEYSTORE_FILE || "upload-keystore.jks";
const storePath = join(androidDir, storeFile);
const keyPropertiesPath = join(androidDir, "key.properties");
const dname = process.env.DATEHEART_KEY_DNAME || "CN=DateHeart, OU=DateHeart, O=DateHeart, L=Berlin, ST=Berlin, C=DE";
const fallbackKeytool = "/Applications/Android Studio.app/Contents/jbr/Contents/Home/bin/keytool";
const keytool = process.env.DATEHEART_KEYTOOL || (existsSync(fallbackKeytool) ? fallbackKeytool : "keytool");

function fail(message) {
  console.error(message);
  process.exit(1);
}

if (!storePassword || storePassword.length < 8) {
  fail("Set DATEHEART_KEYSTORE_PASSWORD to a strong password with at least 8 characters.");
}

if (!keyPassword || keyPassword.length < 8) {
  fail("Set DATEHEART_KEY_PASSWORD to a strong password with at least 8 characters.");
}

if (existsSync(storePath)) {
  fail(`${storePath} already exists. Move it away before generating a new upload key.`);
}

if (existsSync(keyPropertiesPath)) {
  fail(`${keyPropertiesPath} already exists. Move it away before generating a new signing config.`);
}

await mkdir(androidDir, { recursive: true });

const generated = spawnSync(
  keytool,
  [
    "-genkeypair",
    "-v",
    "-keystore",
    storePath,
    "-storepass",
    storePassword,
    "-alias",
    keyAlias,
    "-keypass",
    keyPassword,
    "-keyalg",
    "RSA",
    "-keysize",
    "2048",
    "-validity",
    "10000",
    "-dname",
    dname,
    "-storetype",
    "JKS",
  ],
  { stdio: "inherit" },
);

if (generated.status !== 0) {
  process.exit(generated.status ?? 1);
}

await copyFile("android/key.properties.example", keyPropertiesPath);
await writeFile(
  keyPropertiesPath,
  [
    `storeFile=${storeFile}`,
    `storePassword=${storePassword}`,
    `keyAlias=${keyAlias}`,
    `keyPassword=${keyPassword}`,
    "",
  ].join("\n"),
);
await chmod(keyPropertiesPath, 0o600);
await chmod(storePath, 0o600);

console.log(
  JSON.stringify(
    {
      ok: true,
      storeFile: storePath,
      keyProperties: keyPropertiesPath,
      next: "Run npm run android:bundle to create the signed AAB.",
    },
    null,
    2,
  ),
);
