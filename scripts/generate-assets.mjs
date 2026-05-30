import { mkdir } from "node:fs/promises";
import sharp from "sharp";

const iconSvgPath = "public/icon.svg";
const publicIconDir = "public/icons";
const storeAssetDir = "store/assets";

await mkdir(publicIconDir, { recursive: true });
await mkdir(storeAssetDir, { recursive: true });

const backgroundSvg = (size) => `
  <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="${size}" y2="${size}">
        <stop stop-color="#ff7f8b"/>
        <stop offset=".45" stop-color="#e80b3d"/>
        <stop offset="1" stop-color="#850825"/>
      </linearGradient>
      <radialGradient id="glow" cx="35%" cy="24%" r="70%">
        <stop stop-color="#fff3f5" stop-opacity=".55"/>
        <stop offset=".35" stop-color="#ffc1cb" stop-opacity=".24"/>
        <stop offset="1" stop-color="#ffc1cb" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="${size}" height="${size}" rx="${Math.round(size * 0.22)}" fill="url(#bg)"/>
    <circle cx="${size * 0.34}" cy="${size * 0.25}" r="${size * 0.38}" fill="url(#glow)"/>
  </svg>
`;

async function appIcon(size, output, iconScale = 0.76) {
  const iconSize = Math.round(size * iconScale);
  const offset = Math.round((size - iconSize) / 2);
  const icon = await sharp(iconSvgPath).resize(iconSize, iconSize).png().toBuffer();

  await sharp(Buffer.from(backgroundSvg(size)))
    .composite([{ input: icon, top: offset, left: offset }])
    .png()
    .toFile(output);
}

await Promise.all([
  appIcon(180, "public/apple-touch-icon.png"),
  appIcon(192, `${publicIconDir}/icon-192.png`),
  appIcon(512, `${publicIconDir}/icon-512.png`),
  appIcon(512, `${publicIconDir}/maskable-512.png`, 0.62),
  appIcon(1024, `${storeAssetDir}/app-icon-1024.png`),
]);

const socialSvg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1200" y2="630">
        <stop stop-color="#ff8d98"/>
        <stop offset=".48" stop-color="#df0b3b"/>
        <stop offset="1" stop-color="#760822"/>
      </linearGradient>
      <radialGradient id="glow" cx="35%" cy="30%" r="60%">
        <stop stop-color="#fff4f5" stop-opacity=".62"/>
        <stop offset=".32" stop-color="#ffc3cc" stop-opacity=".25"/>
        <stop offset="1" stop-color="#ffc3cc" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="1200" height="630" fill="url(#bg)"/>
    <circle cx="390" cy="210" r="330" fill="url(#glow)"/>
    <text x="86" y="145" fill="#fff7f8" font-size="42" font-family="Arial, sans-serif" font-weight="800">DateHeart</text>
    <text x="86" y="268" fill="#ffffff" font-size="78" font-family="Arial, sans-serif" font-weight="900">One tap.</text>
    <text x="86" y="354" fill="#ffffff" font-size="78" font-family="Arial, sans-serif" font-weight="900">A real date plan.</text>
    <text x="90" y="436" fill="#ffe5e9" font-size="30" font-family="Arial, sans-serif" font-weight="700">35,002 localized ideas per verified language</text>
  </svg>
`;
const socialHeart = await sharp(iconSvgPath).resize(330, 330).png().toBuffer();
await sharp(Buffer.from(socialSvg))
  .composite([{ input: socialHeart, top: 150, left: 792 }])
  .png()
  .toFile("public/social-card.png");

console.log("Generated DateHeart launch assets.");
