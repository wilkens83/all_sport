# ADR-0004: Temporal provenance, idempotency, and secret-safe request metadata

- **Status:** Accepted
- **Date:** 2026-07-24
- **Supersedes:** the provenance/idempotency parts of migration 0001 as originally written
- **Context for:** ADR-0002 (PostgreSQL), a Phase 1 hardening pass

## Context

An independent architecture review found four defects in the first cut of migration
0001 that would corrupt everything built on top of it:

1. `provider_requests.url text` could persist an API key (many providers authenticate
   via query params / URL tokens / signed URLs).
2. `unique (provider_id, entity_type, provider_record_id)` on provenance treated an
   upstream record as single-state. But records legitimately change over time
   (game Scheduled → In Progress → Final; probable pitcher A → B; lineup Projected →
   Confirmed → Corrected; tennis match Scheduled → Live → Completed). Enforcing that
   uniqueness forces destructive UPSERTs and erases the history backtesting needs.
3. `providers.truth_class` implied a vendor has one fixed truth class, but a vendor
   can operate in multiple modes (trial vs production credential).
4. `raw_response_hash` had no defined semantics.

The foundational invariant we must preserve:

> **What did we know about entity X as of timestamp T? — answered using only
> observations first fetched at or before T.**

## Decision

### 1. Secret-safe request metadata (no raw URLs)

`provider_requests` stores `method`, `host`, `path`, `sanitized_query` — never a raw
URL, never headers. `packages/core/sanitizeRequestUrl` splits a URL and replaces the
value of any sensitive query parameter with `[REDACTED]`. Sensitivity is decided by a
normalized name check (lowercase, strip non-alphanumerics) against an exact set
(`apikey`, `key`, `token`, `accesstoken`, `authorization`, `xapikey`, `xrapidapikey`,
`signature`, `sig`, `secret`, `password`, …) plus substring rules (`secret`, `token`,
`password`, `apikey`, `signature`, `authorization`). Authorization and all other
headers are never persisted. Provider keys must never enter the database, logs, error
context, telemetry, or health responses.

Known limitation: a secret embedded directly in a URL **path segment** (a signed-URL
style token) is not auto-redacted — none of our selected providers do this (Sportradar
`?api_key=`, api-tennis `?APIkey=`, tennis-api.com and SportsDataIO use headers). If a
future provider embeds secrets in the path, add a path redactor before wiring it.

### 2. Append-only temporal observations

Provenance becomes `provider_observations` — **append-only**. Each row is one
observation of an upstream record at a point in time.

- **Logical identity:** `(provider_id, entity_type, provider_record_id)`.
- **Observed version:** `fetched_at`, `raw_response_hash`, `parser_version`,
  `normalized_schema_version`, `truth_class`.
- **Idempotency key (unique):**
  `(provider_id, entity_type, provider_record_id, raw_response_hash, parser_version,
normalized_schema_version, truth_class)`.

Behavior — the exact distinction the reviewer asked us to explain:

| Case                                                                            | raw_response_hash                | Result                                                                                        |
| ------------------------------------------------------------------------------- | -------------------------------- | --------------------------------------------------------------------------------------------- |
| **same upstream record + UNCHANGED payload** (same hash, versions, truth class) | identical                        | `ON CONFLICT DO NOTHING` — **no new row** (idempotent). The earliest observation is retained. |
| **same upstream record + CHANGED payload** (different hash)                     | differs                          | **new observation row** — the prior state is preserved for temporal replay.                   |
| parser or schema **upgrade** on the same payload                                | same hash, different version     | **new, distinguishable row**.                                                                 |
| **truth-class change** (trial → production) on the same payload                 | same hash, different truth_class | **new, distinguishable row**.                                                                 |

Temporal reconstruction (`getObservationAsOf`): select the row for the record with
the greatest `fetched_at ≤ asOf`. A row first fetched after `asOf` can never be
returned. This is the no-future-leakage primitive the models will build on.

### 3. Truth class is per-observation, not per-provider identity

`providers.truth_class` → `providers.default_truth_class` (a declared default only).
The **authoritative** truth class lives on each `ingestion_run` and each
`provider_observation`. A future provider-credential/access concept will carry the
configured mode; for now the run records `access_mode` (`trial`/`production`/…) and
its own `truth_class`, and every observation carries the truth class it was produced
under. Provider identity ≠ data truth classification.

### 4. `raw_response_hash` semantics

`raw_response_hash` = **SHA-256, hex-encoded**, of the **raw response body bytes as
received** — uncompressed, **headers excluded**, retrieval timestamp excluded. It is
computed **before normalization** on the exact bytes (so JSON key-order differences in
the upstream body are reflected as-is; we do not canonicalize the provider body).
Implemented with `node:crypto` (`packages/db/sha256Hex`); we never invent a checksum.
(The unrelated `configChecksum` in `packages/core` uses FNV-1a and is only for config
identity, never for provenance payloads.)

### 5. Ingestion-run configuration snapshot

`ingestion_runs` records the run context (never credentials): `adapter_version`,
`access_mode`, `truth_class`, `status`, `started_at`/`finished_at`, `request_count`,
`records_observed`, `records_normalized`, `records_rejected`, `error`.

### 6. Observation → Normalizer → Canonical entity boundary

`provider_observations` is the append-only record of upstream states. Canonical
domain entities (Phase 2) will be separate, normalized rows carrying current truth,
linked back via `provider_observations.entity_id` (nullable now; a FK is added when
canonical tables exist). Provenance is not an afterthought bolted onto a mutable row.

## Migration strategy

The repository is pre-production and migration 0001 was never deployed to any real
database (Phase 1 is an unmerged draft). We therefore **amended 0001** rather than
stack a corrective 0002 — the cleanest long-term schema, no fake backward
compatibility. Migration-from-zero is re-proven in CI and locally.

## Consequences

- Backtesting, no-future-leakage, model reconstruction, auditing, and debugging can
  all ask "what did we know as of T?" and get a correct answer.
- Ingestion is idempotent on unchanged payloads yet never destroys history.
- Secrets cannot reach the database through request metadata.
