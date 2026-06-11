import { mkdir } from "node:fs/promises";
import sharp from "sharp";

await mkdir("resources", { recursive: true });

await sharp("store/assets/app-icon-1024.png")
  .resize(1024, 1024, { fit: "cover" })
  .flatten({ background: "#c90432" })
  .removeAlpha()
  .png()
  .toFile("resources/icon.png");

await sharp({
  create: {
    width: 2732,
    height: 2732,
    channels: 4,
    background: "#c90432",
  },
})
  .composite([
    {
      input: await sharp("store/assets/app-icon-1024.png").resize(980, 980).png().toBuffer(),
      gravity: "center",
    },
  ])
  .png()
  .toFile("resources/splash.png");

console.log("Prepared DateHeart native icon and splash assets.");
