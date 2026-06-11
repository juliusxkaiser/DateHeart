#!/usr/bin/env node
import { copyFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import sharp from "sharp";

const root = resolve(import.meta.dirname, "..");
const appStoreDir = join(root, "store/screenshots/app-store/iphone-69");
const rawDir = join(appStoreDir, "raw");
const uploadDir = join(root, "store/upload-appstore-ios");

const width = 1284;
const height = 2778;
const screenWidth = 830;
const screenHeight = Math.round((screenWidth * height) / width);
const frame = 48;
const phoneWidth = screenWidth + frame * 2;
const phoneHeight = screenHeight + frame * 2;
const phoneLeft = Math.round((width - phoneWidth) / 2);
const phoneTop = 658;
const screenLeft = phoneLeft + frame;
const screenTop = phoneTop + frame;

const shots = [
  {
    file: "01-home.png",
    title: ["Date ideas", "in one tap"],
    subtitle: "Tap the heart. Get your next date cue.",
    background: ["#ff6b86", "#e81550", "#930029"],
    text: "#ffffff",
    subtitleText: "#ffe3ea",
  },
  {
    file: "02-result.png",
    title: ["From idea", "to plan"],
    subtitle: "Prep, budget and steps in seconds.",
    background: ["#fff7ef", "#ffd5df", "#ff5578"],
    text: "#2c1019",
    subtitleText: "#71404c",
  },
  {
    file: "03-filter.png",
    title: ["Pick a vibe,", "then go"],
    subtitle: "Filter by mood, time and budget.",
    background: ["#0c625b", "#123d55", "#35122b"],
    text: "#fff7ef",
    subtitleText: "#ffd6df",
  },
];

const escapeXml = (value) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const backgroundSvg = ({ title, subtitle, background, text, subtitleText }) => `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="${background[0]}"/>
      <stop offset="0.52" stop-color="${background[1]}"/>
      <stop offset="1" stop-color="${background[2]}"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="18%" r="55%">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.24"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
    <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="28" stdDeviation="28" flood-color="#150812" flood-opacity="0.26"/>
    </filter>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#bg)"/>
  <rect width="${width}" height="${height}" fill="url(#glow)"/>
  <circle cx="1090" cy="238" r="118" fill="#ffffff" opacity="0.1"/>
  <circle cx="178" cy="520" r="74" fill="#ffffff" opacity="0.1"/>
  <g font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', Arial, sans-serif" text-anchor="middle">
    <text x="${width / 2}" y="188" fill="${text}" font-size="88" font-weight="900" letter-spacing="0">
      <tspan x="${width / 2}" dy="0">${escapeXml(title[0])}</tspan>
      <tspan x="${width / 2}" dy="104">${escapeXml(title[1])}</tspan>
    </text>
    <text x="${width / 2}" y="444" fill="${subtitleText}" font-size="43" font-weight="700" letter-spacing="0">
      ${escapeXml(subtitle)}
    </text>
  </g>
  <rect x="${phoneLeft}" y="${phoneTop}" width="${phoneWidth}" height="${phoneHeight}" rx="104" fill="#101014" filter="url(#softShadow)"/>
  <rect x="${phoneLeft + 16}" y="${phoneTop + 16}" width="${phoneWidth - 32}" height="${phoneHeight - 32}" rx="88" fill="#1b1b20"/>
  <rect x="${screenLeft}" y="${screenTop}" width="${screenWidth}" height="${screenHeight}" rx="58" fill="#ffffff"/>
</svg>`;

const roundedMask = Buffer.from(`
<svg width="${screenWidth}" height="${screenHeight}" viewBox="0 0 ${screenWidth} ${screenHeight}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${screenWidth}" height="${screenHeight}" rx="58" fill="#fff"/>
</svg>`);

await mkdir(rawDir, { recursive: true });
await mkdir(uploadDir, { recursive: true });

for (const shot of shots) {
  const rawPath = join(rawDir, shot.file);
  const appStorePath = join(appStoreDir, shot.file);

  if (!existsSync(rawPath)) {
    await copyFile(appStorePath, rawPath);
  }

  const screen = await sharp(rawPath)
    .resize(screenWidth, screenHeight, { fit: "fill" })
    .composite([{ input: roundedMask, blend: "dest-in" }])
    .png()
    .toBuffer();

  const composed = await sharp(Buffer.from(backgroundSvg(shot)))
    .composite([{ input: screen, left: screenLeft, top: screenTop }])
    .png({ compressionLevel: 9 })
    .toBuffer();

  await sharp(composed).toFile(appStorePath);
  await sharp(composed).toFile(join(uploadDir, shot.file));
}

console.log(
  JSON.stringify(
    {
      generated: shots.map((shot) => ({
        appStore: join(appStoreDir, shot.file),
        upload: join(uploadDir, shot.file),
      })),
      size: { width, height },
    },
    null,
    2,
  ),
);
