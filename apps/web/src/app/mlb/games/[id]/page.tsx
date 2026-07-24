import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { getGameById } from "@all-sport/db";
import { getDb } from "../../../../lib/db";
import { formatUtcTime, todayUtc } from "../../../../lib/format";
import { TopNav } from "../../../../components/TopNav";
import {
  DataStateBadge,
  type DataStateLabel,
} from "../../../../components/DataStateBadge";

export const dynamic = "force-dynamic";

export default async function GameDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<ReactNode> {
  const { id } = await params;
  const game = await getGameById(getDb(), id);
  if (!game) notFound();

  const state: DataStateLabel =
    game.gameDate === todayUtc()
      ? game.abstractGameState === "Live"
        ? "LIVE"
        : "RECENT"
      : "HISTORICAL";

  return (
    <>
      <TopNav active="mlb" />
      <main>
        <a className="back" href="/mlb">
          ← All MLB games
        </a>
        <div className="page-head" style={{ marginTop: "0.75rem" }}>
          <h1>
            {game.awayTeamName} @ {game.homeTeamName}
          </h1>
          <DataStateBadge state={state} />
        </div>

        <div className="detail-grid">
          <div className="detail-row">
            <span className="k">Date</span>
            <span>{game.gameDate}</span>
          </div>
          <div className="detail-row">
            <span className="k">Start</span>
            <span>{formatUtcTime(game.gameDatetime)}</span>
          </div>
          <div className="detail-row">
            <span className="k">Status</span>
            <span>{game.detailedState ?? game.abstractGameState ?? "—"}</span>
          </div>
          <div className="detail-row">
            <span className="k">Away</span>
            <span>
              {game.awayTeamName}
              {game.awayTeamAbbr ? ` (${game.awayTeamAbbr})` : ""}
            </span>
          </div>
          <div className="detail-row">
            <span className="k">Home</span>
            <span>
              {game.homeTeamName}
              {game.homeTeamAbbr ? ` (${game.homeTeamAbbr})` : ""}
            </span>
          </div>
          <div className="detail-row">
            <span className="k">Venue</span>
            <span>{game.venueName ?? "—"}</span>
          </div>
          <div className="detail-row">
            <span className="k">MLB gamePk</span>
            <span>{game.mlbGamePk}</span>
          </div>
        </div>
      </main>
    </>
  );
}
