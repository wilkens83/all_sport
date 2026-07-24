import {
  migrate,
  verify,
  createDb,
  closeDb,
  getLatestGameDate,
  getGamesByDate,
} from "@all-sport/db";
import { isPlatformError } from "@all-sport/core";
import { requireDatabaseUrl } from "./config";
import { ingestSchedule } from "./mlb/ingest";
import { ingestTeamRoster, ingestTeamGameLogs } from "./mlb/players";

/**
 * Ingestion CLI.
 *   migrate                          apply pending migrations
 *   verify                           assert the expected schema exists
 *   ingest:mlb [date]                MLB schedule (default: today UTC)
 *   ingest:mlb-rosters [date]        rosters + players for that date's games
 *   ingest:mlb-gamelogs <teamId> [season]   recent game logs for a team's roster
 */
async function main(): Promise<void> {
  const command = process.argv[2];
  const databaseUrl = requireDatabaseUrl();

  switch (command) {
    case "migrate":
      out({ command, ...(await migrate(databaseUrl)) });
      return;
    case "verify":
      out({ command, ...(await verify(databaseUrl)) });
      return;
    case "ingest:mlb": {
      const date = process.argv[3] ?? today();
      await withDb(databaseUrl, async (db) =>
        out({ command, ...(await ingestSchedule(db, date)) }),
      );
      return;
    }
    case "ingest:mlb-rosters": {
      await withDb(databaseUrl, async (db) => {
        const date =
          process.argv[3] ?? (await getLatestGameDate(db)) ?? today();
        const games = await getGamesByDate(db, date);
        const teamIds = [
          ...new Set(games.flatMap((g) => [g.awayTeamId, g.homeTeamId])),
        ];
        const results = [];
        for (const teamId of teamIds) {
          results.push(await ingestTeamRoster(db, teamId, date));
        }
        const totals = results.reduce(
          (a, r) => ({
            players: a.players + r.playersUpserted,
            newPlayers: a.newPlayers + r.newPlayers,
          }),
          { players: 0, newPlayers: 0 },
        );
        out({ command, date, teams: teamIds.length, ...totals });
      });
      return;
    }
    case "ingest:mlb-gamelogs": {
      const teamId = Number(process.argv[3]);
      const season = Number(process.argv[4] ?? new Date().getUTCFullYear());
      if (!Number.isFinite(teamId)) {
        process.stderr.write(
          "Usage: ingest:mlb-gamelogs <teamMlbId> [season]\n",
        );
        process.exitCode = 2;
        return;
      }
      await withDb(databaseUrl, async (db) =>
        out({ command, ...(await ingestTeamGameLogs(db, teamId, season)) }),
      );
      return;
    }
    default:
      process.stderr.write(`Unknown command: ${command ?? "(none)"}.\n`);
      process.exitCode = 2;
  }
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

async function withDb(
  url: string,
  fn: (db: ReturnType<typeof createDb>) => Promise<void>,
): Promise<void> {
  const db = createDb(url);
  try {
    await fn(db);
  } finally {
    await closeDb(db);
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
