import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

const proxyTarget = process.env.VITE_API_PROXY_TARGET ?? "http://localhost:8000";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src")
    }
  },
  server: {
    port: 5173,
    proxy: {
      "/api": proxyTarget,
      "/health": proxyTarget
    }
  }
});
