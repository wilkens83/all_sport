/** UTC time-of-day like "20:10 UTC" (we label UTC explicitly to avoid TZ confusion). */
export function formatUtcTime(d: Date | null): string {
  if (!d) return "TBD";
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mm} UTC`;
}

/** Today's date in UTC as YYYY-MM-DD. */
export function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}
