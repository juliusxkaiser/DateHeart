import { defineConfig } from "vite";

function normalizedBasePath() {
  const value = process.env.VITE_BASE_PATH ?? "/";
  if (value === "") return "/";
  return value.endsWith("/") ? value : `${value}/`;
}

export default defineConfig({
  base: normalizedBasePath(),
  build: {
    chunkSizeWarningLimit: 1500,
  },
});
