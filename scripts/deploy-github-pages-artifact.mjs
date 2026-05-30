import { cp, mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { spawnSync } from "node:child_process";

const deployRepo = process.env.DEPLOY_REPO || "czarletsgo/dateheart-web";
const [owner, repoName] = deployRepo.split("/");
const basePath = process.env.DEPLOY_BASE_PATH || `/${repoName}/`;
const liveUrl = process.env.DEPLOY_LIVE_URL || `https://${owner}.github.io/${repoName}/`;
const repoUrl = `https://github.com/${deployRepo}.git`;

if (!owner || !repoName) {
  throw new Error("DEPLOY_REPO must use the form owner/repo.");
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    env: options.env,
    encoding: "utf8",
    stdio: options.capture ? ["ignore", "pipe", "pipe"] : "inherit",
  });

  if (result.status !== 0 && !options.allowFailure) {
    const stderr = result.stderr ? `\n${result.stderr}` : "";
    throw new Error(`${command} ${args.join(" ")} failed with ${result.status}.${stderr}`);
  }

  return result;
}

function output(command, args, options = {}) {
  return run(command, args, { ...options, capture: true }).stdout.trim();
}

function ghApi(args, options = {}) {
  return run("gh", ["api", ...args], { ...options, capture: true });
}

async function cleanDeployDir(deployDir) {
  const entries = await readdir(deployDir);

  await Promise.all(
    entries
      .filter((entry) => entry !== ".git")
      .map((entry) =>
        rm(join(deployDir, entry), {
          force: true,
          recursive: true,
        }),
      ),
  );
}

async function copyDist(deployDir) {
  const entries = await readdir("dist");

  await Promise.all(entries.map((entry) => cp(join("dist", entry), join(deployDir, entry), { recursive: true })));
  await writeFile(join(deployDir, ".nojekyll"), "");
}

function ensureRepoExists() {
  const view = run("gh", ["repo", "view", deployRepo], { capture: true, allowFailure: true });
  if (view.status === 0) return;

  run("gh", [
    "repo",
    "create",
    deployRepo,
    "--public",
    "--description",
    "DateHeart web deploy",
    "--disable-wiki",
    "--clone=false",
  ]);
}

function ensurePagesEnabled() {
  const page = ghApi([`repos/${deployRepo}/pages`], { allowFailure: true });
  if (page.status === 0) return;

  ghApi([
    "--method",
    "POST",
    `repos/${deployRepo}/pages`,
    "-F",
    "source[branch]=main",
    "-F",
    "source[path]=/",
  ]);
}

async function waitForPagesBuilt() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const page = ghApi([`repos/${deployRepo}/pages`], { allowFailure: true });
    if (page.status === 0) {
      const data = JSON.parse(page.stdout);
      if (data.status === "built") return data;
    }

    await new Promise((resolve) => setTimeout(resolve, 3000));
  }

  throw new Error("GitHub Pages did not report built status in time.");
}

console.log(`Deploy repo: ${deployRepo}`);
console.log(`Base path: ${basePath}`);

run("npm", ["run", "launch:check"], {
  env: {
    ...process.env,
    VITE_BASE_PATH: basePath,
  },
});

ensureRepoExists();

const deployDir = await mkdtemp(join(tmpdir(), "dateheart-pages-"));
run("git", ["clone", repoUrl, deployDir]);

await cleanDeployDir(deployDir);
await copyDist(deployDir);

const status = output("git", ["status", "--porcelain=v1"], { cwd: deployDir });
if (status) {
  run("git", ["add", "."], { cwd: deployDir });
  run("git", ["commit", "-m", `Deploy DateHeart web build (${basename(process.cwd())})`], { cwd: deployDir });
  run("git", ["push", "origin", "main"], { cwd: deployDir });
} else {
  console.log("No deploy changes to publish.");
}

ensurePagesEnabled();
const page = await waitForPagesBuilt();
const deployedUrl = page.html_url || liveUrl;

run("npm", ["run", "live:check"], {
  env: {
    ...process.env,
    APP_URL: deployedUrl,
  },
});

console.log(
  JSON.stringify(
    {
      deployed: true,
      repo: deployRepo,
      url: deployedUrl,
      basePath,
      status: page.status,
    },
    null,
    2,
  ),
);
