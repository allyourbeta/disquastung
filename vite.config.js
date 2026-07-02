import { resolve } from "node:path";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, "index.html"),
        color: resolve(__dirname, "color.html"),
        knight: resolve(__dirname, "knight.html"),
        bishop: resolve(__dirname, "bishop.html"),
      },
    },
  },
  plugins: [
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/*.png"],
      manifest: {
        name: "Disquastung",
        short_name: "Disquastung",
        description: "Chess visualization / blindfold training drills",
        display: "standalone",
        theme_color: "#d4af37", // --accent-gold
        background_color: "#1a1a1a", // --primary-dark
        start_url: "/",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
        ],
      },
      workbox: {
        // Precache the app shell AND all 64 square clips up front (m4a
        // added alongside the usual web-app extensions) so every drill,
        // including Speak, works fully offline after the first load. A few
        // MB of precache is acceptable (spec 6.2).
        globPatterns: ["**/*.{js,css,html,png,ico,svg,m4a}"],
      },
    }),
  ],
});
