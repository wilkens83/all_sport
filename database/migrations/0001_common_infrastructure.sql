-- 0001_common_infrastructure.sql
-- Common, provenance-first infrastructure. Sport-specific schemas (MLB, Tennis)
-- are deferred to Phase 2+. This migration proves the migration runner, the
-- canonical-ID strategy, TEMPORAL provenance, secret-safe request metadata, and
-- the constraints that make ingestion idempotent WITHOUT destroying history.
--
-- Design decisions are documented in:
--   docs/architecture/adr/0002-postgresql-and-monorepo.md
--   docs/architecture/adr/0003-database-access.md
--   docs/architecture/adr/0004-temporal-provenance-and-idempotency.md
--
-- Conventions:
--   * Canonical internal IDs are UUIDs (gen_random_uuid()). Provider external IDs
--     are stored as text on records and are NEVER canonical internal IDs.
--   * All timestamps are timestamptz.
--   * check constraints mirror the DataTruthClass / enum contracts in code.
--   * Secrets never enter the database: provider request URLs are split into
--     host/path/sanitized_query with sensitive values redacted before insert.
--   * provider_observations is APPEND-ONLY: a changed upstream payload creates a
--     new observation so we can reconstruct "what did we know as of time T?".

create extension if not exists "pgcrypto";

-- Canonical sports (the SportKey universe).
create table sports (
  id          uuid primary key default gen_random_uuid(),
  key         text not null unique,
  name        text not null,
  created_at  timestamptz not null default now(),
  constraint sports_key_check check (key in ('mlb', 'tennis'))
);

-- Providers. `slug` is the internal stable identity. `default_truth_class` is the
-- provider's DECLARED default classification only; the AUTHORITATIVE truth class
-- lives per ingestion run / per observation, because one vendor can operate in
-- multiple modes (e.g. a trial credential yields trial_scrambled, a production
-- credential yields production_real). See ADR-0004.
create table providers (
  id                   uuid primary key default gen_random_uuid(),
  slug                 text not null unique,
  name                 text not null,
  sport                text not null,
  default_truth_class  text not null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint providers_sport_check check (sport in ('mlb', 'tennis', 'multi')),
  constraint providers_default_truth_class_check check (
    default_truth_class in ('production_real', 'historical_real', 'trial_scrambled', 'fixture', 'simulated')
  )
);

-- Auto-maintain providers.updated_at.
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger providers_set_updated_at
  before update on providers
  for each row execute function set_updated_at();

-- One row per ingestion-job execution: a snapshot of the CONTEXT under which the
-- run executed (never credentials). access_mode + truth_class capture the mode.
create table ingestion_runs (
  id                  uuid primary key default gen_random_uuid(),
  provider_id         uuid not null references providers(id) on delete cascade,
  sport               text not null,
  adapter_version     text not null default 'unknown',
  access_mode         text,
  truth_class         text not null,
  status              text not null default 'running',
  started_at          timestamptz not null default now(),
  finished_at         timestamptz,
  request_count       integer not null default 0,
  records_observed    integer not null default 0,
  records_normalized  integer not null default 0,
  records_rejected    integer not null default 0,
  error               text,
  constraint ingestion_runs_status_check check (
    status in ('running', 'succeeded', 'failed', 'partial')
  ),
  constraint ingestion_runs_sport_check check (sport in ('mlb', 'tennis', 'multi')),
  constraint ingestion_runs_truth_class_check check (
    truth_class in ('production_real', 'historical_real', 'trial_scrambled', 'fixture', 'simulated')
  ),
  constraint ingestion_runs_access_mode_check check (
    access_mode is null or access_mode in ('trial', 'production', 'historical', 'fixture', 'none')
  ),
  constraint ingestion_runs_counts_nonneg check (
    request_count >= 0 and records_observed >= 0
    and records_normalized >= 0 and records_rejected >= 0
  )
);
create index ingestion_runs_provider_idx on ingestion_runs (provider_id);
create index ingestion_runs_started_idx on ingestion_runs (started_at);

-- One row per outbound provider request. SECRET-SAFE: no raw URL is stored. The
-- URL is split into host/path/sanitized_query with sensitive query values redacted
-- (packages/core sanitizeRequestUrl). Authorization/other headers are NEVER stored.
create table provider_requests (
  id                uuid primary key default gen_random_uuid(),
  provider_id       uuid not null references providers(id) on delete cascade,
  ingestion_run_id  uuid references ingestion_runs(id) on delete set null,
  method            text not null,
  host              text not null,
  path              text not null,
  sanitized_query   text,
  status_code       integer,
  latency_ms        integer,
  truth_class       text not null,
  requested_at      timestamptz not null default now(),
  succeeded         boolean not null,
  error_code        text,
  constraint provider_requests_truth_class_check check (
    truth_class in ('production_real', 'historical_real', 'trial_scrambled', 'fixture', 'simulated')
  ),
  constraint provider_requests_latency_nonneg check (latency_ms is null or latency_ms >= 0)
);
create index provider_requests_provider_idx on provider_requests (provider_id);
create index provider_requests_run_idx on provider_requests (ingestion_run_id);

-- Observed data-quality signals.
create table data_quality_events (
  id                uuid primary key default gen_random_uuid(),
  provider_id       uuid references providers(id) on delete set null,
  ingestion_run_id  uuid references ingestion_runs(id) on delete set null,
  severity          text not null,
  code              text not null,
  message           text not null,
  context           jsonb,
  occurred_at       timestamptz not null default now(),
  constraint data_quality_events_severity_check check (
    severity in ('info', 'warning', 'error')
  )
);
create index data_quality_events_provider_idx on data_quality_events (provider_id);
create index data_quality_events_severity_idx on data_quality_events (severity);

-- APPEND-ONLY temporal provenance. Each row is one OBSERVATION of an upstream
-- record at a point in time. Logical identity is (provider, entity_type,
-- provider_record_id). The idempotency key ALSO includes the payload hash and the
-- processing versions + truth_class, so:
--   * re-fetching the SAME payload (same hash + versions + truth_class) is a no-op
--     (ON CONFLICT DO NOTHING) — idempotent;
--   * a CHANGED payload (different raw_response_hash) inserts a NEW observation —
--     history preserved (e.g. game Scheduled -> Final);
--   * a parser/schema upgrade or truth_class change is DISTINGUISHABLE (new row).
-- Temporal reconstruction: select the latest observation with fetched_at <= asOf.
-- raw_response_hash = SHA-256 hex of the raw response BODY BYTES as received
-- (uncompressed, headers excluded, retrieval timestamp excluded). See ADR-0004.
create table provider_observations (
  id                         uuid primary key default gen_random_uuid(),
  provider_id                uuid not null references providers(id) on delete cascade,
  ingestion_run_id           uuid not null references ingestion_runs(id) on delete cascade,
  entity_type                text not null,
  provider_record_id         text not null,
  entity_id                  uuid,
  fetched_at                 timestamptz not null,
  source_event_ts            timestamptz,
  raw_response_hash          text not null,
  parser_version             text not null,
  normalized_schema_version  text not null,
  truth_class                text not null,
  created_at                 timestamptz not null default now(),
  constraint provider_observations_truth_class_check check (
    truth_class in ('production_real', 'historical_real', 'trial_scrambled', 'fixture', 'simulated')
  ),
  constraint provider_observations_idem unique (
    provider_id, entity_type, provider_record_id,
    raw_response_hash, parser_version, normalized_schema_version, truth_class
  )
);
-- Temporal lookup index for asOf reconstruction.
create index provider_observations_temporal_idx
  on provider_observations (provider_id, entity_type, provider_record_id, fetched_at);
create index provider_observations_entity_idx on provider_observations (entity_id);
