import { defineConfig, devices } from "@playwright/test";
import { fileURLToPath } from "node:url";

// Il microfono finto di Chromium riproduce in loop tests/fixtures/word.wav.
const FAKE_WAV = fileURLToPath(new URL("./tests/fixtures/word.wav", import.meta.url));
const PORT = 4173;

const chromiumArgs = [
  "--use-fake-ui-for-media-stream",
  "--use-fake-device-for-media-stream",
  `--use-file-for-fake-audio-capture=${FAKE_WAV}`,
  "--autoplay-policy=no-user-gesture-required",
];

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    // Stessa sotto-cartella di GitHub Pages: un percorso assoluto si rompe anche qui.
    baseURL: `http://localhost:${PORT}/reverseur/`,
    trace: "retain-on-failure",
  },
  webServer: {
    command: `npx vite build && npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/reverseur/`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], permissions: ["microphone"], launchOptions: { args: chromiumArgs } },
    },
    {
      name: "mobile-chromium",
      use: { ...devices["Pixel 7"], permissions: ["microphone"], launchOptions: { args: chromiumArgs } },
    },
  ],
});
