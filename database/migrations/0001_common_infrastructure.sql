-- 0001_common_infrastructure.sql
-- Common, provenance-first infrastructure tables. Sport-specific schemas (MLB,
-- Tennis) are deliberately deferred to Phase 2+. This migration proves the
-- migration runner, canonical-ID strategy, provenance foundations, and the
-- constraints that make ingestion idempotent.
--
-- Conventions:
--   * Canonical internal IDs are UUIDs (gen_random_uuid()). Provider external IDs
--     are stored as text and are NEVER used as canonical internal IDs.
--   * All timestamps are timestamptz.
--   * check constraints mirror the DataTruthClass / enum contracts in code.

create extension if not exists "pgcrypto";

-- Canonical sports (the SportKey universe).
create table sports (
  id          uuid primary key default gen_random_uuid(),
  key         text not null unique,
  name        text not null,
  created_at  timestamptz not null default now(),
  constraint sports_key_check check (key in ('mlb', 'tennis'))
);

-- Providers. `slug` is the internal stable identifier; external provider IDs live
-- on the individual records, never here as a primary key.
create table providers (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique,
  name         text not null,
  sport        text not null,
  truth_class  text not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint providers_sport_check check (sport in ('mlb', 'tennis', 'multi')),
  constraint providers_truth_class_check check (
    truth_class in ('production_real', 'historical_real', 'trial_scrambled', 'fixture', 'simulated')
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

-- One row per ingestion job execution.
create table ingestion_runs (
  id                uuid primary key default gen_random_uuid(),
  provider_id       uuid not null references providers(id) on delete cascade,
  sport             text not null,
  status            text not null default 'running',
  started_at        timestamptz not null default now(),
  finished_at       timestamptz,
  records_ingested  integer not null default 0,
  error             text,
  constraint ingestion_runs_status_check check (
    status in ('running', 'succeeded', 'failed', 'partial')
  ),
  constraint ingestion_runs_sport_check check (sport in ('mlb', 'tennis', 'multi')),
  constraint ingestion_runs_records_nonneg check (records_ingested >= 0)
);
create index ingestion_runs_provider_idx on ingestion_runs (provider_id);
create index ingestion_runs_started_idx on ingestion_runs (started_at);

-- One row per outbound provider request (for observability + rate-limit tracking).
create table provider_requests (
  id                uuid primary key default gen_random_uuid(),
  provider_id       uuid not null references providers(id) on delete cascade,
  ingestion_run_id  uuid references ingestion_runs(id) on delete set null,
  method            text not null,
  url               text not null,
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

-- Provenance for normalized records. Polymorphic by (entity_type, entity_id).
-- The unique constraint makes re-ingesting the same provider record idempotent.
create table source_provenance (
  id                         uuid primary key default gen_random_uuid(),
  provider_id                uuid not null references providers(id) on delete cascade,
  ingestion_run_id           uuid not null references ingestion_runs(id) on delete cascade,
  entity_type                text not null,
  entity_id                  uuid not null,
  provider_record_id         text not null,
  fetched_at                 timestamptz not null,
  source_event_ts            timestamptz,
  parser_version             text not null,
  raw_response_hash          text not null,
  normalized_schema_version  text not null,
  truth_class                text not null,
  created_at                 timestamptz not null default now(),
  constraint source_provenance_truth_class_check check (
    truth_class in ('production_real', 'historical_real', 'trial_scrambled', 'fixture', 'simulated')
  ),
  constraint source_provenance_unique unique (provider_id, entity_type, provider_record_id)
);
create index source_provenance_entity_idx on source_provenance (entity_type, entity_id);
