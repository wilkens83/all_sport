import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import {
  getGameById,
  getPlayerCanonicalIdByMlbId,
  getTeamRoster,
  type RosterPlayer,
} from "@all-sport/db";
import { getDb } from "../../../../lib/db";
import { formatUtcTime, todayUtc } from "../../../../lib/format";
import { TopNav } from "../../../../components/TopNav";
import {
  DataStateBadge,
  type DataStateLabel,
} from "../../../../components/DataStateBadge";

export const dynamic = "force-dynamic";

function RosterColumn({
  team,
  players,
}: {
  team: string;
  players: RosterPlayer[];
}): ReactNode {
  return (
    <div className="roster-col">
      <h3>{team}</h3>
      {players.length === 0 ? (
        <div className="empty">Roster not ingested.</div>
      ) : (
        <div className="roster-list">
          {players.map((p) => (
            <a key={p.id} className="roster-item" href={`/mlb/players/${p.id}`}>
              <span>{p.fullName}</span>
              <span className="pos">{p.primaryPosition ?? ""}</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

async function ProbablePitcher({
  label,
  mlbId,
}: {
  label: string;
  mlbId: number | null;
}): Promise<ReactNode> {
  const resolved =
    mlbId !== null
      ? await getPlayerCanonicalIdByMlbId(getDb(), mlbId)
      : undefined;
  return (
    <div className="mini-card">
      <div className="lbl">{label}</div>
      {resolved ? (
        <a href={`/mlb/players/${resolved.id}`}>{resolved.fullName}</a>
      ) : (
        <div className="none">Probable pitcher not available</div>
      )}
    </div>
  );
}

export default async function GameDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<ReactNode> {
  const { id } = await params;
  const db = getDb();
  const game = await getGameById(db, id);
  if (!game) notFound();

  const [awayRoster, homeRoster] = await Promise.all([
    getTeamRoster(db, game.awayTeamDbId),
    getTeamRoster(db, game.homeTeamDbId),
  ]);

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
            <span className="k">Venue</span>
            <span>{game.venueName ?? "—"}</span>
          </div>
          <div className="detail-row">
            <span className="k">MLB gamePk</span>
            <span>{game.mlbGamePk}</span>
          </div>
        </div>

        <div className="section">
          <h2>Probable Pitchers</h2>
          <div className="pitcher-cards">
            <ProbablePitcher
              label={game.awayTeamName}
              mlbId={game.awayProbablePitcherMlbId}
            />
            <ProbablePitcher
              label={game.homeTeamName}
              mlbId={game.homeProbablePitcherMlbId}
            />
          </div>
        </div>

        <div className="section">
          <h2>Rosters</h2>
          <div className="roster-cols">
            <RosterColumn team={game.awayTeamName} players={awayRoster} />
            <RosterColumn team={game.homeTeamName} players={homeRoster} />
          </div>
        </div>
      </main>
    </>
  );
}
