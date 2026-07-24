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
  awayTeamName: string;
  awayTeamAbbr: string | null;
  homeTeamId: number;
  homeTeamName: string;
  homeTeamAbbr: string | null;
  venueName: string | null;
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
      // pg returns SQL `date` as a JS Date; cast to text so it is a plain string.
      sql<string>`${eb.ref("g.game_date")}::text`.as("gameDate"),
      "g.game_datetime as gameDatetime",
      "g.abstract_game_state as abstractGameState",
      "g.detailed_state as detailedState",
      "away.mlb_team_id as awayTeamId",
      "away.name as awayTeamName",
      "away.abbreviation as awayTeamAbbr",
      "home.mlb_team_id as homeTeamId",
      "home.name as homeTeamName",
      "home.abbreviation as homeTeamAbbr",
      "v.name as venueName",
    ]);
}

/** The most recent game_date that actually has games (today, or nearest past). */
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
