import type { Generated } from "kysely";

/**
 * Kysely table interfaces for the common infrastructure schema (migration 0001).
 * `Generated<T>` marks columns the database fills in (defaults), so they are
 * optional on insert but always present on select.
 */

export interface SportsTable {
  id: Generated<string>;
  key: string;
  name: string;
  created_at: Generated<Date>;
}

export interface ProvidersTable {
  id: Generated<string>;
  slug: string;
  name: string;
  sport: string;
  truth_class: string;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface IngestionRunsTable {
  id: Generated<string>;
  provider_id: string;
  sport: string;
  status: Generated<string>;
  started_at: Generated<Date>;
  finished_at: Date | null;
  records_ingested: Generated<number>;
  error: string | null;
}

export interface ProviderRequestsTable {
  id: Generated<string>;
  provider_id: string;
  ingestion_run_id: string | null;
  method: string;
  url: string;
  status_code: number | null;
  latency_ms: number | null;
  truth_class: string;
  requested_at: Generated<Date>;
  succeeded: boolean;
  error_code: string | null;
}

export interface DataQualityEventsTable {
  id: Generated<string>;
  provider_id: string | null;
  ingestion_run_id: string | null;
  severity: string;
  code: string;
  message: string;
  context: unknown | null;
  occurred_at: Generated<Date>;
}

export interface SourceProvenanceTable {
  id: Generated<string>;
  provider_id: string;
  ingestion_run_id: string;
  entity_type: string;
  entity_id: string;
  provider_record_id: string;
  fetched_at: Date;
  source_event_ts: Date | null;
  parser_version: string;
  raw_response_hash: string;
  normalized_schema_version: string;
  truth_class: string;
  created_at: Generated<Date>;
}

export interface SchemaMigrationsTable {
  version: string;
  applied_at: Generated<Date>;
}

export interface Database {
  sports: SportsTable;
  providers: ProvidersTable;
  ingestion_runs: IngestionRunsTable;
  provider_requests: ProviderRequestsTable;
  data_quality_events: DataQualityEventsTable;
  source_provenance: SourceProvenanceTable;
  schema_migrations: SchemaMigrationsTable;
}
