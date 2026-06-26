import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["packages/main/src/tests/**/*.test.ts", "packages/renderer/src/tests/**/*.test.ts"],
    environment: "node"
  }
});
