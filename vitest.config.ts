import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["modules/**/*.test.ts", "tests/**/*.test.ts"],
    exclude: ["node_modules/**", "work/**", "outputs/**"],
  },
});
