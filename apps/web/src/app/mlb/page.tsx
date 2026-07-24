import type { ReactNode } from "react";
import { getGamesByDate, getLatestGameDate } from "@all-sport/db";
import { getDb } from "../../lib/db";
import { formatUtcTime, todayUtc } from "../../lib/format";
import { TopNav } from "../../components/TopNav";
import {
  DataStateBadge,
  type DataStateLabel,
} from "../../components/DataStateBadge";

export const dynamic = "force-dynamic";

export default async function MlbPage(): Promise<ReactNode> {
  const db = getDb();
  const date = await getLatestGameDate(db);
  const games = date ? await getGamesByDate(db, date) : [];

  let state: DataStateLabel = "UNAVAILABLE";
  if (date) {
    const anyLive = games.some((g) => g.abstractGameState === "Live");
    if (date === todayUtc()) state = anyLive ? "LIVE" : "RECENT";
    else state = "HISTORICAL";
  }

  return (
    <>
      <TopNav active="mlb" />
      <main>
        <div className="page-head">
          <h1>MLB Games</h1>
          {date ? (
            <>
              <span className="subtitle" style={{ margin: 0 }}>
                {date}
              </span>
              <DataStateBadge
                state={state}
                title={`Data for ${date} from MLB Stats API via our database`}
              />
            </>
          ) : null}
        </div>

        {games.length === 0 ? (
          <div className="empty">
            No MLB games in the database yet. Run <code>pnpm ingest:mlb</code>{" "}
            to load a real schedule.
          </div>
        ) : (
          <div className="game-list">
            {games.map((g) => (
              <a key={g.id} className="game-card" href={`/mlb/games/${g.id}`}>
                <span className="game-time">
                  {formatUtcTime(g.gameDatetime)}
                </span>
                <span>
                  <span className="game-match">
                    {g.awayTeamName}
                    {g.awayTeamAbbr ? (
                      <span className="game-abbr">{g.awayTeamAbbr}</span>
                    ) : null}
                    <span className="at">@</span>
                    {g.homeTeamName}
                    {g.homeTeamAbbr ? (
                      <span className="game-abbr">{g.homeTeamAbbr}</span>
                    ) : null}
                  </span>
                  {g.venueName ? (
                    <div className="game-venue">{g.venueName}</div>
                  ) : null}
                </span>
                <span className="game-status">
                  {g.detailedState ?? g.abstractGameState ?? ""}
                </span>
              </a>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
