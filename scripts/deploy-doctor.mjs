import { access, readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";

const requiredFiles = [
  "dist/index.html",
  "vercel.json",
  "netlify.toml",
  "Dockerfile",
  ".github/workflows/deploy-pages.yml",
  ".github/workflows/ci.yml",
  "api/create-checkout-session.js",
  "api/health.js",
  "api/verify-checkout-session.js",
  "api/restore-purchase.js",
  "api/stripe-webhook.js",
  "netlify/functions/create-checkout-session.mjs",
  "netlify/functions/health.mjs",
  "netlify/functions/verify-checkout-session.mjs",
  "netlify/functions/restore-purchase.mjs",
  "netlify/functions/stripe-webhook.mjs",
  "scripts/idea-repeat-check.mjs",
  "public/manifest.webmanifest",
  "public/sw.js",
  "public/404.html",
  "public/robots.txt",
  "public/sitemap.xml",
  "public/privacy.html",
  "public/terms.html",
  "public/impressum.html",
  "store/metadata/app-store-draft.md",
  "store/metadata/google-play-draft.md",
  "store/screenshots/dateheart-cdp-mobile-home.png",
  "store/screenshots/dateheart-cdp-mobile-result.png",
  "scripts/api-smoke.mjs",
  "scripts/payment-doctor.mjs",
  "scripts/live-check.mjs",
  "docs/STRIPE_SECRETS.md",
];

const legalFiles = ["public/privacy.html", "public/terms.html", "public/impressum.html"];
const legalPlaceholderPattern = /\[add |\[Name|\[Stra|Support-E-Mail|Launch note|Vor dem öffentlichen Launch|noindex/i;

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    encoding: "utf8",
    stdio: options.capture === false ? "inherit" : ["ignore", "pipe", "pipe"],
  });
}

function commandExists(command) {
  const result = run("sh", ["-lc", `command -v ${command}`]);
  return result.status === 0;
}

function envPresent(name) {
  return Boolean(process.env[name]?.trim());
}

function secretStatus(name, prefix) {
  const raw = process.env[name]?.trim() ?? "";
  if (!raw) return "missing";
  if (raw.includes("replace_me")) return "placeholder";
  if (!raw.startsWith(prefix)) return "invalid_prefix";
  return "present";
}

const missingFiles = [];
for (const file of requiredFiles) {
  if (!(await exists(file))) missingFiles.push(file);
}

const legalPlaceholders = [];
for (const file of legalFiles) {
  if (!(await exists(file))) continue;
  const text = await readFile(file, "utf8");
  if (legalPlaceholderPattern.test(text)) legalPlaceholders.push(file);
}

const gitRemote = run("git", ["remote", "get-url", "origin"]);
const gitStatus = run("git", ["status", "--porcelain=v1"]);
const gitBranch = run("git", ["branch", "--show-current"]);
const ghAuth = commandExists("gh") ? run("gh", ["auth", "status"]) : { status: 127 };
const artifactDeployRepo = process.env.DEPLOY_REPO || "czarletsgo/dateheart-web";
const artifactRepoCheck = commandExists("gh") ? run("gh", ["repo", "view", artifactDeployRepo, "--json", "name"], { capture: true, allowFailure: true }) : { status: 127 };
const artifactPagesCheck = commandExists("gh") ? run("gh", ["api", `repos/${artifactDeployRepo}/pages`], { capture: true, allowFailure: true }) : { status: 127 };
const stripeSecretStatus = secretStatus("STRIPE_SECRET_KEY", "sk_");
const webhookSecretStatus = secretStatus("STRIPE_WEBHOOK_SECRET", "whsec_");

const deployPaths = [
  {
    provider: "github-pages-artifact",
    ready: ghAuth.status === 0 && artifactRepoCheck.status === 0,
    reason:
      ghAuth.status !== 0
        ? "gh auth missing"
        : artifactRepoCheck.status === 0
          ? `${artifactDeployRepo} exists; run npm run deploy:github-pages`
          : `${artifactDeployRepo} does not exist yet; deploy script can create it if permitted`,
    pages: artifactPagesCheck.status === 0 ? "enabled" : "not_enabled_yet",
  },
  {
    provider: "github-pages-source-repo",
    ready: false,
    reason: "source repo is private; GitHub Pages may be blocked by the current GitHub plan",
  },
  {
    provider: "vercel",
    ready: envPresent("VERCEL_TOKEN"),
    reason: envPresent("VERCEL_TOKEN") ? "VERCEL_TOKEN present" : "VERCEL_TOKEN missing",
  },
  {
    provider: "netlify",
    ready: envPresent("NETLIFY_AUTH_TOKEN"),
    reason: envPresent("NETLIFY_AUTH_TOKEN") ? "NETLIFY_AUTH_TOKEN present" : "NETLIFY_AUTH_TOKEN missing",
  },
  {
    provider: "docker",
    ready: commandExists("docker"),
    reason: commandExists("docker") ? "docker CLI present" : "docker CLI missing",
  },
];

const publicLaunchBlockers = [
  ...legalPlaceholders.map((file) => `${file} still contains launch placeholders/noindex`),
  ...(stripeSecretStatus !== "present" ? [`STRIPE_SECRET_KEY is ${stripeSecretStatus} in current shell`] : []),
  ...(webhookSecretStatus !== "present" ? [`STRIPE_WEBHOOK_SECRET is ${webhookSecretStatus} in current shell`] : []),
];

const warnings = [];
if (gitStatus.stdout.trim()) warnings.push("Working tree has uncommitted changes.");
if (stripeSecretStatus !== "present" || webhookSecretStatus !== "present") {
  warnings.push("Payment endpoints will return controlled 503 responses until Stripe secrets are set in the host.");
}
if (legalPlaceholders.length > 0) {
  warnings.push("Legal pages are OK for internal preview, not for public marketing launch.");
}

const result = {
  ok: missingFiles.length === 0 && deployPaths.some((path) => path.ready),
  branch: gitBranch.stdout.trim() || null,
  remote: gitRemote.stdout.trim() || null,
  missingFiles,
  deployPaths,
  env: {
    VERCEL_TOKEN: envPresent("VERCEL_TOKEN") ? "present" : "missing",
    NETLIFY_AUTH_TOKEN: envPresent("NETLIFY_AUTH_TOKEN") ? "present" : "missing",
    STRIPE_SECRET_KEY: stripeSecretStatus,
    STRIPE_WEBHOOK_SECRET: webhookSecretStatus,
  },
  publicLaunchBlockers,
  warnings,
};

console.log(JSON.stringify(result, null, 2));

if (!result.ok) {
  process.exit(1);
}
