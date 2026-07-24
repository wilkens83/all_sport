import { PlatformError } from "./errors";

/**
 * An explicit analysis cutoff instant (UTC). Every analytics query must carry an
 * `AsOf`; models may only consume information that existed before it. This module
 * provides the leakage-guard primitive the rest of the platform builds on.
 */
export type AsOf = Date;

export function nowUtc(): Date {
  return new Date();
}

export function toIsoUtc(instant: Date): string {
  return instant.toISOString();
}

/** Parse and validate a cutoff. Rejects invalid dates rather than propagating NaN. */
export function parseAsOf(input: string | Date): AsOf {
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) {
    throw new PlatformError({
      code: "DATA_INVALID",
      message: `Invalid asOf timestamp: ${String(input)}`,
    });
  }
  return date;
}

export function isBefore(a: Date, b: Date): boolean {
  return a.getTime() < b.getTime();
}

export function isAtOrBefore(a: Date, b: Date): boolean {
  return a.getTime() <= b.getTime();
}

/**
 * Leakage guard. Throws DATA_INVALID if `dataTimestamp` is after the analysis
 * cutoff `asOf` — i.e. if a model is about to read information from the future.
 */
export function assertWithinCutoff(
  dataTimestamp: Date,
  asOf: AsOf,
  context?: Record<string, unknown>,
): void {
  if (!isAtOrBefore(dataTimestamp, asOf)) {
    throw new PlatformError({
      code: "DATA_INVALID",
      message: `Data leakage: timestamp ${toIsoUtc(dataTimestamp)} is after asOf ${toIsoUtc(asOf)}`,
      ...(context !== undefined ? { context } : {}),
    });
  }
}
