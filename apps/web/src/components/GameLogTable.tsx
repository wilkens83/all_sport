import type { ReactNode } from "react";
import type { GameLogRow } from "@all-sport/db";

// Missing values render as "—" (unavailable), never 0.
function sv(stat: Record<string, unknown>, key: string): string {
  const v = stat[key];
  if (v === undefined || v === null) return "—";
  return String(v);
}

const HITTING: Array<[string, string]> = [
  ["atBats", "AB"],
  ["hits", "H"],
  ["doubles", "2B"],
  ["triples", "3B"],
  ["homeRuns", "HR"],
  ["runs", "R"],
  ["rbi", "RBI"],
  ["baseOnBalls", "BB"],
  ["strikeOuts", "K"],
  ["totalBases", "TB"],
];

const PITCHING: Array<[string, string]> = [
  ["inningsPitched", "IP"],
  ["strikeOuts", "K"],
  ["hits", "H"],
  ["baseOnBalls", "BB"],
  ["earnedRuns", "ER"],
  ["numberOfPitches", "PIT"],
];

export function GameLogTable({
  logs,
  group,
}: {
  logs: GameLogRow[];
  group: "hitting" | "pitching";
}): ReactNode {
  const cols = group === "pitching" ? PITCHING : HITTING;
  if (logs.length === 0) {
    return (
      <div className="empty">No recent {group} games in the database.</div>
    );
  }
  return (
    <div className="table-wrap">
      <table className="logs">
        <thead>
          <tr>
            <th>Date</th>
            <th>Opponent</th>
            {cols.map(([, label]) => (
              <th key={label}>{label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {logs.map((l, i) => (
            <tr key={`${l.gameDate}-${i}`}>
              <td>{l.gameDate}</td>
              <td>
                {l.isHome === false ? "@ " : l.isHome === true ? "vs " : ""}
                {l.opponentName ?? "—"}
              </td>
              {cols.map(([key, label]) => (
                <td key={label}>{sv(l.stat, key)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
