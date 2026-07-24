import { z } from "zod";
import { SPORT_KEYS, DATA_TRUTH_CLASSES } from "@all-sport/core";

const sportOrMulti = z.union([z.enum(SPORT_KEYS), z.literal("multi")]);

export const ingestionRunStatusSchema = z.enum([
  "running",
  "succeeded",
  "failed",
  "partial",
]);
export type IngestionRunStatus = z.infer<typeof ingestionRunStatusSchema>;

export const accessModeSchema = z.enum([
  "trial",
  "production",
  "historical",
  "fixture",
  "none",
]);
export type AccessMode = z.infer<typeof accessModeSchema>;

/**
 * A single execution of an ingestion job — a snapshot of the CONTEXT it ran under
 * (never credentials). Mirrors the `ingestion_runs` table.
 */
export const ingestionRunSchema = z.object({
  id: z.uuid(),
  providerId: z.uuid(),
  sport: sportOrMulti,
  adapterVersion: z.string().min(1),
  accessMode: accessModeSchema.nullable(),
  truthClass: z.enum(DATA_TRUTH_CLASSES),
  status: ingestionRunStatusSchema,
  startedAt: z.date(),
  finishedAt: z.date().nullable(),
  requestCount: z.number().int().nonnegative(),
  recordsObserved: z.number().int().nonnegative(),
  recordsNormalized: z.number().int().nonnegative(),
  recordsRejected: z.number().int().nonnegative(),
  error: z.string().nullable(),
});
export type IngestionRun = z.infer<typeof ingestionRunSchema>;

/**
 * A single outbound request to a provider. SECRET-SAFE: no raw URL — only
 * host/path/sanitizedQuery (sensitive query values already redacted). Mirrors the
 * `provider_requests` table.
 */
export const providerRequestSchema = z.object({
  id: z.uuid(),
  providerId: z.uuid(),
  ingestionRunId: z.uuid().nullable(),
  method: z.string().min(1),
  host: z.string().min(1),
  path: z.string().min(1),
  sanitizedQuery: z.string().nullable(),
  statusCode: z.number().int().nullable(),
  latencyMs: z.number().int().nonnegative().nullable(),
  truthClass: z.enum(DATA_TRUTH_CLASSES),
  requestedAt: z.date(),
  succeeded: z.boolean(),
  errorCode: z.string().nullable(),
});
export type ProviderRequest = z.infer<typeof providerRequestSchema>;

export const dataQualitySeveritySchema = z.enum(["info", "warning", "error"]);
export type DataQualitySeverity = z.infer<typeof dataQualitySeveritySchema>;

/** An observed data-quality signal. Mirrors the `data_quality_events` table. */
export const dataQualityEventSchema = z.object({
  id: z.uuid(),
  providerId: z.uuid().nullable(),
  ingestionRunId: z.uuid().nullable(),
  severity: dataQualitySeveritySchema,
  code: z.string().min(1),
  message: z.string(),
  context: z.record(z.string(), z.unknown()).nullable(),
  occurredAt: z.date(),
});
export type DataQualityEvent = z.infer<typeof dataQualityEventSchema>;

/**
 * One APPEND-ONLY observation of an upstream record at a point in time. Mirrors
 * the `provider_observations` table. `rawResponseHash` is the SHA-256 hex of the
 * raw response body bytes. A record without provenance is not acceptable, and an
 * UPDATE that replaces an old observation is forbidden — history is preserved.
 */
export const providerObservationSchema = z.object({
  id: z.uuid(),
  providerId: z.uuid(),
  ingestionRunId: z.uuid(),
  entityType: z.string().min(1),
  providerRecordId: z.string().min(1),
  entityId: z.uuid().nullable(),
  fetchedAt: z.date(),
  sourceEventTs: z.date().nullable(),
  rawResponseHash: z.string().min(1),
  parserVersion: z.string().min(1),
  normalizedSchemaVersion: z.string().min(1),
  truthClass: z.enum(DATA_TRUTH_CLASSES),
});
export type ProviderObservation = z.infer<typeof providerObservationSchema>;
