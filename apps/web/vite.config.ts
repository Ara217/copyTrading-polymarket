import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@polyand/shared": path.resolve(__dirname, "../../packages/shared/src/index.ts"),
      "@polyand/types": path.resolve(__dirname, "../../packages/types/src/index.ts")
    }
  },
  build: {
    outDir: "dist",
    emptyOutDir: true
  }
});
