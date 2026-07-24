# Architecture Proposal

**Status:** Phase 0 proposal (to be ratified before Phase 1) · **Date:** 2026-07-23

Multi-sport (MLB + ATP/WTA Tennis) analytics & player-prop intelligence platform,
built from first principles with a **database, provenance, and backtesting as
first-class citizens**. This proposal turns the build spec (§4–§6) into a concrete,
buildable structure.

## 1. Principles

1. **Multi-sport from the foundation.** Share infrastructure (DB, providers, odds,
   observability, backtesting); do **not** share sport-specific semantics. MLB and
   tennis are siblings, never entangled.
2. **Every record is traceable.** No normalized row exists without provenance
   (provider, provider record id, fetched_at, ingestion run, parser version, raw
   payload hash, schema version). No projection exists without a reproducible
   version stamp (data cutoff, model/feature/sim versions, config checksum, seed).
3. **Explicit `asOf` everywhere.** All analytics take a cutoff; models may only read
   data that existed before it. Leakage is a tested invariant, not a hope.
4. **Honest states.** LIVE / RECENT / HISTORICAL / STALE / SIMULATED / UNAVAILABLE
   are distinct and never mixed invisibly. No fixtures in production paths.
5. **No number without a lineage.** Every displayed probability/edge/rating traces
   to real inputs.

## 2. Target monorepo layout

```text
apps/
  web/                      Next.js app (MLB + Tennis, one app, sport switcher)
packages/
  core/                    SportKey, shared types, math (ported stats.ts), utils
  data-contracts/          Zod runtime schemas + normalized domain types + versions
  analytics/               hit-rate windows, form, consistency (sport-neutral)
  simulation/              simulate() + summarizeSamples() seam
  markets/                 market catalog: market -> model + validation + DoD gates
  odds/                    American/decimal/implied, no-vig, EV, Kelly, CLV, arb
  backtesting/             walk-forward harness, calibration, Brier/logloss/MAE/RMSE
  observability/           structured logging, correlation IDs, metrics
  sports/
    mlb/                   MLB domain + projection/models (ported + rewritten)
    tennis/                Tennis domain + structural sim + Elo + features
  providers/
    mlb-stats/             MLB Stats API client -> normalize -> persist + provenance
    baseball-savant/       Statcast ingestion -> persist + provenance
    sportradar-tennis/     inert until SPORTRADAR_TENNIS_API_KEY (BLOCKED)
    sportsdataio-tennis/   inert until SPORTSDATAIO_TENNIS_API_KEY (BLOCKED)
    api-tennis/            inert until API_TENNIS_API_KEY (BLOCKED)
    tennis-historical/     Sackmann CSV (NON-COMMERCIAL, research plane)
    prizepicks/            manual + CSV/PDF MarketLine import (no automation yet)
services/
  ingestion/               idempotent ingestion jobs (schedules, rosters, stats)
  projections/             projection generation writing projection_snapshots
  workers/                 scheduled/queued execution
database/
  migrations/              versioned SQL migrations
  schemas/                 canonical schema docs
docs/                      research / audit / architecture / engineering / progress
```

**Dependency rule (enforced, eventually by lint):** `apps` → `packages`/`services`;
`services` → `packages`; `providers` → `data-contracts` + `core`; **no package
imports a sibling sport's internals**; pure packages (`core/math`, `odds`,
`simulation`, `analytics`) stay dependency-free and browser/edge-safe.

## 3. Technology choices (provisional — see ADR-0002)

| Concern       | Choice                                                                   | Why                                                                     |
| ------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| Language      | TypeScript (strict)                                                      | Continuity with legacy core; one language across app+services.          |
| App framework | Next.js (App Router)                                                     | Reuse legacy design system + SSR; single multi-sport app.               |
| Database      | **PostgreSQL**                                                           | Mandated (§5); relational fit for entities + provenance + time queries. |
| Migrations    | SQL-first migrations in `database/migrations`                            | Explicit, reviewable, reproducible.                                     |
| DB access     | Typed query layer (e.g. Kysely/Drizzle — decide in Phase 1)              | Type-safe SQL without hiding it.                                        |
| Validation    | Zod at every provider boundary                                           | Ported pattern; reject malformed, degrade gracefully.                   |
| Cache         | TTL cache in front of providers (ported), Postgres as system of record   | Freshness without hammering providers.                                  |
| Tests         | Unit + contract + integration + model + leakage + API + E2E (Playwright) | Spec §29 pyramid.                                                       |
| CI            | GitHub Actions (install/format/lint/typecheck/unit/integration/build)    | Spec §31 gates.                                                         |

> Managed-Postgres options (e.g. Supabase) are available in this environment and may
> back the dev database; the schema stays portable to any Postgres. Decided in Phase 1.

## 4. Data model (high level — full DDL in Phase 1/2)

**Common:** `sports`, `providers`, `provider_requests`, `ingestion_runs`,
`data_quality_events`, `model_versions`, `projections`, `projection_snapshots`,
`market_lines`, `source_provenance`.

**MLB:** `teams`, `players`, `games`, `rosters`, `player_game_stats`,
`pitcher_game_stats`, `batter_game_stats`, `statcast_events`, `probable_pitchers`,
`lineups`, `venues`.

**Tennis:** `players`, `tours`, `tournaments`, `tournament_editions`, `matches`,
`match_players`, `match_stats`, `rankings`, `surfaces`, `rounds`, `venues`,
`point_stats` (coverage-permitting), `player_surface_aggregates`.

**Identity:** provider IDs and internal canonical IDs are **separate**. A
`canonical_player` ↔ `provider_identity(provider, provider_player_id)` crosswalk
resolves entities on evidence (IDs, DOB, nationality, tour, ranking history) and
returns `IDENTITY_UNRESOLVED` when ambiguous — never a name-only join.

**Provenance:** every important normalized record carries
`source_provenance(provider, provider_record_id, fetched_at, source_event_ts,
ingestion_run_id, parser_version, raw_response_hash, normalized_schema_version)`.
Projections additionally carry `data_cutoff_ts, model_version, feature_version,
simulator_version, config_checksum, random_seed`.

## 5. Modeling planes

- **MLB:** per-market distribution family (Poisson/negbinom/Bernoulli/normal),
  recency + Bayesian shrinkage + traceable context, Monte Carlo → distribution,
  P(over/under), fair line. Each market gated by pipeline+features+model+validation+UI+tests.
- **Tennis:** **structural** point→game→tiebreak→set→match simulation parameterized
  by surface-aware serve/return strength + Elo/surface-Elo. Totals/sets/aces emerge
  from the sim, never a naïve normal.
- **Uncertainty is 3-way:** probability vs model confidence vs data quality; edge =
  model prob − market-implied prob. Poor data quality caps recommendations.

## 6. Backtesting & calibration (first-class)

Walk-forward: train on data strictly before T, predict event at T, advance.
Metrics: calibration by bucket, Brier, log loss, MAE/RMSE, interval coverage,
directional accuracy. Every model must beat named baselines (season/rolling/Poisson
for MLB; ranking/Elo/surface-Elo for tennis). ROI/EV only where **real** historical
market prices exist. Results gate "production-ready".

## 7. Phasing alignment

This layout maps 1:1 to the spec's phases: Phase 1 stands up `apps/web`, `packages/core`,
`database/migrations`, and CI; Phases 2–6 fill `data-contracts` + providers; Phases
7–9 fill `sports/*`, `markets`, `simulation`, `backtesting`; Phases 10–17 build the
UI, PrizePicks, correlation, and data-health on top.

## 8. What is intentionally deferred

- Auth / multi-user accounts (not required by spec; entry builder stays client-side).
- Automated PrizePicks ingestion (manual/CSV/PDF first; automation only after
  authorization is verified).
- Live tennis (BLOCKED_EXTERNAL_CREDENTIAL until a key exists).
