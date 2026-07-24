import { migrate, verify, createDb, closeDb } from "@all-sport/db";
import { isPlatformError } from "@all-sport/core";
import { requireDatabaseUrl } from "./config";
import { ingestSchedule } from "./mlb/ingest";

/**
 * Ingestion CLI.
 *   tsx src/cli.ts migrate            # apply pending migrations
 *   tsx src/cli.ts verify             # assert the expected schema exists
 *   tsx src/cli.ts ingest:mlb [date]  # ingest MLB schedule (default: today UTC)
 */
async function main(): Promise<void> {
  const command = process.argv[2];
  const databaseUrl = requireDatabaseUrl();

  switch (command) {
    case "migrate": {
      const result = await migrate(databaseUrl);
      out({ command, ...result });
      return;
    }
    case "verify": {
      const result = await verify(databaseUrl);
      out({ command, ...result });
      return;
    }
    case "ingest:mlb": {
      const date = process.argv[3] ?? new Date().toISOString().slice(0, 10);
      const db = createDb(databaseUrl);
      try {
        const summary = await ingestSchedule(db, date);
        out({ command, ...summary });
      } finally {
        await closeDb(db);
      }
      return;
    }
    default: {
      process.stderr.write(
        `Unknown command: ${command ?? "(none)"}. Use "migrate", "verify", or "ingest:mlb".\n`,
      );
      process.exitCode = 2;
      return;
    }
  }
}

function out(value: unknown): void {
  process.stdout.write(JSON.stringify(value, null, 2) + "\n");
}

main().catch((error: unknown) => {
  if (isPlatformError(error)) {
    process.stderr.write(`[${error.code}] ${error.message}\n`);
  } else {
    process.stderr.write(String(error) + "\n");
  }
  process.exitCode = 1;
});
