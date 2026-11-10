import path from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export default defineConfig({
  root,
  publicDir: false,
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": path.join(root, "src") } },
  base: "./",
  build: {
    outDir: path.join(root, "android/.www"),
    emptyOutDir: true,
    sourcemap: false,
    target: "chrome89",
    rollupOptions: {
      input: path.join(root, "android/index.html"),
    },
  },
});
