import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // Server modules import "server-only"; outside Next it would throw.
      "server-only": fileURLToPath(new URL("./src/server/testing/server-only.ts", import.meta.url)),
    },
  },
  test: { include: ["src/**/*.test.ts"] },
});
