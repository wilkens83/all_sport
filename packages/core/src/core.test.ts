import { describe, it, expect } from "vitest";
import {
  SPORT_KEYS,
  isSportKey,
  assertSportKey,
  DATA_STATES,
  isDataState,
  DATA_TRUTH_CLASSES,
  isDataTruthClass,
  isRealData,
  assertRealData,
  PlatformError,
  isRetryableCode,
  parseAsOf,
  assertWithinCutoff,
  configChecksum,
  stableStringify,
  ok,
  err,
  isOk,
  isErr,
  unwrap,
} from "./index";

describe("SportKey", () => {
  it("recognizes exactly mlb and tennis", () => {
    expect([...SPORT_KEYS]).toEqual(["mlb", "tennis"]);
    expect(isSportKey("mlb")).toBe(true);
    expect(isSportKey("tennis")).toBe(true);
    expect(isSportKey("nba")).toBe(false);
    expect(isSportKey(123)).toBe(false);
  });

  it("assertSportKey returns valid keys and throws on invalid", () => {
    expect(assertSportKey("tennis")).toBe("tennis");
    expect(() => assertSportKey("cricket")).toThrowError(PlatformError);
  });
});

describe("DataState", () => {
  it("validates the six states", () => {
    expect(DATA_STATES).toContain("LIVE");
    expect(DATA_STATES).toContain("UNAVAILABLE");
    expect(isDataState("HISTORICAL")).toBe(true);
    expect(isDataState("live")).toBe(false); // case-sensitive
    expect(isDataState("BOGUS")).toBe(false);
  });
});

describe("DataTruthClass quarantine", () => {
  it("validates the five truth classes", () => {
    expect(DATA_TRUTH_CLASSES).toHaveLength(5);
    expect(isDataTruthClass("trial_scrambled")).toBe(true);
    expect(isDataTruthClass("real")).toBe(false);
  });

  it("only production_real and historical_real are real data", () => {
    expect(isRealData("production_real")).toBe(true);
    expect(isRealData("historical_real")).toBe(true);
    expect(isRealData("trial_scrambled")).toBe(false);
    expect(isRealData("fixture")).toBe(false);
    expect(isRealData("simulated")).toBe(false);
  });

  it("assertRealData rejects scrambled trial data as production truth", () => {
    expect(() => assertRealData("production_real")).not.toThrow();
    expect(() => assertRealData("trial_scrambled")).toThrowError(
      /Refusing to use trial_scrambled/,
    );
    expect(() => assertRealData("fixture")).toThrowError(PlatformError);
    expect(() => assertRealData("simulated")).toThrowError(PlatformError);
  });
});

describe("PlatformError taxonomy", () => {
  it("carries stable code + retryability + provider", () => {
    const e = new PlatformError({
      code: "PROVIDER_RATE_LIMITED",
      message: "slow down",
      provider: "sportradar",
    });
    expect(e.code).toBe("PROVIDER_RATE_LIMITED");
    expect(e.retryable).toBe(true);
    expect(e.provider).toBe("sportradar");
    expect(e.toJSON().name).toBe("PlatformError");
  });

  it("defaults retryability by code and allows override", () => {
    expect(isRetryableCode("PROVIDER_TIMEOUT")).toBe(true);
    expect(isRetryableCode("PROVIDER_NOT_CONFIGURED")).toBe(false);
    const forced = new PlatformError({
      code: "PROVIDER_NOT_CONFIGURED",
      message: "x",
      retryable: true,
    });
    expect(forced.retryable).toBe(true);
  });
});

describe("asOf leakage guard", () => {
  const asOf = parseAsOf("2026-07-23T18:00:00Z");

  it("allows data at or before the cutoff", () => {
    expect(() =>
      assertWithinCutoff(new Date("2026-07-23T17:59:59Z"), asOf),
    ).not.toThrow();
    expect(() =>
      assertWithinCutoff(new Date("2026-07-23T18:00:00Z"), asOf),
    ).not.toThrow();
  });

  it("rejects data from after the cutoff (future leakage)", () => {
    expect(() =>
      assertWithinCutoff(new Date("2026-07-23T18:00:01Z"), asOf),
    ).toThrowError(/leakage/);
  });

  it("rejects an invalid cutoff", () => {
    expect(() => parseAsOf("not-a-date")).toThrowError(PlatformError);
  });
});

describe("provenance version helpers", () => {
  it("configChecksum is stable regardless of key order", () => {
    const a = configChecksum({ b: 2, a: 1, nested: { y: 1, x: 2 } });
    const b = configChecksum({ a: 1, nested: { x: 2, y: 1 }, b: 2 });
    expect(a).toBe(b);
  });

  it("configChecksum changes when config changes", () => {
    expect(configChecksum({ a: 1 })).not.toBe(configChecksum({ a: 2 }));
  });

  it("stableStringify sorts keys", () => {
    expect(stableStringify({ b: 1, a: 2 })).toBe('{"a":2,"b":1}');
  });
});

describe("Result", () => {
  it("ok/err and guards work", () => {
    const good = ok(5);
    const bad = err(new PlatformError({ code: "DATA_INVALID", message: "x" }));
    expect(isOk(good)).toBe(true);
    expect(isErr(bad)).toBe(true);
    expect(unwrap(good)).toBe(5);
    expect(() => unwrap(bad)).toThrowError(PlatformError);
  });
});
