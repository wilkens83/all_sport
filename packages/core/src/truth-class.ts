import { PlatformError } from "./errors";

/**
 * Truthfulness classification of data at the provider boundary — the "is this
 * real or fabricated" axis.
 *
 *   - production_real  : genuine live/current data from a licensed/authorized source.
 *   - historical_real  : genuine past data (e.g. verified historical results).
 *   - trial_scrambled  : vendor free-trial data that is SCRAMBLED-but-realistic
 *                        (e.g. SportsDataIO trial). Looks plausible, is NOT real.
 *   - fixture          : test/dev fixtures. Never a production source.
 *   - simulated        : model-generated values (e.g. Monte Carlo output).
 *
 * The analytics/production layer MUST reject anything that is not real data.
 * A `trial_scrambled` value must never back a model evaluation, historical ROI,
 * player assessment, or production recommendation while presented as real.
 */
export const DATA_TRUTH_CLASSES = [
  "production_real",
  "historical_real",
  "trial_scrambled",
  "fixture",
  "simulated",
] as const;

export type DataTruthClass = (typeof DATA_TRUTH_CLASSES)[number];

export function isDataTruthClass(value: unknown): value is DataTruthClass {
  return (
    typeof value === "string" &&
    (DATA_TRUTH_CLASSES as readonly string[]).includes(value)
  );
}

/** The only truth classes that represent genuine (non-fabricated) data. */
export const REAL_TRUTH_CLASSES = [
  "production_real",
  "historical_real",
] as const satisfies readonly DataTruthClass[];

/**
 * Whether a truth class may back production analytics / recommendations.
 * Excludes trial_scrambled, fixture, and simulated.
 */
export function isRealData(truthClass: DataTruthClass): boolean {
  return truthClass === "production_real" || truthClass === "historical_real";
}

/**
 * Guard used by the analytics layer. Throws DATA_INVALID if the data is not
 * genuine, so fabricated/trial/fixture values can never be silently consumed as
 * production truth.
 */
export function assertRealData(
  truthClass: DataTruthClass,
  context?: Record<string, unknown>,
): void {
  if (!isRealData(truthClass)) {
    throw new PlatformError({
      code: "DATA_INVALID",
      message: `Refusing to use ${truthClass} data as production truth`,
      ...(context !== undefined ? { context } : {}),
    });
  }
}
