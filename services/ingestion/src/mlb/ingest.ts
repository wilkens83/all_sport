import type { Kysely } from "kysely";
import { type Database, sha256Hex, recordObservation } from "@all-sport/db";
import { PlatformError, sanitizeRequestUrl } from "@all-sport/core";
import { fetchSchedule } from "./client";
import { mlbScheduleResponseSchema, type MlbGame } from "./schema";

const ADAPTER_VERSION = "mlb-stats@0.1.0";
const PARSER_VERSION = "mlb-schedule@1";
const SCHEMA_VERSION = "mlb-core@1";
const TRUTH_CLASS = "production_real";

export interface IngestSummary {
  date: string;
  totalGames: number;
  gamesUpserted: number;
  newObservations: number;
  requestStatus: number;
}

async function getOrCreateProvider(db: Kysely<Database>): Promise<string> {
  const inserted = await db
    .insertInto("providers")
    .values({
      slug: "mlb-stats",
      name: "MLB Stats API",
      sport: "mlb",
      default_truth_class: TRUTH_CLASS,
    })
    .onConflict((oc) => oc.column("slug").doNothing())
    .returning("id")
    .executeTakeFirst();
  if (inserted) return inserted.id;
  const existing = await db
    .selectFrom("providers")
    .select("id")
    .where("slug", "=", "mlb-stats")
    .executeTakeFirstOrThrow();
  return existing.id;
}

async function upsertTeam(
  db: Kysely<Database>,
  team: MlbGame["teams"]["away"]["team"],
): Promise<string> {
  const row = await db
    .insertInto("mlb_teams")
    .values({
      mlb_team_id: team.id,
      name: team.name,
      abbreviation: team.abbreviation ?? null,
    })
    .onConflict((oc) =>
      oc.column("mlb_team_id").doUpdateSet({
        name: team.name,
        abbreviation: team.abbreviation ?? null,
      }),
    )
    .returning("id")
    .executeTakeFirstOrThrow();
  return row.id;
}

async function upsertVenue(
  db: Kysely<Database>,
  venue: NonNullable<MlbGame["venue"]>,
): Promise<string> {
  const row = await db
    .insertInto("venues")
    .values({ mlb_venue_id: venue.id, name: venue.name })
    .onConflict((oc) =>
      oc.column("mlb_venue_id").doUpdateSet({ name: venue.name }),
    )
    .returning("id")
    .executeTakeFirstOrThrow();
  return row.id;
}

/** Fetch, validate, and persist the MLB schedule for a date. Idempotent. */
export async function ingestSchedule(
  db: Kysely<Database>,
  date: string,
): Promise<IngestSummary> {
  const providerId = await getOrCreateProvider(db);

  const run = await db
    .insertInto("ingestion_runs")
    .values({
      provider_id: providerId,
      sport: "mlb",
      adapter_version: ADAPTER_VERSION,
      access_mode: "production",
      truth_class: TRUTH_CLASS,
      status: "running",
    })
    .returning("id")
    .executeTakeFirstOrThrow();
  const runId = run.id;

  const fetched = await fetchSchedule(date);
  const parts = sanitizeRequestUrl(fetched.url);
  await db
    .insertInto("provider_requests")
    .values({
      provider_id: providerId,
      ingestion_run_id: runId,
      method: "GET",
      host: parts.host,
      path: parts.path,
      sanitized_query: parts.sanitizedQuery,
      status_code: fetched.status,
      latency_ms: fetched.latencyMs,
      truth_class: TRUTH_CLASS,
      succeeded: fetched.status === 200,
    })
    .execute();

  if (fetched.status !== 200) {
    await finishRun(db, runId, "failed", 0, 0, `HTTP ${fetched.status}`);
    throw new PlatformError({
      code: "PROVIDER_UNAVAILABLE",
      message: `MLB schedule fetch failed: HTTP ${fetched.status}`,
      provider: "mlb-stats",
    });
  }

  const parsed = mlbScheduleResponseSchema.safeParse(JSON.parse(fetched.body));
  if (!parsed.success) {
    await finishRun(db, runId, "failed", 0, 0, "schema mismatch");
    throw new PlatformError({
      code: "PROVIDER_SCHEMA_MISMATCH",
      message: "MLB schedule response did not match the expected schema",
      provider: "mlb-stats",
      context: { issues: parsed.error.issues },
    });
  }

  const games = parsed.data.dates.flatMap((d) => d.games);
  let gamesUpserted = 0;
  let newObservations = 0;

  for (const game of games) {
    const awayId = await upsertTeam(db, game.teams.away.team);
    const homeId = await upsertTeam(db, game.teams.home.team);
    const venueId = game.venue ? await upsertVenue(db, game.venue) : null;
    const season =
      typeof game.season === "string"
        ? Number(game.season)
        : (game.season ?? null);

    const upserted = await db
      .insertInto("mlb_games")
      .values({
        mlb_game_pk: game.gamePk,
        season,
        game_date: game.officialDate,
        game_datetime: new Date(game.gameDate),
        abstract_game_state: game.status.abstractGameState,
        detailed_state: game.status.detailedState,
        coded_game_state: game.status.codedGameState ?? null,
        away_team_id: awayId,
        home_team_id: homeId,
        venue_id: venueId,
      })
      .onConflict((oc) =>
        oc.column("mlb_game_pk").doUpdateSet({
          season,
          game_date: game.officialDate,
          game_datetime: new Date(game.gameDate),
          abstract_game_state: game.status.abstractGameState,
          detailed_state: game.status.detailedState,
          coded_game_state: game.status.codedGameState ?? null,
          away_team_id: awayId,
          home_team_id: homeId,
          venue_id: venueId,
        }),
      )
      .returning("id")
      .executeTakeFirstOrThrow();
    gamesUpserted += 1;

    const observation = await recordObservation(db, {
      providerId,
      ingestionRunId: runId,
      entityType: "mlb_game",
      providerRecordId: String(game.gamePk),
      entityId: upserted.id,
      fetchedAt: new Date(),
      sourceEventTs: new Date(game.gameDate),
      rawResponseHash: sha256Hex(JSON.stringify(game)),
      parserVersion: PARSER_VERSION,
      normalizedSchemaVersion: SCHEMA_VERSION,
      truthClass: TRUTH_CLASS,
    });
    if (observation.inserted) newObservations += 1;
  }

  await finishRun(db, runId, "succeeded", games.length, gamesUpserted, null);

  return {
    date,
    totalGames: parsed.data.totalGames,
    gamesUpserted,
    newObservations,
    requestStatus: fetched.status,
  };
}

async function finishRun(
  db: Kysely<Database>,
  runId: string,
  status: "succeeded" | "failed",
  observed: number,
  normalized: number,
  error: string | null,
): Promise<void> {
  await db
    .updateTable("ingestion_runs")
    .set({
      status,
      finished_at: new Date(),
      request_count: 1,
      records_observed: observed,
      records_normalized: normalized,
      error,
    })
    .where("id", "=", runId)
    .execute();
}
