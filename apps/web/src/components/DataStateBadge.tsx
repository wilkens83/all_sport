import type { ReactNode } from "react";

export type DataStateLabel =
  | "LIVE"
  | "RECENT"
  | "HISTORICAL"
  | "STALE"
  | "SIMULATED"
  | "TRIAL"
  | "UNAVAILABLE";

const COLORS: Record<DataStateLabel, string> = {
  LIVE: "#3ecf8e",
  RECENT: "#5aa9ff",
  HISTORICAL: "#c9a227",
  STALE: "#e0803a",
  SIMULATED: "#a06bff",
  TRIAL: "#e0803a",
  UNAVAILABLE: "#6b7280",
};

/** Always tells the user what kind of data they are looking at. */
export function DataStateBadge({
  state,
  title,
}: {
  state: DataStateLabel;
  title?: string;
}): ReactNode {
  const color = COLORS[state];
  return (
    <span
      className="datastate-badge"
      title={title ?? state}
      style={{ borderColor: color, color }}
    >
      <span className="datastate-dot" style={{ background: color }} />
      {state}
    </span>
  );
}
