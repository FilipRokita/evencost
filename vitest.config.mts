import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    // The integration tests talk to the local Postgres, so the app's .env has to
    // be loaded before any module reads DATABASE_URL.
    setupFiles: ["./vitest.setup.ts"],
  },
});
