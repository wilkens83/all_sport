# Common Schema (migration 0001)

Provenance-first infrastructure tables shared by all sports. Sport-specific
schemas (MLB, Tennis) arrive in Phase 2+. Source of truth: PostgreSQL. Canonical
internal IDs are UUIDs; provider external IDs are stored as text on records and
are never used as canonical keys. See ADR-0004 for the temporal-provenance,
idempotency, secret-redaction, and truth-class design.

| Table                   | Purpose                                                                              | Key constraints                                                                                                                                                                                                                                                                      |
| ----------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `sports`                | Canonical sports (SportKey universe).                                                | `key` unique; check `key in ('mlb','tennis')`.                                                                                                                                                                                                                                       |
| `providers`             | Registered data providers.                                                           | `slug` unique; `sport` ∈ mlb/tennis/multi; **`default_truth_class`** (declared default only) ∈ DataTruthClass; `updated_at` auto-maintained by trigger.                                                                                                                              |
| `ingestion_runs`        | One row per ingestion-job execution — a context snapshot (never credentials).        | FK → providers (cascade); `status` ∈ running/succeeded/failed/partial; `truth_class` ∈ DataTruthClass; `access_mode` ∈ trial/production/historical/fixture/none or null; `adapter_version`; counters `request_count`/`records_observed`/`records_normalized`/`records_rejected` ≥ 0. |
| `provider_requests`     | One row per outbound provider call — **secret-safe**.                                | FK → providers/ingestion_runs; stores `host`/`path`/`sanitized_query` (**no raw URL, no headers**); `truth_class` check; `latency_ms ≥ 0` when present.                                                                                                                              |
| `data_quality_events`   | Observed data-quality signals.                                                       | FK → providers/ingestion_runs (set null); `severity` ∈ info/warning/error.                                                                                                                                                                                                           |
| `provider_observations` | **Append-only** temporal provenance — one row per observation of an upstream record. | FK → providers, ingestion_runs (cascade); **unique idempotency key** (provider_id, entity_type, provider_record_id, raw_response_hash, parser_version, normalized_schema_version, truth_class); `truth_class` check; `entity_id` nullable (canonical FK added Phase 2).              |
| `schema_migrations`     | Migration ledger (created by the runner).                                            | `version` primary key.                                                                                                                                                                                                                                                               |

## Design notes

- **Idempotency without history loss (ADR-0004).** The same upstream record with an
  **unchanged** payload (same hash + versions + truth class) is a no-op
  (`ON CONFLICT DO NOTHING`). A **changed** payload (different `raw_response_hash`)
  inserts a **new** observation, preserving the earlier state. Parser/schema upgrades
  and truth-class changes are likewise distinguishable new rows.
- **Temporal reconstruction.** `getObservationAsOf` returns the latest observation with
  `fetched_at ≤ asOf`; a row fetched after `asOf` is never returned (no future leakage).
- **`raw_response_hash`** = SHA-256 hex of the raw response body bytes (uncompressed,
  headers excluded), computed before normalization.
- **Secrets never persisted.** `provider_requests` stores redacted request metadata via
  `packages/core/sanitizeRequestUrl`; provider keys never enter DB/logs/telemetry.
- **Truth class is per-observation.** Provider identity ≠ data truth classification; a
  vendor can run in trial vs production mode. The authoritative class is on the run and
  the observation, not the provider row.
- **Provider ID separation.** `providers.slug` is the internal identity; a provider's
  own record IDs live per-observation (`provider_record_id`), never as canonical keys.
- **Runner idempotency.** The migration runner records applied versions in
  `schema_migrations` and skips them on re-run (`packages/db/src/migrator.ts`).
