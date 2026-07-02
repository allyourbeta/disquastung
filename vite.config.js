import { resolve } from "node:path";
import { defineConfig } from "vite";

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
});
