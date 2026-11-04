import { defineConfig } from "vitest/config";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { VitePWA } from "vite-plugin-pwa";

// GitHub Pages: /reverseur/ (default). Dominio proprio: BASE_PATH=/
const base = process.env.BASE_PATH ?? "/reverseur/";

export default defineConfig({
  base,
  plugins: [
    svelte(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icona.svg", "apple-touch-icon.png"],
      workbox: { globPatterns: ["**/*.{js,css,html,svg,png,json,ico,woff2}"] },
      manifest: {
        name: "Reverseur",
        short_name: "Reverseur",
        description: "Gioco della parola al contrario: registra, inverti, indovina.",
        lang: "it",
        display: "standalone",
        start_url: "./",
        scope: "./",
        background_color: "#FEF7FF",
        theme_color: "#FEF7FF",
        icons: [
          { src: "icona-192.png", sizes: "192x192", type: "image/png" },
          { src: "icona-512.png", sizes: "512x512", type: "image/png" },
          { src: "icona-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
    }),
  ],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
