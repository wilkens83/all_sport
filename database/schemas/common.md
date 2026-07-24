# Common Schema (migration 0001)

Provenance-first infrastructure tables shared by all sports. Sport-specific
schemas (MLB, Tennis) arrive in Phase 2+. Source of truth: PostgreSQL. Canonical
internal IDs are UUIDs; provider external IDs are stored as text on records and
are never used as canonical keys.

| Table                 | Purpose                                                                               | Key constraints                                                                                                                                  |
| --------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `sports`              | Canonical sports (SportKey universe).                                                 | `key` unique; check `key in ('mlb','tennis')`.                                                                                                   |
| `providers`           | Registered data providers.                                                            | `slug` unique; `sport` ∈ mlb/tennis/multi; `truth_class` ∈ DataTruthClass; `updated_at` auto-maintained by trigger.                              |
| `ingestion_runs`      | One row per ingestion-job execution.                                                  | FK → providers (cascade); `status` ∈ running/succeeded/failed/partial; `records_ingested >= 0`.                                                  |
| `provider_requests`   | One row per outbound provider call.                                                   | FK → providers (cascade), → ingestion_runs (set null); `truth_class` check; `latency_ms >= 0` when present.                                      |
| `data_quality_events` | Observed data-quality signals.                                                        | FK → providers/ingestion_runs (set null); `severity` ∈ info/warning/error.                                                                       |
| `source_provenance`   | Provenance attached to normalized records (polymorphic by `entity_type`/`entity_id`). | FK → providers, ingestion_runs (cascade); **unique (provider_id, entity_type, provider_record_id)** → idempotent ingestion; `truth_class` check. |
| `schema_migrations`   | Migration ledger (created by the runner).                                             | `version` primary key.                                                                                                                           |

## Design notes

- **Idempotent ingestion.** Re-ingesting the same provider record for the same
  `(provider, entity_type, provider_record_id)` is a no-op/upsert target thanks to
  the `source_provenance_unique` constraint.
- **Provider ID separation.** `providers.slug` is the internal identity; a
  provider's own record IDs are stored per-record (`provider_record_id`), never as
  canonical keys.
- **Truth-class quarantine at the row level.** `provider_requests` and
  `source_provenance` both carry `truth_class`, so scrambled/trial/fixture data is
  labeled in the database and can be filtered out of production analytics.
- **Runner idempotency.** The migration runner records applied versions in
  `schema_migrations` and skips them on re-run (see `packages/db/src/migrator.ts`).
