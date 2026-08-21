import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// Tauri は dist/index.html を file:// ではなく内部プロトコルで読むが、
// 相対解決に統一しておく方が資産パスの事故が起きない。
export default defineConfig({
  plugins: [react()],
  base: "./",
  clearScreen: false,
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  server: {
    port: 5173,
    strictPort: true,
    watch: { ignored: ["**/src-tauri/**"] },
  },
  build: {
    target: "chrome110",
    minify: "esbuild",
    sourcemap: false,
    chunkSizeWarningLimit: 900,
  },
});
