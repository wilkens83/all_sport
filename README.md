<div align="center">

# All-Sport Intelligence Platform

### MLB · ATP Tennis · WTA Tennis — analytics & player-prop intelligence

_A greenfield rebuild whose claims are designed to survive verification._

</div>

---

A professional-grade sports analytics and player-prop intelligence platform for
**MLB** and **ATP/WTA Tennis**, built on **real, traceable, verified data** with a
persistent database, per-record provenance, and backtesting as first-class features.

> **Honesty policy.** This README uses four status categories and never advertises
> planned work as existing. No invented games, players, statistics, projections, or
> provider status. See `docs/` for the full audit trail.

## Status

At **Phase 1 complete** — the engineering foundation. No sport models, dashboards,
or market boards exist yet (that is later, phased work). What exists is verified.

### ✅ Working (verified end-to-end)

- **Monorepo + tooling** — pnpm workspace (`packages/core`, `packages/data-contracts`,
  `packages/db`, `services/ingestion`, `apps/web`), strict TypeScript, ESLint,
  Prettier, Vitest.
- **PostgreSQL foundation** — `docker compose` Postgres; common infrastructure
  schema (migration `0001`: sports, providers, ingestion_runs, provider_requests,
  data_quality_events, source_provenance); transactional, idempotent migration
  runner; schema verified against a live database.
- **Core primitives** — `SportKey`, `DataState`, **`DataTruthClass`** (the
  trial-scrambled quarantine), structured error taxonomy, `asOf` leakage-guard,
  provenance/version + config-checksum helpers.
- **Data contracts** — Zod runtime validation for provider/ingestion/provenance
  objects at the boundary.
- **Web app** — Next.js foundation page + `/api/health` and `/api/health/database`
  endpoints (real DB connectivity, no secrets exposed). Config validation fails
  fast on missing `DATABASE_URL`; missing tennis keys never crash startup.
- **CI** — GitHub Actions runs install → format → lint → typecheck → unit tests →
  DB migration → integration tests (Postgres service) → build.
- **Phase 0 research & audit** — legacy audit; MLB Stats API + Baseball Savant
  **live-verified**; tennis providers documentation-verified; licensing confirmed.

### 🔧 Configurable (implemented later; requires credentials)

- Live Tennis via Sportradar / SportsDataIO / **api-tennis.com (Provider A)** /
  **tennis-api.com via RapidAPI (Provider B)** — each inert without its server-side
  key. (Adapters themselves are not built yet — Phase 6.)

### 🧪 Experimental (exists but under-validated)

- _(none yet)_

### 🗺️ Planned (not implemented)

- Sport-specific schemas, provider ingestion (MLB, Savant), tennis historical
  ingestion, structural tennis simulator, MLB model engine, backtesting/calibration,
  the `/mlb/*` and `/tennis/*` UI, PrizePicks import, correlation + entry builder,
  data-health monitoring. Tracked in `docs/progress/IMPLEMENTATION_PROGRESS.md`.

## Getting started

These commands were run successfully in this environment (Node 22, pnpm 10,
Docker + PostgreSQL 16):

```bash
pnpm install
docker compose up -d postgres            # local Postgres (dev defaults)
cp .env.example .env                      # DATABASE_URL is preset to the compose DB

pnpm db:migrate                           # apply migrations from empty
pnpm db:verify                            # assert the expected schema exists

pnpm test                                 # unit tests (no DB) — 31 tests
pnpm test:integration                     # integration tests (needs Postgres) — 8 tests
pnpm typecheck && pnpm lint && pnpm format:check
pnpm build                                # builds all packages + the Next.js app

pnpm dev                                  # http://localhost:3000
```

Health checks once running:

```bash
curl localhost:3000/api/health            # {"status":"ok","version":"0.1.0",...}
curl localhost:3000/api/health/database   # {"status":"ok","database":"connected",...}
```

## Architecture

```text
apps/web/                  Next.js app (foundation page + health endpoints)
packages/core/             SportKey, DataState, DataTruthClass, errors, asOf, provenance
packages/data-contracts/   Zod schemas for provider/ingestion/provenance objects
packages/db/               Kysely client + typed schema + migration runner + verify
services/ingestion/        migration/verify CLI (idempotent; no scheduler yet)
database/migrations/       versioned .sql migrations
database/schemas/          schema documentation
docs/                      research / audit / architecture / engineering / progress
```

See `docs/architecture/ARCHITECTURE_PROPOSAL.md` and the ADRs
(`docs/architecture/adr/`) for the design and its rationale (PostgreSQL, Kysely,
monorepo).

## Data sources (verified 2026-07-23)

| Source                                | Sport               | Status                                       | Note                                          |
| ------------------------------------- | ------------------- | -------------------------------------------- | --------------------------------------------- |
| MLB Stats API (`statsapi.mlb.com`)    | MLB                 | **LIVE-verified**, keyless                   | Commercial-use caveat (risk R-01).            |
| Baseball Savant                       | MLB                 | **LIVE-verified**, keyless                   | Statcast enrichment; polite access only.      |
| Sportradar Tennis v3                  | Tennis              | doc-verified; **needs key**                  | Primary live candidate.                       |
| SportsDataIO Tennis                   | Tennis              | doc-verified; **needs key**                  | Odds source; trial data is `trial_scrambled`. |
| api-tennis.com (Provider A)           | Tennis              | doc-verified; **needs key** (`APIkey`)       | Distinct vendor from tennis-api.com.          |
| tennis-api.com via RapidAPI (Prov. B) | Tennis              | doc-verified; **needs key** (`X-RapidAPI-*`) | Distinct vendor from api-tennis.com.          |
| Jeff Sackmann / Tennis Abstract       | Tennis (historical) | available; **CC BY-NC-SA (non-commercial)**  | Backtesting/research plane only (risk R-02).  |

Full details: [`docs/research/SOURCE_REGISTRY.md`](docs/research/SOURCE_REGISTRY.md).

## Documentation

- Audit: [`LEGACY_SYSTEM_AUDIT`](docs/audit/LEGACY_SYSTEM_AUDIT.md) · [`RISK_REGISTER`](docs/audit/RISK_REGISTER.md) · [`PHASE1_SKEPTIC_REVIEW`](docs/audit/PHASE1_SKEPTIC_REVIEW.md)
- Research: [`SOURCE_REGISTRY`](docs/research/SOURCE_REGISTRY.md) · [`TENNIS_PROVIDER_DECISION`](docs/research/TENNIS_PROVIDER_DECISION.md) · [`EXTERNAL_CREDENTIALS`](docs/research/EXTERNAL_CREDENTIALS.md)
- Architecture: [`ARCHITECTURE_PROPOSAL`](docs/architecture/ARCHITECTURE_PROPOSAL.md) · [ADRs](docs/architecture/adr/)
- Engineering: [`SKILLS_AND_AGENTS`](docs/engineering/SKILLS_AND_AGENTS.md) · [`TEST_RUNNER`](docs/engineering/TEST_RUNNER.md)
- Progress: [`IMPLEMENTATION_PROGRESS`](docs/progress/IMPLEMENTATION_PROGRESS.md)

## Licensing note

A code license is intentionally **not yet chosen** — coupled to the
commercial-vs-research posture, which depends on data-source licensing. See
[`docs/LICENSE_DECISION.md`](docs/LICENSE_DECISION.md).

## Disclaimer

Research and modeling tool for informational purposes. **Not betting advice.**
Gambling involves risk. 21+. Nothing here guarantees any outcome.
