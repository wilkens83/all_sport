import { defineConfig } from "vitest/config";

// Unit-test project. Excludes DB integration tests (which require a live
// PostgreSQL) so that `pnpm test` runs pure logic with no external dependency.
export default defineConfig({
  test: {
    include: [
      "packages/**/src/**/*.test.ts",
      "services/**/src/**/*.test.ts",
      "apps/**/src/**/*.test.ts",
    ],
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
      "**/*.integration.test.ts",
    ],
  },
});
