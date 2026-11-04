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
      // Le icone in public/ finiscono gia' nel precache tramite globPatterns: niente includeAssets
      // e niente icone del manifest aggiunte a parte, altrimenti compaiono due volte in sw.js.
      includeAssets: [],
      includeManifestIcons: false,
      workbox: {
        // Precache di tutto il build: l'app deve funzionare offline dal primo avvio.
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2,wav}"],
        // Roboto Flex porta subset per alfabeti che l'interfaccia italiana non usa:
        // restano fuori dal precache e, se mai servissero, li prende la cache runtime sotto.
        globIgnores: ["**/*-{cyrillic,cyrillic-ext,greek,vietnamese}-*.woff2"],
        navigateFallback: "index.html",
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        runtimeCaching: [
          {
            urlPattern: ({ request, sameOrigin }) => sameOrigin && request.destination === "font",
            handler: "CacheFirst",
            options: { cacheName: "reverseur-font", expiration: { maxEntries: 30 } },
          },
        ],
      },
      manifest: {
        id: "./",
        name: "Reverseur",
        short_name: "Reverseur",
        description: "Gioco della parola al contrario: registra, inverti, indovina.",
        lang: "it",
        dir: "ltr",
        display: "standalone",
        start_url: "./",
        scope: "./",
        categories: ["games", "entertainment"],
        background_color: "#FEF7FF",
        theme_color: "#FEF7FF",
        icons: [
          { src: "icona-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "icona-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "icona-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
          { src: "icona.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
        ],
      },
    }),
  ],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
