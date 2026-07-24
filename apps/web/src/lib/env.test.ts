import { describe, it, expect } from "vitest";
import { PlatformError } from "@all-sport/core";
import { parseServerEnv, providerConfigStatuses } from "./env";

describe("server env validation", () => {
  it("parses when DATABASE_URL is present and no tennis keys are set", () => {
    const env = parseServerEnv({ DATABASE_URL: "postgres://x" });
    expect(env.DATABASE_URL).toBe("postgres://x");
    // Missing optional tennis credentials must NOT throw.
    expect(env.SPORTRADAR_TENNIS_API_KEY).toBeUndefined();
  });

  it("throws CONFIG_INVALID when DATABASE_URL is missing", () => {
    try {
      parseServerEnv({});
      throw new Error("expected throw");
    } catch (e) {
      expect(e).toBeInstanceOf(PlatformError);
      expect((e as PlatformError).code).toBe("CONFIG_INVALID");
    }
  });

  it("reports providers as not configured without keys, real for MLB", () => {
    const statuses = providerConfigStatuses(
      parseServerEnv({ DATABASE_URL: "postgres://x" }),
    );
    const byId = Object.fromEntries(statuses.map((s) => [s.id, s.configured]));
    expect(byId["mlb-stats"]).toBe(true);
    expect(byId["sportradar-tennis"]).toBe(false);
    expect(byId["api-tennis"]).toBe(false);
    expect(byId["tennis-api-rapidapi"]).toBe(false);
  });

  it("flips a provider to configured when its key is present", () => {
    const statuses = providerConfigStatuses(
      parseServerEnv({
        DATABASE_URL: "postgres://x",
        SPORTRADAR_TENNIS_API_KEY: "secret",
      }),
    );
    const sportradar = statuses.find((s) => s.id === "sportradar-tennis");
    expect(sportradar?.configured).toBe(true);
  });

  it("never leaks secret values, only booleans", () => {
    const statuses = providerConfigStatuses(
      parseServerEnv({
        DATABASE_URL: "postgres://x",
        SPORTRADAR_TENNIS_API_KEY: "super-secret-value",
      }),
    );
    const serialized = JSON.stringify(statuses);
    expect(serialized).not.toContain("super-secret-value");
    expect(serialized).not.toContain("postgres://x");
  });
});
