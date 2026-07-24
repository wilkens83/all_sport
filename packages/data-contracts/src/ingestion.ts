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

/** A single execution of an ingestion job. Mirrors the `ingestion_runs` table. */
export const ingestionRunSchema = z.object({
  id: z.uuid(),
  providerId: z.uuid(),
  sport: sportOrMulti,
  status: ingestionRunStatusSchema,
  startedAt: z.date(),
  finishedAt: z.date().nullable(),
  recordsIngested: z.number().int().nonnegative(),
  error: z.string().nullable(),
});
export type IngestionRun = z.infer<typeof ingestionRunSchema>;

/** A single outbound request to a provider. Mirrors the `provider_requests` table. */
export const providerRequestSchema = z.object({
  id: z.uuid(),
  providerId: z.uuid(),
  ingestionRunId: z.uuid().nullable(),
  method: z.string().min(1),
  url: z.string().min(1),
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
 * Provenance metadata attached to every important normalized record. Mirrors the
 * `source_provenance` table. A record without provenance is not acceptable.
 */
export const provenanceSchema = z.object({
  provider: z.string().min(1),
  providerRecordId: z.string().min(1),
  fetchedAt: z.date(),
  sourceEventTs: z.date().nullable(),
  ingestionRunId: z.uuid(),
  parserVersion: z.string().min(1),
  rawResponseHash: z.string().min(1),
  normalizedSchemaVersion: z.string().min(1),
  truthClass: z.enum(DATA_TRUTH_CLASSES),
});
export type Provenance = z.infer<typeof provenanceSchema>;
