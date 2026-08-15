import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["__tests__/**/*.test.ts"],
    env: {
      JWT_ACCESS_SECRET: "test_access_secret_key_minimum_32_characters_long_for_security",
      JWT_REFRESH_SECRET: "test_refresh_secret_key_minimum_32_characters_long_for_security",
      NODE_ENV: "test",
    },
    coverage: {
      provider: "v8",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
