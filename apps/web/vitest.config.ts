import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@polyand/shared": path.resolve(__dirname, "../../packages/shared/src/index.ts"),
      "@polyand/types": path.resolve(__dirname, "../../packages/types/src/index.ts"),
      "@polyand/ui": path.resolve(__dirname, "../../packages/ui/src/index.ts")
    }
  }
});
