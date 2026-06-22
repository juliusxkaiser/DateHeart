import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.czarletsgo.dateheart",
  appName: "DateHeart",
  webDir: "dist",
  bundledWebRuntime: false,
  server: {
    androidScheme: "https",
  },
  plugins: {
    // Android 15+ erzwingt Edge-to-Edge (targetSdk 36). insetsHandling:"css"
    // injiziert --safe-area-inset-* in die WebView, damit das vorhandene
    // env(safe-area-inset-*)-CSS auch auf Android-15-WebViews korrekte Werte
    // bekommt (sonst 0 → Content unter Status-/Navbar). style:DARK = dunkle
    // Icons auf hellem App-Hintergrund.
    SystemBars: {
      insetsHandling: "css",
      style: "DARK",
    },
  },
};

export default config;
