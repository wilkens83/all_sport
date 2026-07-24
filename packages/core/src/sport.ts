import { PlatformError } from "./errors";

/** The sports this platform supports. Multi-sport from the foundation. */
export const SPORT_KEYS = ["mlb", "tennis"] as const;

export type SportKey = (typeof SPORT_KEYS)[number];

export function isSportKey(value: unknown): value is SportKey {
  return (
    typeof value === "string" &&
    (SPORT_KEYS as readonly string[]).includes(value)
  );
}

export function assertSportKey(value: unknown): SportKey {
  if (!isSportKey(value)) {
    throw new PlatformError({
      code: "DATA_INVALID",
      message: `Unknown sport key: ${String(value)}`,
      context: { allowed: SPORT_KEYS },
    });
  }
  return value;
}
