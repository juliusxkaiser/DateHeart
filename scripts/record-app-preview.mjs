import { copyFile, mkdir, readdir, stat, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { chromium } from "playwright";

const execFileAsync = promisify(execFile);

const appUrl = process.env.APP_URL || "http://127.0.0.1:4173/";
const clipSeconds = 15;
const trimOffsetSeconds = Number(process.env.PREVIEW_TRIM_OFFSET_SECONDS ?? 0);
const rawDir = `/private/tmp/dateheart-preview-recordings-${Date.now()}`;
const previewPath = resolve("store/previews/app-store/iphone/dateheart-app-preview-886x1920.mp4");
const uploadPath = resolve("store/upload-appstore-ios/00-dateheart-app-preview-886x1920.mp4");
const posterPath = "/private/tmp/dateheart-preview-frame.png";
const contactSheetPath = "/private/tmp/dateheart-preview-contact.png";
const audioPath = "/private/tmp/dateheart-preview-sound.wav";
const revealSoundKind = "heart";

async function newestFile(directory) {
  const entries = await readdir(directory);
  const files = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry);
      return { path, stats: await stat(path) };
    }),
  );
  return files
    .filter((entry) => entry.stats.isFile())
    .sort((a, b) => b.stats.mtimeMs - a.stats.mtimeMs)[0]?.path;
}

async function run(command, args) {
  try {
    const result = await execFileAsync(command, args, { maxBuffer: 1024 * 1024 * 12 });
    return result.stdout.trim();
  } catch (error) {
    const stderr = error?.stderr ? `\n${error.stderr}` : "";
    throw new Error(`${command} ${args.join(" ")} failed${stderr}`);
  }
}

async function videoDurationSeconds(path) {
  const output = await run("ffprobe", [
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "default=noprint_wrappers=1:nokey=1",
    path,
  ]);
  const duration = Number(output);
  if (!Number.isFinite(duration) || duration <= 0) throw new Error(`Could not read duration for ${path}`);
  return duration;
}

function waveformSample(waveform, phase) {
  const cycle = phase - Math.floor(phase);
  if (waveform === "square") return cycle < 0.5 ? 1 : -1;
  if (waveform === "triangle") return 1 - 4 * Math.abs(cycle - 0.5);
  return Math.sin(cycle * Math.PI * 2);
}

function tonePlanFor(kind) {
  if (kind === "heart") {
    return [
      { delay: 0, duration: 0.11, frequency: 392, waveform: "triangle", gain: 1 },
      { delay: 0.075, duration: 0.16, frequency: 587.33, waveform: "triangle", gain: 1 },
    ];
  }

  return [{ delay: 0, duration: 0.055, frequency: 520, waveform: "sine", gain: 1 }];
}

function peakFor(kind) {
  if (kind === "heart") return 0.09;
  return 0.05;
}

function writeInt16(output, offset, value) {
  output.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(value * 32767))), offset);
}

async function writePreviewAudio(path, durationSeconds, events) {
  const sampleRate = 48000;
  const channels = 2;
  const sampleCount = Math.ceil(durationSeconds * sampleRate);
  const samples = new Float32Array(sampleCount);

  for (const event of events) {
    const peak = peakFor(event.kind);

    for (const tone of tonePlanFor(event.kind)) {
      const start = Math.max(0, Math.floor((event.at + tone.delay) * sampleRate));
      const end = Math.min(sampleCount, Math.ceil((event.at + tone.delay + tone.duration) * sampleRate));
      let phase = 0;

      for (let index = start; index < end; index += 1) {
        const time = index / sampleRate - event.at - tone.delay;
        const progress = Math.max(0, Math.min(1, time / tone.duration));
        const attack = Math.min(0.012, tone.duration * 0.35);
        const release = Math.min(0.04, tone.duration * 0.5);
        const attackGain = attack > 0 ? Math.min(1, time / attack) : 1;
        const releaseGain = release > 0 ? Math.min(1, (tone.duration - time) / release) : 1;
        const envelope = Math.max(0, Math.min(attackGain, releaseGain));
        const frequency = tone.endFrequency
          ? tone.frequency * (tone.endFrequency / tone.frequency) ** progress
          : tone.frequency;

        phase += frequency / sampleRate;
        samples[index] += waveformSample(tone.waveform ?? "sine", phase) * (tone.gain ?? 1) * peak * envelope;
      }
    }
  }

  const dataBytes = sampleCount * channels * 2;
  const output = Buffer.alloc(44 + dataBytes);
  output.write("RIFF", 0);
  output.writeUInt32LE(36 + dataBytes, 4);
  output.write("WAVE", 8);
  output.write("fmt ", 12);
  output.writeUInt32LE(16, 16);
  output.writeUInt16LE(1, 20);
  output.writeUInt16LE(channels, 22);
  output.writeUInt32LE(sampleRate, 24);
  output.writeUInt32LE(sampleRate * channels * 2, 28);
  output.writeUInt16LE(channels * 2, 32);
  output.writeUInt16LE(16, 34);
  output.write("data", 36);
  output.writeUInt32LE(dataBytes, 40);

  for (let index = 0; index < sampleCount; index += 1) {
    const value = Math.max(-0.95, Math.min(0.95, samples[index]));
    const offset = 44 + index * channels * 2;
    writeInt16(output, offset, value);
    writeInt16(output, offset + 2, value);
  }

  await writeFile(path, output);
}

await mkdir(rawDir, { recursive: true });
await mkdir(dirname(previewPath), { recursive: true });
await mkdir(dirname(uploadPath), { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 443, height: 960 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  locale: "en-US",
  recordVideo: {
    dir: rawDir,
    size: { width: 443, height: 960 },
  },
});

await context.addInitScript(() => {
  localStorage.clear();
  sessionStorage.clear();
  localStorage.setItem("dateheart:language", "en");
  localStorage.setItem("dateheart:no_ads", "true");
  localStorage.setItem("dateheart:stats", JSON.stringify({ reveals: 0, adBreaks: 0, nextAdRevealAt: 999 }));
  Object.defineProperty(navigator, "vibrate", { value: () => false, configurable: true });
});

const page = await context.newPage();
const recordingStartedAt = Date.now();
const audioEvents = [];
let video;

function recordingSeconds() {
  return (Date.now() - recordingStartedAt) / 1000;
}

async function clickAndTimestamp(selector) {
  const timestampMs = await page.locator(selector).evaluate((element) => {
    const timestamp = performance.timeOrigin + performance.now();
    element.click();
    return timestamp;
  });
  return (timestampMs - recordingStartedAt) / 1000;
}

try {
  await page.goto(appUrl, { waitUntil: "networkidle" });
  await page.locator("#heartButton").waitFor({ state: "visible", timeout: 15000 });
  await page.locator("#heartCanvas").waitFor({ state: "visible", timeout: 15000 });
  await page.evaluate(async () => {
    await document.fonts?.ready;
    await new Promise((resolveFrame) => requestAnimationFrame(() => requestAnimationFrame(resolveFrame)));
  });
  await page.waitForTimeout(1300);

  const clipStartSeconds = recordingSeconds();
  const clipStartMs = Date.now();
  await page.waitForTimeout(1100);

  audioEvents.push({ kind: revealSoundKind, at: await clickAndTimestamp("#heartButton") });
  await page.waitForFunction(() => {
    const overlay = document.querySelector("#resultOverlay");
    const title = document.querySelector("#resultTitle");
    return overlay && !overlay.hidden && title?.textContent?.trim();
  });

  const firstTitle = await page.locator("#resultTitle").innerText();
  await page.waitForTimeout(3800);

  const againClickSeconds = await clickAndTimestamp("#againButton");
  audioEvents.push({ kind: "click", at: againClickSeconds });
  audioEvents.push({ kind: revealSoundKind, at: againClickSeconds + 0.19 });
  await page.waitForFunction(
    (previousTitle) => {
      const overlay = document.querySelector("#resultOverlay");
      const title = document.querySelector("#resultTitle")?.textContent?.trim();
      return overlay && !overlay.hidden && title && title !== previousTitle;
    },
    firstTitle,
    { timeout: 10000 },
  );

  const remainingMs = clipSeconds * 1000 + 950 - (Date.now() - clipStartMs);
  await page.waitForTimeout(Math.max(1200, remainingMs));
  await page.screenshot({ path: posterPath, fullPage: false });
  video = page.video();
  const recordingStopSeconds = recordingSeconds();

  await context.close();
  await browser.close();

  const rawVideo = (await video?.path()) || (await newestFile(rawDir));
  if (!rawVideo) throw new Error(`No raw preview video found in ${rawDir}`);

  const rawDurationSeconds = await videoDurationSeconds(rawVideo);
  const rawStartOffsetSeconds = Math.max(0, recordingStopSeconds - rawDurationSeconds);
  const previewTimelineStartSeconds = clipStartSeconds + trimOffsetSeconds;
  const exportStartSeconds = Math.max(0, previewTimelineStartSeconds - rawStartOffsetSeconds);
  const previewAudioEvents = audioEvents
    .map((event) => ({ ...event, at: event.at - previewTimelineStartSeconds }))
    .filter((event) => event.at > -0.5 && event.at < clipSeconds);

  await writePreviewAudio(audioPath, clipSeconds, previewAudioEvents);

  await run("ffmpeg", [
    "-y",
    "-i",
    rawVideo,
    "-i",
    audioPath,
    "-map",
    "0:v:0",
    "-map",
    "1:a:0",
    "-vf",
    `trim=start=${exportStartSeconds.toFixed(3)}:duration=${clipSeconds},setpts=PTS-STARTPTS,fps=30,scale=886:1920:force_original_aspect_ratio=increase,crop=886:1920,setsar=1,format=yuv420p`,
    "-t",
    String(clipSeconds),
    "-r",
    "30",
    "-c:v",
    "libx264",
    "-profile:v",
    "high",
    "-level",
    "4.0",
    "-preset",
    "medium",
    "-crf",
    "19",
    "-c:a",
    "aac",
    "-b:a",
    "160k",
    "-movflags",
    "+faststart",
    "-shortest",
    previewPath,
  ]);

  await copyFile(previewPath, uploadPath);

  await run("ffmpeg", [
    "-y",
    "-i",
    previewPath,
    "-vf",
    "select='eq(n,15)+eq(n,90)+eq(n,195)+eq(n,300)+eq(n,420)',scale=177:384,tile=5x1",
    "-frames:v",
    "1",
    contactSheetPath,
  ]);

  const probe = await run("ffprobe", [
    "-v",
    "error",
    "-show_entries",
    "stream=codec_name,width,height,r_frame_rate,pix_fmt,sample_aspect_ratio:format=duration,size",
    "-of",
    "json",
    previewPath,
  ]);

  console.log(
    JSON.stringify(
      {
        appUrl,
        rawVideo,
        clipStartSeconds: Number(clipStartSeconds.toFixed(3)),
        trimOffsetSeconds,
        recordingStopSeconds: Number(recordingStopSeconds.toFixed(3)),
        rawDurationSeconds: Number(rawDurationSeconds.toFixed(3)),
        rawStartOffsetSeconds: Number(rawStartOffsetSeconds.toFixed(3)),
        previewTimelineStartSeconds: Number(previewTimelineStartSeconds.toFixed(3)),
        exportStartSeconds: Number(exportStartSeconds.toFixed(3)),
        audioPath,
        audioEvents: previewAudioEvents.map((event) => ({ kind: event.kind, at: Number(event.at.toFixed(3)) })),
        previewPath,
        uploadPath,
        posterPath,
        contactSheetPath,
        probe: JSON.parse(probe),
      },
      null,
      2,
    ),
  );
} catch (error) {
  await context.close().catch(() => {});
  await browser.close().catch(() => {});
  throw error;
}
