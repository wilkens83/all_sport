import type { Kysely, Selectable } from "kysely";
import type { Database, ProviderObservationsTable } from "./schema";

export type ProviderObservation = Selectable<ProviderObservationsTable>;

/**
 * Append-only temporal provenance operations.
 *
 * Idempotency vs. history (ADR-0004):
 *   - SAME upstream record + UNCHANGED payload (same raw_response_hash, parser
 *     version, schema version, truth class) => ON CONFLICT DO NOTHING; no new row.
 *   - SAME upstream record + CHANGED payload (different raw_response_hash) => a new
 *     observation row; the prior observation is preserved for temporal replay.
 */

export interface RecordObservationInput {
  providerId: string;
  ingestionRunId: string;
  entityType: string;
  providerRecordId: string;
  fetchedAt: Date;
  rawResponseHash: string;
  parserVersion: string;
  normalizedSchemaVersion: string;
  truthClass: string;
  entityId?: string | null;
  sourceEventTs?: Date | null;
}

export interface RecordObservationResult {
  observationId: string;
  /** true if a new observation row was inserted; false if it already existed. */
  inserted: boolean;
}

const IDEMPOTENCY_COLUMNS = [
  "provider_id",
  "entity_type",
  "provider_record_id",
  "raw_response_hash",
  "parser_version",
  "normalized_schema_version",
  "truth_class",
] as const;

export async function recordObservation(
  db: Kysely<Database>,
  input: RecordObservationInput,
): Promise<RecordObservationResult> {
  const values = {
    provider_id: input.providerId,
    ingestion_run_id: input.ingestionRunId,
    entity_type: input.entityType,
    provider_record_id: input.providerRecordId,
    entity_id: input.entityId ?? null,
    fetched_at: input.fetchedAt,
    source_event_ts: input.sourceEventTs ?? null,
    raw_response_hash: input.rawResponseHash,
    parser_version: input.parserVersion,
    normalized_schema_version: input.normalizedSchemaVersion,
    truth_class: input.truthClass,
  };

  const inserted = await db
    .insertInto("provider_observations")
    .values(values)
    .onConflict((oc) => oc.columns([...IDEMPOTENCY_COLUMNS]).doNothing())
    .returning("id")
    .executeTakeFirst();

  if (inserted !== undefined) {
    return { observationId: inserted.id, inserted: true };
  }

  // Conflict: the identical observation already exists — return its id.
  const existing = await db
    .selectFrom("provider_observations")
    .select("id")
    .where("provider_id", "=", input.providerId)
    .where("entity_type", "=", input.entityType)
    .where("provider_record_id", "=", input.providerRecordId)
    .where("raw_response_hash", "=", input.rawResponseHash)
    .where("parser_version", "=", input.parserVersion)
    .where("normalized_schema_version", "=", input.normalizedSchemaVersion)
    .where("truth_class", "=", input.truthClass)
    .executeTakeFirstOrThrow();

  return { observationId: existing.id, inserted: false };
}

export interface AsOfQuery {
  providerId: string;
  entityType: string;
  providerRecordId: string;
  asOf: Date;
}

/**
 * Temporal reconstruction: the latest observation of a record whose `fetched_at`
 * is at or before `asOf`. An observation first fetched AFTER `asOf` is never
 * returned — the foundational no-future-leakage invariant.
 */
export async function getObservationAsOf(
  db: Kysely<Database>,
  query: AsOfQuery,
): Promise<ProviderObservation | undefined> {
  return db
    .selectFrom("provider_observations")
    .selectAll()
    .where("provider_id", "=", query.providerId)
    .where("entity_type", "=", query.entityType)
    .where("provider_record_id", "=", query.providerRecordId)
    .where("fetched_at", "<=", query.asOf)
    .orderBy("fetched_at", "desc")
    .orderBy("created_at", "desc")
    .limit(1)
    .executeTakeFirst();
}
