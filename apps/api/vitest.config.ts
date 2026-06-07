import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node"
  },
  resolve: {
    alias: {
      "@polyand/shared": path.resolve(__dirname, "../../packages/shared/src/index.ts"),
      "@polyand/types": path.resolve(__dirname, "../../packages/types/src/index.ts"),
      "@polyand/analytics": path.resolve(__dirname, "../../packages/analytics/src/index.ts")
    }
  }
});

