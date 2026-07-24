import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { mlbScheduleResponseSchema } from "./schema";

// A trimmed but REAL MLB Stats API /schedule response (2026 season).
const fixture = JSON.parse(
  readFileSync(
    fileURLToPath(
      new URL("./__fixtures__/schedule.sample.json", import.meta.url),
    ),
    "utf8",
  ),
) as unknown;

describe("MLB schedule contract", () => {
  it("parses a real schedule response", () => {
    const parsed = mlbScheduleResponseSchema.parse(fixture);
    expect(parsed.dates[0]!.games.length).toBeGreaterThan(0);
    const g = parsed.dates[0]!.games[0]!;
    expect(typeof g.gamePk).toBe("number");
    expect(g.teams.away.team.name).toBeTruthy();
    expect(g.teams.home.team.name).toBeTruthy();
    expect(g.status.detailedState).toBeTruthy();
  });

  it("rejects a malformed response (missing teams)", () => {
    const bad = {
      totalGames: 1,
      dates: [{ date: "2026-07-24", games: [{ gamePk: 1 }] }],
    };
    expect(mlbScheduleResponseSchema.safeParse(bad).success).toBe(false);
  });
});
