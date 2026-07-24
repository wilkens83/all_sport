import { defineConfig } from "vitest/config";

// Integration-test project. Runs ONLY *.integration.test.ts, which require a
// live PostgreSQL reachable at DATABASE_URL. `passWithNoTests: false` means the
// command FAILS if no integration test is discovered — so CI can never be green
// merely because these tests were skipped or filtered away.
export default defineConfig({
  test: {
    include: [
      "packages/**/src/**/*.integration.test.ts",
      "services/**/src/**/*.integration.test.ts",
      "apps/**/src/**/*.integration.test.ts",
    ],
    exclude: ["**/node_modules/**", "**/dist/**", "**/.next/**"],
    passWithNoTests: false,
    // Migrations + inserts run serially against one database.
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
