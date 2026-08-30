import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL(".", import.meta.url)) },
  },
  test: {
    include: ["app/**/*.test.ts", "lib/**/*.test.ts", "modules/**/*.test.ts", "tests/**/*.test.ts"],
    exclude: ["node_modules/**", "work/**", "outputs/**"],
  },
});
