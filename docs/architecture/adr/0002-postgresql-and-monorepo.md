# ADR-0002: PostgreSQL persistence + TypeScript monorepo

- **Status:** Accepted (provisional; DB-access library finalized in Phase 1)
- **Date:** 2026-07-23

## Context

The legacy Diamond Edge system had **no database** — persistence was an in-memory
TTL cache plus browser `localStorage`. The build spec (§5, §6) makes **persistent
storage and per-record provenance mandatory**, because a projection that cannot be
reproduced is unacceptable. We also must span two sports without entangling their
semantics (§4).

## Decision

1. **PostgreSQL** is the system of record. Normalized common + MLB + tennis entities,
   with dedicated provenance columns/tables. Rationale: relational integrity for
   entity + provenance graphs, strong temporal query support for `asOf` cutoffs, and
   ubiquity of managed Postgres.
2. **TypeScript monorepo** (`apps/`, `packages/`, `services/`, `database/`) with a
   strict dependency rule and pure, dependency-free analytical packages. Rationale:
   preserve and port the legacy pure core; one language end-to-end.
3. The **DB-access library** (Kysely vs Drizzle vs raw SQL + codegen) is decided at
   Phase 1 start after a short spike; SQL-first migrations regardless of choice.

## Consequences

- Ingestion writes normalized rows **plus** provenance; on-demand-only fetching
  (legacy pattern) is replaced by ingest-then-serve.
- Managed Postgres (e.g. Supabase, available in this environment) may host the dev
  DB; schema stays portable to any Postgres so we are not locked in.
- Raw provider payloads are retained (compressed/object storage) for replay and
  parser-regression testing where licensing allows (§27).

## Alternatives considered

- **SQLite/file-backed store** (legacy's deferred `HistoricalStore`): simpler, but
  weak for concurrent ingestion, provenance at scale, and temporal queries. Rejected
  as the system of record; acceptable only for throwaway local spikes.
- **Document store (Mongo):** provenance + relational identity crosswalks are more
  natural in SQL. Rejected.
