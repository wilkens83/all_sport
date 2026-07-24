/**
 * Temporal/availability classification of a piece of data — the "when/how fresh"
 * axis. Distinct from `DataTruthClass` (the "is it real or fabricated" axis).
 * These two are ORTHOGONAL and must never be collapsed:
 *   - DataState answers: is this live, recent, historical, stale, simulated, or absent?
 *   - DataTruthClass answers: is this real, historical-real, trial-scrambled, fixture, or simulated?
 * The UI must never mix these categories invisibly.
 */
export const DATA_STATES = [
  "LIVE",
  "RECENT",
  "HISTORICAL",
  "STALE",
  "SIMULATED",
  "UNAVAILABLE",
] as const;

export type DataState = (typeof DATA_STATES)[number];

export function isDataState(value: unknown): value is DataState {
  return (
    typeof value === "string" &&
    (DATA_STATES as readonly string[]).includes(value)
  );
}
