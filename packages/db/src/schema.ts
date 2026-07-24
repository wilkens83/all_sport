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
  /** Declared default only; authoritative truth class is per run / per observation. */
  default_truth_class: string;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface IngestionRunsTable {
  id: Generated<string>;
  provider_id: string;
  sport: string;
  adapter_version: Generated<string>;
  access_mode: string | null;
  truth_class: string;
  status: Generated<string>;
  started_at: Generated<Date>;
  finished_at: Date | null;
  request_count: Generated<number>;
  records_observed: Generated<number>;
  records_normalized: Generated<number>;
  records_rejected: Generated<number>;
  error: string | null;
}

export interface ProviderRequestsTable {
  id: Generated<string>;
  provider_id: string;
  ingestion_run_id: string | null;
  method: string;
  /** Secret-safe request metadata — no raw URL is ever stored. */
  host: string;
  path: string;
  sanitized_query: string | null;
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

/** Append-only temporal provenance — one row per observation of an upstream record. */
export interface ProviderObservationsTable {
  id: Generated<string>;
  provider_id: string;
  ingestion_run_id: string;
  entity_type: string;
  provider_record_id: string;
  entity_id: string | null;
  fetched_at: Date;
  source_event_ts: Date | null;
  /** SHA-256 hex of the raw response body bytes (uncompressed, headers excluded). */
  raw_response_hash: string;
  parser_version: string;
  normalized_schema_version: string;
  truth_class: string;
  created_at: Generated<Date>;
}

export interface SchemaMigrationsTable {
  version: string;
  applied_at: Generated<Date>;
}

// ---- MLB canonical entities (migration 0002) ----

export interface VenuesTable {
  id: Generated<string>;
  mlb_venue_id: number;
  name: string;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface MlbTeamsTable {
  id: Generated<string>;
  mlb_team_id: number;
  name: string;
  abbreviation: string | null;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface MlbGamesTable {
  id: Generated<string>;
  mlb_game_pk: number;
  season: number | null;
  game_date: string; // date (YYYY-MM-DD)
  game_datetime: Date | null;
  abstract_game_state: string | null;
  detailed_state: string | null;
  coded_game_state: string | null;
  away_team_id: string;
  home_team_id: string;
  venue_id: string | null;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface Database {
  sports: SportsTable;
  providers: ProvidersTable;
  ingestion_runs: IngestionRunsTable;
  provider_requests: ProviderRequestsTable;
  data_quality_events: DataQualityEventsTable;
  provider_observations: ProviderObservationsTable;
  schema_migrations: SchemaMigrationsTable;
  venues: VenuesTable;
  mlb_teams: MlbTeamsTable;
  mlb_games: MlbGamesTable;
}
