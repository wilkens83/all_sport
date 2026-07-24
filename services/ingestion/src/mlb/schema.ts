import { z } from "zod";

/**
 * Runtime contract for the subset of the MLB Stats API `/schedule` response we
 * consume. Validated at the ingestion boundary; unexpected shapes are rejected
 * rather than silently normalized. Verified against a real 2026 response.
 */
export const mlbTeamRefSchema = z.object({
  id: z.number(),
  name: z.string(),
  abbreviation: z.string().nullish(),
});

export const mlbGameSchema = z.object({
  gamePk: z.number(),
  officialDate: z.string(),
  gameDate: z.string(),
  season: z.union([z.number(), z.string()]).nullish(),
  status: z.object({
    abstractGameState: z.string(),
    detailedState: z.string(),
    codedGameState: z.string().nullish(),
  }),
  teams: z.object({
    away: z.object({
      team: mlbTeamRefSchema,
      probablePitcher: z.object({ id: z.number() }).nullish(),
    }),
    home: z.object({
      team: mlbTeamRefSchema,
      probablePitcher: z.object({ id: z.number() }).nullish(),
    }),
  }),
  venue: z.object({ id: z.number(), name: z.string() }).nullish(),
});

export const mlbScheduleResponseSchema = z.object({
  totalGames: z.number(),
  dates: z.array(
    z.object({
      date: z.string(),
      games: z.array(mlbGameSchema),
    }),
  ),
});

export type MlbGame = z.infer<typeof mlbGameSchema>;
export type MlbScheduleResponse = z.infer<typeof mlbScheduleResponseSchema>;
