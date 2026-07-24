import { sql, type Kysely } from "kysely";
import type { Database } from "./schema";

export interface GameRow {
  id: string;
  mlbGamePk: number;
  gameDate: string;
  gameDatetime: Date | null;
  abstractGameState: string | null;
  detailedState: string | null;
  awayTeamId: number;
  awayTeamDbId: string;
  awayTeamName: string;
  awayTeamAbbr: string | null;
  homeTeamId: number;
  homeTeamDbId: string;
  homeTeamName: string;
  homeTeamAbbr: string | null;
  venueName: string | null;
  awayProbablePitcherMlbId: number | null;
  homeProbablePitcherMlbId: number | null;
}

function selectGames(db: Kysely<Database>) {
  return db
    .selectFrom("mlb_games as g")
    .innerJoin("mlb_teams as away", "away.id", "g.away_team_id")
    .innerJoin("mlb_teams as home", "home.id", "g.home_team_id")
    .leftJoin("venues as v", "v.id", "g.venue_id")
    .select((eb) => [
      "g.id as id",
      "g.mlb_game_pk as mlbGamePk",
      sql<string>`${eb.ref("g.game_date")}::text`.as("gameDate"),
      "g.game_datetime as gameDatetime",
      "g.abstract_game_state as abstractGameState",
      "g.detailed_state as detailedState",
      "away.mlb_team_id as awayTeamId",
      "away.id as awayTeamDbId",
      "away.name as awayTeamName",
      "away.abbreviation as awayTeamAbbr",
      "home.mlb_team_id as homeTeamId",
      "home.id as homeTeamDbId",
      "home.name as homeTeamName",
      "home.abbreviation as homeTeamAbbr",
      "v.name as venueName",
      "g.away_probable_pitcher_mlb_id as awayProbablePitcherMlbId",
      "g.home_probable_pitcher_mlb_id as homeProbablePitcherMlbId",
    ]);
}

export async function getLatestGameDate(
  db: Kysely<Database>,
): Promise<string | null> {
  const row = await db
    .selectFrom("mlb_games")
    .select(sql<string>`max(game_date)::text`.as("d"))
    .executeTakeFirst();
  return row?.d ?? null;
}

export async function getGamesByDate(
  db: Kysely<Database>,
  date: string,
): Promise<GameRow[]> {
  return selectGames(db)
    .where("g.game_date", "=", date)
    .orderBy("g.game_datetime", "asc")
    .execute();
}

export async function getGameById(
  db: Kysely<Database>,
  id: string,
): Promise<GameRow | undefined> {
  return selectGames(db).where("g.id", "=", id).executeTakeFirst();
}

// ---- players ----

export interface PlayerRow {
  id: string;
  mlbPlayerId: number;
  fullName: string;
  primaryPosition: string | null;
  positionType: string | null;
  role: string;
  bats: string | null;
  throws: string | null;
  birthDate: string | null;
  active: boolean | null;
  teamName: string | null;
  teamDbId: string | null;
}

function selectPlayers(db: Kysely<Database>) {
  return db
    .selectFrom("mlb_players as p")
    .leftJoin("mlb_teams as t", "t.id", "p.current_team_id")
    .select((eb) => [
      "p.id as id",
      "p.mlb_player_id as mlbPlayerId",
      "p.full_name as fullName",
      "p.primary_position as primaryPosition",
      "p.position_type as positionType",
      "p.role as role",
      "p.bats as bats",
      "p.throws as throws",
      sql<string | null>`${eb.ref("p.birth_date")}::text`.as("birthDate"),
      "p.active as active",
      "t.name as teamName",
      "t.id as teamDbId",
    ]);
}

export async function getPlayerById(
  db: Kysely<Database>,
  id: string,
): Promise<PlayerRow | undefined> {
  return selectPlayers(db).where("p.id", "=", id).executeTakeFirst();
}

export async function getPlayerCanonicalIdByMlbId(
  db: Kysely<Database>,
  mlbPlayerId: number,
): Promise<{ id: string; fullName: string } | undefined> {
  return db
    .selectFrom("mlb_players")
    .select(["id", "full_name as fullName"])
    .where("mlb_player_id", "=", mlbPlayerId)
    .executeTakeFirst();
}

export interface RosterPlayer {
  id: string;
  fullName: string;
  role: string;
  primaryPosition: string | null;
  statusDescription: string | null;
}

/** Players on a team's most-recently-observed roster. */
export async function getTeamRoster(
  db: Kysely<Database>,
  teamDbId: string,
): Promise<RosterPlayer[]> {
  return db
    .selectFrom("mlb_roster_memberships as m")
    .innerJoin("mlb_players as p", "p.id", "m.player_id")
    .where("m.team_id", "=", teamDbId)
    .where("m.observed_date", "=", (eb) =>
      eb
        .selectFrom("mlb_roster_memberships as m2")
        .select((e) => e.fn.max("m2.observed_date").as("d"))
        .where("m2.team_id", "=", teamDbId),
    )
    .select([
      "p.id as id",
      "p.full_name as fullName",
      "p.role as role",
      "p.primary_position as primaryPosition",
      "m.status_description as statusDescription",
    ])
    .orderBy("p.full_name", "asc")
    .execute();
}

export interface GameLogRow {
  gameDate: string;
  opponentName: string | null;
  isHome: boolean | null;
  statGroup: string;
  stat: Record<string, unknown>;
}

export async function getRecentGameLogs(
  db: Kysely<Database>,
  playerId: string,
  statGroup: string,
  limit = 15,
): Promise<GameLogRow[]> {
  const rows = await db
    .selectFrom("mlb_player_game_logs")
    .select((eb) => [
      sql<string>`${eb.ref("game_date")}::text`.as("gameDate"),
      "opponent_name as opponentName",
      "is_home as isHome",
      "stat_group as statGroup",
      "stat as stat",
    ])
    .where("player_id", "=", playerId)
    .where("stat_group", "=", statGroup)
    .orderBy("game_date", "desc")
    .limit(limit)
    .execute();
  return rows.map((r) => ({
    ...r,
    stat: (r.stat ?? {}) as Record<string, unknown>,
  }));
}
