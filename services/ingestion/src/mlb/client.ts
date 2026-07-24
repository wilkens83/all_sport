export const MLB_STATS_API_BASE =
  process.env.MLB_STATS_API_BASE_URL ?? "https://statsapi.mlb.com/api";

export interface FetchScheduleResult {
  url: string;
  status: number;
  body: string;
  latencyMs: number;
}

/**
 * Fetch the MLB schedule for a date (YYYY-MM-DD). Returns the raw body text so
 * the caller can hash it for provenance before parsing. MLB Stats API is keyless.
 */
export async function fetchSchedule(
  date: string,
): Promise<FetchScheduleResult> {
  const url = `${MLB_STATS_API_BASE}/v1/schedule?sportId=1&date=${date}&hydrate=team,venue`;
  const start = Date.now();
  const res = await fetch(url);
  const body = await res.text();
  return { url, status: res.status, body, latencyMs: Date.now() - start };
}
