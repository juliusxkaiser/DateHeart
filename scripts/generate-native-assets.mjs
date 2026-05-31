#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import sharp from "sharp";

const iconSource = "resources/icon.png";
const splashSource = "resources/splash.png";
const darkSplashSource = "resources/splash-dark.png";
const lightBackground = "#c90432";
const darkBackground = "#7a001c";

const androidIconSizes = {
  ldpi: 36,
  mdpi: 48,
  hdpi: 72,
  xhdpi: 96,
  xxhdpi: 144,
  xxxhdpi: 192,
};

const androidSplashSizes = {
  "drawable": [320, 480],
  "drawable-land-ldpi": [320, 240],
  "drawable-land-mdpi": [480, 320],
  "drawable-land-hdpi": [800, 480],
  "drawable-land-xhdpi": [1280, 720],
  "drawable-land-xxhdpi": [1600, 960],
  "drawable-land-xxxhdpi": [1920, 1280],
  "drawable-port-ldpi": [240, 320],
  "drawable-port-mdpi": [320, 480],
  "drawable-port-hdpi": [480, 800],
  "drawable-port-xhdpi": [720, 1280],
  "drawable-port-xxhdpi": [960, 1600],
  "drawable-port-xxxhdpi": [1280, 1920],
};

async function ensureParent(file) {
  await mkdir(dirname(file), { recursive: true });
}

async function writePng(file, image) {
  await ensureParent(file);
  await image.png().toFile(file);
}

function solidSquare(size, color) {
  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: color,
    },
  });
}

async function maskedRoundIcon(size) {
  const mask = await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: "#00000000",
    },
  })
    .composite([
      {
        input: Buffer.from(
          `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#fff"/></svg>`,
        ),
      },
    ])
    .png()
    .toBuffer();

  return sharp(iconSource)
    .resize(size, size, { fit: "cover" })
    .composite([{ input: mask, blend: "dest-in" }]);
}

async function createDarkSplashSource() {
  await writePng(
    darkSplashSource,
    sharp({
      create: {
        width: 2732,
        height: 2732,
        channels: 4,
        background: darkBackground,
      },
    }).composite([
      {
        input: await sharp(iconSource).resize(980, 980).png().toBuffer(),
        gravity: "center",
      },
    ]),
  );
}

async function writeAdaptiveIconXml(file) {
  await ensureParent(file);
  await writeFile(
    file,
    `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background>
        <inset android:drawable="@mipmap/ic_launcher_background" android:inset="16.7%" />
    </background>
    <foreground>
        <inset android:drawable="@mipmap/ic_launcher_foreground" android:inset="16.7%" />
    </foreground>
</adaptive-icon>
`,
  );
}

async function generateAndroidIcons() {
  for (const [density, iconSize] of Object.entries(androidIconSizes)) {
    const foregroundSize = Math.round(iconSize * 2.25);
    const directory = `android/app/src/main/res/mipmap-${density}`;

    await writePng(`${directory}/ic_launcher.png`, sharp(iconSource).resize(iconSize, iconSize, { fit: "cover" }));
    await writePng(`${directory}/ic_launcher_round.png`, await maskedRoundIcon(iconSize));
    await writePng(`${directory}/ic_launcher_foreground.png`, sharp(iconSource).resize(foregroundSize, foregroundSize, { fit: "cover" }));
    await writePng(`${directory}/ic_launcher_background.png`, solidSquare(foregroundSize, lightBackground));
  }

  await writeAdaptiveIconXml("android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml");
  await writeAdaptiveIconXml("android/app/src/main/res/mipmap-anydpi-v26/ic_launcher_round.xml");
}

async function generateAndroidSplashes() {
  for (const [directory, [width, height]] of Object.entries(androidSplashSizes)) {
    await writePng(
      `android/app/src/main/res/${directory}/splash.png`,
      sharp(splashSource).resize(width, height, { fit: "cover" }),
    );

    const nightDirectory = directory.startsWith("drawable-land")
      ? directory.replace("drawable-land", "drawable-land-night")
      : directory.startsWith("drawable-port")
        ? directory.replace("drawable-port", "drawable-port-night")
        : directory.replace("drawable", "drawable-night");

    await writePng(
      `android/app/src/main/res/${nightDirectory}/splash.png`,
      sharp(darkSplashSource).resize(width, height, { fit: "cover" }),
    );
  }
}

async function generateIosAssets() {
  await writePng(
    "ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png",
    sharp(iconSource).resize(1024, 1024, { fit: "cover" }),
  );

  for (const scale of ["1x", "2x", "3x"]) {
    await writePng(
      `ios/App/App/Assets.xcassets/Splash.imageset/Default@${scale}~universal~anyany.png`,
      sharp(splashSource).resize(2732, 2732, { fit: "cover" }),
    );
    await writePng(
      `ios/App/App/Assets.xcassets/Splash.imageset/Default@${scale}~universal~anyany-dark.png`,
      sharp(darkSplashSource).resize(2732, 2732, { fit: "cover" }),
    );
  }
}

await createDarkSplashSource();
await generateAndroidIcons();
await generateAndroidSplashes();
await generateIosAssets();

console.log("Generated DateHeart native icon and splash assets.");
