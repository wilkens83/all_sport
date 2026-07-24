import { describe, it, expect } from "vitest";
import { isErr, isOk, PlatformError } from "@all-sport/core";
import {
  validate,
  providerDescriptorSchema,
  providerHealthSchema,
  ingestionRunSchema,
} from "./index";

const UUID = "00000000-0000-4000-8000-000000000000";

describe("validate() at provider boundary", () => {
  it("accepts a valid ProviderDescriptor", () => {
    const result = validate(providerDescriptorSchema, {
      id: "sportradar-tennis",
      name: "Sportradar Tennis v3",
      sport: "tennis",
      truthClass: "production_real",
    });
    expect(isOk(result)).toBe(true);
  });

  it("accepts sport: multi", () => {
    const result = validate(providerDescriptorSchema, {
      id: "prizepicks",
      name: "PrizePicks",
      sport: "multi",
      truthClass: "production_real",
    });
    expect(isOk(result)).toBe(true);
  });

  it("rejects an unknown truthClass with PROVIDER_SCHEMA_MISMATCH", () => {
    const result = validate(
      providerDescriptorSchema,
      { id: "x", name: "X", sport: "tennis", truthClass: "totally_real" },
      { provider: "x" },
    );
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(PlatformError);
      expect(result.error.code).toBe("PROVIDER_SCHEMA_MISMATCH");
      expect(result.error.provider).toBe("x");
    }
  });

  it("rejects a malformed object (missing fields)", () => {
    const result = validate(providerDescriptorSchema, { id: "x" });
    expect(isErr(result)).toBe(true);
  });

  it("rejects an invalid ProviderHealth (negative failure count)", () => {
    const result = validate(providerHealthSchema, {
      configured: true,
      reachable: null,
      authenticated: null,
      lastSuccessAt: null,
      lastFailureAt: null,
      recentFailureCount: -1,
    });
    expect(isErr(result)).toBe(true);
  });

  it("validates an IngestionRun and enforces uuid + status enum", () => {
    const good = validate(ingestionRunSchema, {
      id: UUID,
      providerId: UUID,
      sport: "mlb",
      status: "running",
      startedAt: new Date(),
      finishedAt: null,
      recordsIngested: 0,
      error: null,
    });
    expect(isOk(good)).toBe(true);

    const badStatus = validate(ingestionRunSchema, {
      id: UUID,
      providerId: UUID,
      sport: "mlb",
      status: "in_progress",
      startedAt: new Date(),
      finishedAt: null,
      recordsIngested: 0,
      error: null,
    });
    expect(isErr(badStatus)).toBe(true);

    const badId = validate(ingestionRunSchema, {
      id: "not-a-uuid",
      providerId: UUID,
      sport: "mlb",
      status: "running",
      startedAt: new Date(),
      finishedAt: null,
      recordsIngested: 0,
      error: null,
    });
    expect(isErr(badId)).toBe(true);
  });
});
