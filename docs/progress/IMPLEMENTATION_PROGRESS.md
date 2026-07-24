# Implementation Progress

Living development journal. Statuses are used **precisely** — "DONE" is never used
loosely; a feature is `VERIFIED` only when it survives verification against real
data + tests + skeptic review (spec §32, §36).

## Status legend

- `NOT_STARTED`
- `RESEARCHING`
- `IMPLEMENTING`
- `BLOCKED_EXTERNAL_CREDENTIAL`
- `IMPLEMENTED_NOT_VERIFIED`
- `VERIFIED`
- `FAILED_VALIDATION`

## Phase status

| Phase | Description                                           | Status                        | Notes                                                                                                                                                                                                                                                                                                                          |
| ----- | ----------------------------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 0     | Research + legacy audit                               | **VERIFIED**                  | This session. Audit, provider research, architecture proposal, risk register, credentials list, skills inventory all produced; MLB + Savant live-verified; tennis providers doc-verified; Sackmann license flagged.                                                                                                            |
| 1     | Repo + architecture + CI + DB                         | **VERIFIED**                  | Monorepo (pnpm), strict TS, Kysely+Postgres (migration 0001), idempotent runner, Zod contracts, core primitives + DataTruthClass, Next.js health app, GitHub Actions gates. 39 tests (31 unit + 8 integration). Skeptic-reviewed (`docs/audit/PHASE1_SKEPTIC_REVIEW.md`). Open: default-branch change blocked by proxy policy. |
| 2     | Canonical entities + provenance + provider interfaces | `NOT_STARTED`                 |                                                                                                                                                                                                                                                                                                                                |
| 3     | MLB ingestion (prove with real data)                  | `NOT_STARTED`                 | Unblocked (MLB API live).                                                                                                                                                                                                                                                                                                      |
| 4     | MLB Statcast enrichment                               | `NOT_STARTED`                 | Unblocked (Savant reachable).                                                                                                                                                                                                                                                                                                  |
| 5     | Tennis historical ingestion (Sackmann)                | `NOT_STARTED`                 | Research plane; NC license (R-02).                                                                                                                                                                                                                                                                                             |
| 6     | Tennis live provider integration                      | `BLOCKED_EXTERNAL_CREDENTIAL` | No Sportradar/SportsDataIO/API-Tennis key.                                                                                                                                                                                                                                                                                     |
| 7     | MLB analytics/model engine                            | `NOT_STARTED`                 | Port pure core; gate on baselines.                                                                                                                                                                                                                                                                                             |
| 8     | Tennis structural simulator                           | `NOT_STARTED`                 | Port legacy structural sim; validate invariants.                                                                                                                                                                                                                                                                               |
| 9     | Backtesting + calibration                             | `NOT_STARTED`                 | Mandatory before "production-ready".                                                                                                                                                                                                                                                                                           |
| 10    | Frontend foundation                                   | `NOT_STARTED`                 | No fixtures in production.                                                                                                                                                                                                                                                                                                     |
| 11    | MLB complete UI                                       | `NOT_STARTED`                 |                                                                                                                                                                                                                                                                                                                                |
| 12    | Tennis complete UI                                    | `NOT_STARTED`                 | Consumes tennis backend only.                                                                                                                                                                                                                                                                                                  |
| 13    | PrizePicks market-line ingestion                      | `NOT_STARTED`                 | Manual/CSV/PDF first; identity resolution.                                                                                                                                                                                                                                                                                     |
| 14    | Probability vs line analysis                          | `NOT_STARTED`                 | P(More)/P(Less)/fair line/edge/confidence/quality.                                                                                                                                                                                                                                                                             |
| 15    | Correlation engine                                    | `NOT_STARTED`                 | Before entry builder.                                                                                                                                                                                                                                                                                                          |
| 16    | Entry analysis/builder                                | `NOT_STARTED`                 | No profitability promises.                                                                                                                                                                                                                                                                                                     |
| 17    | Data health + monitoring                              | `NOT_STARTED`                 | Real operational metrics; break-a-provider test.                                                                                                                                                                                                                                                                               |
| 18    | Security + performance audit                          | `NOT_STARTED`                 |                                                                                                                                                                                                                                                                                                                                |
| 19    | Full independent QA (skeptic)                         | `NOT_STARTED`                 | No trust in prior summaries.                                                                                                                                                                                                                                                                                                   |

## Live data status (as of 2026-07-23)

- **MLB:** LIVE-VERIFIED. `statsapi.mlb.com` and `baseballsavant.mlb.com` reachable
  (HTTP 200) with real data (today's 5 games, 2025-06-15 15 games, Aaron Judge profile).
- **Tennis:** LIVE = `BLOCKED_EXTERNAL_CREDENTIAL` (no provider key). HISTORICAL =
  available via Sackmann but non-commercial (research plane only).

## Change log

- **2026-07-24 — Phase 1 hardening/VERIFIED.** Fixed six architecture-review defects
  in migration 0001 before any sport tables depend on it: (1) `provider_requests` no
  longer stores raw URLs — split to `host`/`path`/`sanitized_query` with a mandatory
  secret redactor (`packages/core/sanitizeRequestUrl`); (2) provenance is now the
  append-only `provider_observations` with an idempotency key that preserves temporal
  history (payload hash + parser/schema versions + truth class), plus
  `getObservationAsOf` for no-future-leakage reconstruction; (3) `providers.truth_class`
  → `default_truth_class` (authoritative class per run/observation); (4)
  `ingestion_runs` gains a context snapshot (adapter_version, access_mode, truth_class,
  counters); (5) `raw_response_hash` defined as SHA-256 of raw body bytes (`node:crypto`);
  (6) observation→normalizer→canonical boundary established. ADR-0004 added. Migration 0001
  amended (pre-production; cleanest schema). 51 tests (38 unit + 13 integration incl.
  adversarial A–F); migration-from-zero re-proven (0→7 tables); build green. Skeptic
  review extended with 6 new attacks (all held).
- **2026-07-24 — Phase 1 complete/VERIFIED.** Monorepo skeleton (`packages/core`,
  `packages/data-contracts`, `packages/db`, `services/ingestion`, `apps/web`), pnpm
  workspace, strict TypeScript (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`),
  ESLint + Prettier + Vitest. PostgreSQL system of record via Kysely (ADR-0003);
  migration `0001` (sports, providers, ingestion_runs, provider_requests,
  data_quality_events, source_provenance) with a transactional, idempotent runner;
  Zod contracts; error taxonomy; `DataTruthClass` quarantine; `asOf` leakage guard;
  Next.js foundation page + `/api/health` + `/api/health/database`; config
  validation (fail-fast on `DATABASE_URL`, optional tennis keys never crash). CI
  runs install→format→lint→typecheck→unit→migrate→verify→integration→build. 39
  tests pass (31 unit + 8 integration). Verified against a live Postgres; app boots
  and reports DB connectivity. Skeptic review recorded. Blocker: default branch
  cannot be set to `main` from this environment (proxy blocks settings writes).
- **2026-07-23 — Phase 0 complete/VERIFIED.** Cloned + audited legacy `wilkens83/MLB`
  (`c2d3ecd`); reviewed PR #1/#2/#3. Live-verified MLB Stats API + Baseball Savant.
  Doc-verified Sportradar / SportsDataIO / API-Tennis coverage. Confirmed Sackmann
  CC BY-NC-SA (non-commercial) license. Produced: LEGACY_SYSTEM_AUDIT, SOURCE_REGISTRY,
  TENNIS_PROVIDER_DECISION, EXTERNAL_CREDENTIALS, SKILLS_AND_AGENTS, ARCHITECTURE_PROPOSAL
  (+ ADR-0001/0002), RISK_REGISTER. No production code written (per §44: Phase 0 only).
