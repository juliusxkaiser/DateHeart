import { mkdir } from "node:fs/promises";
import sharp from "sharp";

const heartRenderPath = "public/screenshots/dateheart-cdp-mobile-home.png";
const publicIconDir = "public/icons";
const storeAssetDir = "store/assets";

await mkdir(publicIconDir, { recursive: true });
await mkdir(storeAssetDir, { recursive: true });

async function appIcon(size, output, crop = { left: 80, top: 590, width: 620, height: 620 }) {
  await sharp(heartRenderPath)
    .extract(crop)
    .resize(size, size, { fit: "cover" })
    .png()
    .toFile(output);
}

await Promise.all([
  appIcon(180, "public/apple-touch-icon.png"),
  appIcon(192, `${publicIconDir}/icon-192.png`),
  appIcon(512, `${publicIconDir}/icon-512.png`),
  appIcon(512, `${publicIconDir}/maskable-512.png`, { left: 0, top: 520, width: 780, height: 780 }),
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
const socialHeart = await sharp(heartRenderPath)
  .extract({ left: 80, top: 590, width: 620, height: 620 })
  .resize(330, 330)
  .png()
  .toBuffer();
await sharp(Buffer.from(socialSvg))
  .composite([{ input: socialHeart, top: 150, left: 792 }])
  .png()
  .toFile("public/social-card.png");

console.log("Generated DateHeart launch assets.");
