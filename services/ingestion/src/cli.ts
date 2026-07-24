import { migrate, verify } from "@all-sport/db";
import { isPlatformError } from "@all-sport/core";
import { requireDatabaseUrl } from "./config";

/**
 * Minimal ingestion CLI. Phase 1 exposes migration management as idempotent
 * commands (no scheduler yet):
 *   tsx src/cli.ts migrate   # apply pending migrations
 *   tsx src/cli.ts verify    # assert the expected schema exists
 */
async function main(): Promise<void> {
  const command = process.argv[2];
  const databaseUrl = requireDatabaseUrl();

  switch (command) {
    case "migrate": {
      const result = await migrate(databaseUrl);
      process.stdout.write(
        JSON.stringify({ command: "migrate", ...result }, null, 2) + "\n",
      );
      return;
    }
    case "verify": {
      const result = await verify(databaseUrl);
      process.stdout.write(
        JSON.stringify({ command: "verify", ...result }, null, 2) + "\n",
      );
      return;
    }
    default: {
      process.stderr.write(
        `Unknown command: ${command ?? "(none)"}. Use "migrate" or "verify".\n`,
      );
      process.exitCode = 2;
      return;
    }
  }
}

main().catch((error: unknown) => {
  if (isPlatformError(error)) {
    process.stderr.write(`[${error.code}] ${error.message}\n`);
  } else {
    process.stderr.write(String(error) + "\n");
  }
  process.exitCode = 1;
});
