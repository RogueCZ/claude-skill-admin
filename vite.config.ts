import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: { outDir: "dist/public", emptyOutDir: true },
  server: {
    port: 7843,
    proxy: { "/api": "http://127.0.0.1:7842" },
  },
});
