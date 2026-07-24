import { describe, it, expect } from "vitest";
import { isErr, isOk, PlatformError } from "@all-sport/core";
import {
  validate,
  providerDescriptorSchema,
  providerHealthSchema,
  ingestionRunSchema,
  providerRequestSchema,
} from "./index";

const UUID = "00000000-0000-4000-8000-000000000000";

describe("validate() at provider boundary", () => {
  it("accepts a valid ProviderDescriptor", () => {
    const result = validate(providerDescriptorSchema, {
      id: "sportradar-tennis",
      name: "Sportradar Tennis v3",
      sport: "tennis",
      defaultTruthClass: "production_real",
    });
    expect(isOk(result)).toBe(true);
  });

  it("accepts sport: multi", () => {
    const result = validate(providerDescriptorSchema, {
      id: "prizepicks",
      name: "PrizePicks",
      sport: "multi",
      defaultTruthClass: "production_real",
    });
    expect(isOk(result)).toBe(true);
  });

  it("rejects an unknown defaultTruthClass with PROVIDER_SCHEMA_MISMATCH", () => {
    const result = validate(
      providerDescriptorSchema,
      {
        id: "x",
        name: "X",
        sport: "tennis",
        defaultTruthClass: "totally_real",
      },
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

  it("validates an IngestionRun with its context snapshot", () => {
    const good = validate(ingestionRunSchema, {
      id: UUID,
      providerId: UUID,
      sport: "mlb",
      adapterVersion: "1.0.0",
      accessMode: "production",
      truthClass: "production_real",
      status: "running",
      startedAt: new Date(),
      finishedAt: null,
      requestCount: 0,
      recordsObserved: 0,
      recordsNormalized: 0,
      recordsRejected: 0,
      error: null,
    });
    expect(isOk(good)).toBe(true);

    const badStatus = validate(ingestionRunSchema, {
      id: UUID,
      providerId: UUID,
      sport: "mlb",
      adapterVersion: "1.0.0",
      accessMode: null,
      truthClass: "production_real",
      status: "in_progress",
      startedAt: new Date(),
      finishedAt: null,
      requestCount: 0,
      recordsObserved: 0,
      recordsNormalized: 0,
      recordsRejected: 0,
      error: null,
    });
    expect(isErr(badStatus)).toBe(true);
  });

  it("ProviderRequest schema exposes host/path/sanitizedQuery, not a raw url", () => {
    // The schema has no `url` field at all — secrets can't ride in via a raw URL.
    expect(Object.keys(providerRequestSchema.shape)).not.toContain("url");
    const good = validate(providerRequestSchema, {
      id: UUID,
      providerId: UUID,
      ingestionRunId: null,
      method: "GET",
      host: "api.sportradar.com",
      path: "/tennis/trial/v3/en/rankings",
      sanitizedQuery: "api_key=%5BREDACTED%5D",
      statusCode: 200,
      latencyMs: 42,
      truthClass: "trial_scrambled",
      requestedAt: new Date(),
      succeeded: true,
      errorCode: null,
    });
    expect(isOk(good)).toBe(true);
  });
});
