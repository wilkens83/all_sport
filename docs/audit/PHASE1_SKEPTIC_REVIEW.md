# Phase 1 — Skeptic Review

**Date:** 2026-07-24 · **Posture:** actively try to prove the Phase 1 completion
claims FALSE, re-verifying against real output rather than trusting the build
narrative. Each claim below was independently exercised.

| #   | Claim under attack                                             | How it was tested                                                                                                      | Result                                                                                                                                                                                                                                                                                                         |
| --- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Clean install works                                            | `pnpm install` from scratch (twice, incl. after version pin change)                                                    | **HOLDS** — installs clean; one real peer-conflict caught (TS 7 vs typescript-eslint) and fixed by pinning TypeScript 5.9.3.                                                                                                                                                                                   |
| 2   | Empty-DB migration works                                       | `drop schema public cascade; create schema public;` (0 tables) → `pnpm db:migrate` → `pnpm db:verify`                  | **HOLDS** — went 0 → 7 tables (6 expected + `schema_migrations`); verify ok.                                                                                                                                                                                                                                   |
| 3   | Migration is idempotent                                        | Ran `db:migrate` again + integration test asserts `applied:[]`, `alreadyApplied:['0001_common_infrastructure']`        | **HOLDS**.                                                                                                                                                                                                                                                                                                     |
| 4   | Tests don't depend on local state                              | Unit tests are pure; integration constraint tests run inside `begin`/`rollback`; inserts use unique suffixes           | **HOLDS**.                                                                                                                                                                                                                                                                                                     |
| 5   | CI isn't green only because integration tests are skipped      | Ran `pnpm test:integration` with **DATABASE_URL unset**                                                                | **HOLDS** — exit code **1**, both integration files **fail** with "DATABASE_URL must be set". `passWithNoTests:false` guards discovery. Skipping is impossible.                                                                                                                                                |
| 6   | Web app actually connects to Postgres                          | Booted `next start`, `curl /api/health/database`                                                                       | **HOLDS** — `{"status":"ok","database":"connected","latencyMs":28}`.                                                                                                                                                                                                                                           |
| 7   | Missing optional Tennis credentials don't crash startup        | `parseServerEnv` unit test with no tennis keys; live app booted with none set                                          | **HOLDS** — parses fine; app renders; providers show "not configured".                                                                                                                                                                                                                                         |
| 8   | Trial/fixture/simulated can't be confused with production-real | `assertRealData` unit tests reject `trial_scrambled`/`fixture`/`simulated`; DB `truth_class` check constraints         | **HOLDS** — both code guard and DB constraint enforce it.                                                                                                                                                                                                                                                      |
| 9   | Secrets are not exposed to the client                          | Health-endpoint tests assert no secret keys; live `grep` of `/api/health/database` for `postgres://`/`password`/dev pw | **HOLDS** — 0 matches; only booleans/latency exposed.                                                                                                                                                                                                                                                          |
| 10  | `main` is the actual default branch                            | Queried repo settings; attempted API change                                                                            | **FALSIFIED / BLOCKED** — default branch is still the feature branch. The agent proxy **blocks repository-settings writes by policy** (HTTP 403, not retried), and no MCP tool sets the default branch. Requires a one-click change by the user in GitHub → Settings → Branches. Tracked as a Phase 1 blocker. |

## Findings & actions

- **Finding A (fixed):** TypeScript `latest` (7.0.2) is ahead of `typescript-eslint`
  (peer `<6.1.0`) and the Next toolchain. Pinned TypeScript to **5.9.3** (latest 5.x,
  fully supported). Documented in the Phase 1 PR.
- **Finding B (fixed):** Turbopack tried to statically resolve
  `new URL("…/database/migrations/", import.meta.url)` as an asset. Rewrote the
  default migrations path with `path.resolve(fileURLToPath(import.meta.url), …)` so
  it is a plain runtime string.
- **Finding C (fixed):** `.js` import specifiers didn't resolve under the Next
  bundler. Switched internal packages to extensionless imports (uniform across tsc,
  Vitest, tsx, Next under `moduleResolution: Bundler`).
- **Finding D (open, external):** default branch cannot be set to `main` from this
  environment (proxy policy blocks settings writes). **Action required by user.**

**Verdict:** Phase 1 infrastructure is verified against real infrastructure. The one
open item (D) is an environment/permissions limitation, not a code defect, and is
surfaced honestly rather than papered over.
