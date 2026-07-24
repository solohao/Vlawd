import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { copyVadAssets } from "./scripts/copy-vad-assets.js";

copyVadAssets();

export default defineConfig({
  // 相对基路径：打包后主进程用 file:// loadFile 加载 index.html，
  // 必须用相对路径引用 assets，否则 /assets/... 会解析到文件系统根导致白屏。
  base: "./",
  root: resolve(__dirname, "packages/renderer"),
  publicDir: "assets",
  plugins: [react(), tailwindcss()],
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true
  },
  build: {
    outDir: resolve(__dirname, "dist/renderer"),
    emptyOutDir: true
  }
});
