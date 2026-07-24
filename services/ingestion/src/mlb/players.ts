import { z } from "zod";
import { sql, type Kysely } from "kysely";
import {
  type Database,
  sha256Hex,
  recordObservation,
  getTeamRoster,
} from "@all-sport/db";
import { PlatformError, sanitizeRequestUrl } from "@all-sport/core";
import { MLB_STATS_API_BASE } from "./client";
import { getOrCreateProvider } from "./ingest";

const ADAPTER_VERSION = "mlb-stats@0.1.0";
const TRUTH_CLASS = "production_real";

// ---- schemas ----

const rosterResponseSchema = z.object({
  roster: z.array(
    z.object({
      person: z.object({ id: z.number(), fullName: z.string() }),
      position: z
        .object({
          abbreviation: z.string().nullish(),
          type: z.string().nullish(),
        })
        .nullish(),
      status: z
        .object({
          code: z.string().nullish(),
          description: z.string().nullish(),
        })
        .nullish(),
    }),
  ),
});

const peopleResponseSchema = z.object({
  people: z.array(
    z.object({
      id: z.number(),
      fullName: z.string(),
      firstName: z.string().nullish(),
      lastName: z.string().nullish(),
      birthDate: z.string().nullish(),
      active: z.boolean().nullish(),
      primaryPosition: z
        .object({
          abbreviation: z.string().nullish(),
          type: z.string().nullish(),
        })
        .nullish(),
      batSide: z.object({ code: z.string().nullish() }).nullish(),
      pitchHand: z.object({ code: z.string().nullish() }).nullish(),
    }),
  ),
});

const gameLogSplitSchema = z.object({
  season: z.string().nullish(),
  date: z.string(),
  isHome: z.boolean().nullish(),
  opponent: z.object({ name: z.string().nullish() }).nullish(),
  game: z.object({ gamePk: z.number().nullish() }).nullish(),
  stat: z.record(z.string(), z.unknown()),
});
const gameLogResponseSchema = z.object({
  stats: z
    .array(z.object({ splits: z.array(gameLogSplitSchema).default([]) }))
    .default([]),
});

// ---- fetch ----

interface Fetched {
  url: string;
  status: number;
  body: string;
  latencyMs: number;
}
async function get(url: string): Promise<Fetched> {
  const start = Date.now();
  const res = await fetch(url);
  const body = await res.text();
  return { url, status: res.status, body, latencyMs: Date.now() - start };
}

export function deriveRole(positionType: string | null | undefined): string {
  if (!positionType) return "unknown";
  if (positionType === "Pitcher") return "pitcher";
  if (positionType === "Two-Way Player") return "two_way";
  return "hitter";
}

async function newRun(
  db: Kysely<Database>,
  providerId: string,
): Promise<string> {
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
  return run.id;
}

async function recordRequest(
  db: Kysely<Database>,
  providerId: string,
  runId: string,
  fetched: Fetched,
): Promise<void> {
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
}

export interface RosterIngestSummary {
  teamMlbId: number;
  rosterSize: number;
  playersUpserted: number;
  newPlayers: number;
  membershipsUpserted: number;
}

/** Fetch a team roster + full player metadata; persist canonical players + memberships. */
export async function ingestTeamRoster(
  db: Kysely<Database>,
  teamMlbId: number,
  observedDate: string,
): Promise<RosterIngestSummary> {
  const providerId = await getOrCreateProvider(db);
  const runId = await newRun(db, providerId);

  const team = await db
    .selectFrom("mlb_teams")
    .select("id")
    .where("mlb_team_id", "=", teamMlbId)
    .executeTakeFirst();
  if (!team) {
    throw new PlatformError({
      code: "DATA_INVALID",
      message: `Team ${teamMlbId} not found; ingest the schedule first`,
    });
  }

  const rosterFetch = await get(
    `${MLB_STATS_API_BASE}/v1/teams/${teamMlbId}/roster?rosterType=active`,
  );
  await recordRequest(db, providerId, runId, rosterFetch);
  const roster = rosterResponseSchema.parse(JSON.parse(rosterFetch.body));
  const ids = roster.roster.map((r) => r.person.id);

  // Full player metadata (batched).
  const peopleFetch = await get(
    `${MLB_STATS_API_BASE}/v1/people?personIds=${ids.join(",")}`,
  );
  await recordRequest(db, providerId, runId, peopleFetch);
  const people = peopleResponseSchema.parse(JSON.parse(peopleFetch.body));
  const byId = new Map(people.people.map((p) => [p.id, p]));

  let playersUpserted = 0;
  let newPlayers = 0;
  let membershipsUpserted = 0;
  const now = new Date();

  for (const entry of roster.roster) {
    const p = byId.get(entry.person.id);
    const positionType =
      p?.primaryPosition?.type ?? entry.position?.type ?? null;
    const values = {
      mlb_player_id: entry.person.id,
      full_name: p?.fullName ?? entry.person.fullName,
      first_name: p?.firstName ?? null,
      last_name: p?.lastName ?? null,
      primary_position:
        p?.primaryPosition?.abbreviation ??
        entry.position?.abbreviation ??
        null,
      position_type: positionType,
      role: deriveRole(positionType),
      bats: p?.batSide?.code ?? null,
      throws: p?.pitchHand?.code ?? null,
      birth_date: p?.birthDate ?? null,
      current_team_id: team.id,
      active: p?.active ?? null,
      provider_updated_at: now,
    };
    const playerRow = await db
      .insertInto("mlb_players")
      .values(values)
      .onConflict((oc) => oc.column("mlb_player_id").doUpdateSet(values))
      .returning("id")
      .executeTakeFirstOrThrow();
    playersUpserted += 1;

    const obs = await recordObservation(db, {
      providerId,
      ingestionRunId: runId,
      entityType: "mlb_player",
      providerRecordId: String(entry.person.id),
      entityId: playerRow.id,
      fetchedAt: now,
      rawResponseHash: sha256Hex(JSON.stringify(p ?? entry)),
      parserVersion: "mlb-people@1",
      normalizedSchemaVersion: "mlb-player@1",
      truthClass: TRUTH_CLASS,
    });
    if (obs.inserted) newPlayers += 1;

    const membership = {
      team_id: team.id,
      player_id: playerRow.id,
      roster_type: "active",
      status_code: entry.status?.code ?? null,
      status_description: entry.status?.description ?? null,
      observed_date: observedDate,
    };
    await db
      .insertInto("mlb_roster_memberships")
      .values(membership)
      .onConflict((oc) =>
        oc
          .columns(["team_id", "player_id", "roster_type", "observed_date"])
          .doUpdateSet({
            status_code: membership.status_code,
            status_description: membership.status_description,
          }),
      )
      .execute();
    membershipsUpserted += 1;
  }

  await db
    .updateTable("ingestion_runs")
    .set({
      status: "succeeded",
      finished_at: new Date(),
      request_count: 2,
      records_observed: roster.roster.length,
      records_normalized: playersUpserted,
    })
    .where("id", "=", runId)
    .execute();

  return {
    teamMlbId,
    rosterSize: roster.roster.length,
    playersUpserted,
    newPlayers,
    membershipsUpserted,
  };
}

export interface GameLogIngestSummary {
  teamMlbId: number;
  season: number;
  players: number;
  logsUpserted: number;
  newLogs: number;
}

/** Ingest recent game logs for every player on a team's latest roster. */
export async function ingestTeamGameLogs(
  db: Kysely<Database>,
  teamMlbId: number,
  season: number,
): Promise<GameLogIngestSummary> {
  const providerId = await getOrCreateProvider(db);
  const runId = await newRun(db, providerId);

  const team = await db
    .selectFrom("mlb_teams")
    .select("id")
    .where("mlb_team_id", "=", teamMlbId)
    .executeTakeFirstOrThrow();
  const players = await getTeamRoster(db, team.id);
  const playerMlbIds = await db
    .selectFrom("mlb_players")
    .select(["id", "mlb_player_id"])
    .where(
      "id",
      "in",
      players.map((p) => p.id),
    )
    .execute();
  const mlbIdById = new Map(playerMlbIds.map((r) => [r.id, r.mlb_player_id]));

  let logsUpserted = 0;
  let newLogs = 0;
  let requestCount = 0;

  for (const player of players) {
    const groups =
      player.role === "pitcher"
        ? ["pitching"]
        : player.role === "two_way"
          ? ["hitting", "pitching"]
          : ["hitting"];
    const mlbId = mlbIdById.get(player.id);
    if (mlbId === undefined) continue;

    for (const group of groups) {
      const fetched = await get(
        `${MLB_STATS_API_BASE}/v1/people/${mlbId}/stats?stats=gameLog&group=${group}&season=${season}`,
      );
      requestCount += 1;
      await recordRequest(db, providerId, runId, fetched);
      if (fetched.status !== 200) continue;
      const parsed = gameLogResponseSchema.parse(JSON.parse(fetched.body));
      const splits = parsed.stats[0]?.splits ?? [];
      for (const s of splits) {
        const values = {
          player_id: player.id,
          stat_group: group,
          game_date: s.date,
          mlb_game_pk: s.game?.gamePk ?? null,
          opponent_name: s.opponent?.name ?? null,
          is_home: s.isHome ?? null,
          season,
          stat: JSON.stringify(s.stat),
        };
        const res = await db
          .insertInto("mlb_player_game_logs")
          .values(values)
          .onConflict((oc) =>
            oc
              .columns(["player_id", "stat_group", "game_date", "mlb_game_pk"])
              .doUpdateSet({
                opponent_name: values.opponent_name,
                is_home: values.is_home,
                season,
                stat: values.stat,
              }),
          )
          .returning(sql<boolean>`(xmax = 0)`.as("inserted"))
          .executeTakeFirst();
        logsUpserted += 1;
        if (res?.inserted) newLogs += 1;
      }
    }
  }

  await db
    .updateTable("ingestion_runs")
    .set({
      status: "succeeded",
      finished_at: new Date(),
      request_count: requestCount,
      records_observed: logsUpserted,
      records_normalized: logsUpserted,
    })
    .where("id", "=", runId)
    .execute();

  return { teamMlbId, season, players: players.length, logsUpserted, newLogs };
}
