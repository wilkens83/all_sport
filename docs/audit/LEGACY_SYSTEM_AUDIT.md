# Legacy System Audit — `wilkens83/MLB` (Diamond Edge)

**Status:** Phase 0 · **Date:** 2026-07-23 · **Method:** direct source inspection of
a shallow clone at commit `c2d3ecd` (head of PR #1 branch `claude/init-lix48b`),
plus review of PR #1, PR #2 (merged), PR #3 (reverted) and the repo's own
`docs/tennis/*`.

> **Guiding rule (from the build spec):** _No component may be copied because the
> old PR says it is "production-grade."_ Every classification below was formed by
> reading the file, not by trusting a PR description. Nothing is marked KEEP unless
> it is genuinely sport-neutral and testable.

## 1. What the legacy system actually is

A **single Next.js 16 / React 19 / TypeScript** application (`mlb-props-platform`),
Tailwind v4, TanStack Query, Recharts. **~180 source files, ~11k LOC in `src/lib`.**

- **No database.** Persistence = in-memory TTL cache (`src/lib/mlb/client.ts`) +
  client `localStorage`. Confirmed by the repo's own audit and by inspection.
- **No auth, no job scheduler, no CI/CD.** Tests run via `bun test src` manually.
- **MLB data is real and live** (public MLB Stats API + Baseball Savant CSV).
- **Tennis is architecturally complete but runs on FIXTURES + historical CSV** —
  there is **no live tennis provider** wired (no credentials). PR #2 exposed tennis
  in the UI but explicitly shows "Live Tennis provider not configured".
- The analytics **math core is pure and dependency-free** (runs under Bun and in the
  browser) — this is the legacy system's genuine crown jewel.

Pitch claims in the README ("10,000-iteration Monte Carlo", "25 prop markets",
"positive-EV signals") are backed by real code, but the whole thing is **stateless**
and **has no persistence/provenance layer** — the exact gap the new spec targets.

## 2. Classification

### KEEP — proven, reusable, sport-neutral (port with light adaptation)

These modules carry **zero baseball knowledge**, are pure, and are unit-tested.
They are the reusable substrate for a multi-sport platform. "KEEP" means _port the
logic into the new `packages/` with tests re-run_, not copy blindly.

| Legacy path                                             | LOC | Why KEEP                                                                                                                       | New home                  |
| ------------------------------------------------------- | --- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------- |
| `src/lib/math/stats.ts`                                 | 309 | Pure distributions (Poisson/negbinom/normal/Beta), `mulberry32` seeded RNG, EWMA, special functions. No domain.                | `packages/core` (math)    |
| `src/lib/odds/math.ts`                                  | 132 | American↔decimal↔implied, no-vig, EV, edge, Kelly, CLV, arbitrage. Sport-agnostic.                                             | `packages/odds`           |
| `src/lib/analytics/hitRate.ts`                          | 228 | Hit-rate windows, streaks, trend, consistency over `number[]`.                                                                 | `packages/analytics`      |
| `src/lib/prediction/simulate.ts`                        | 318 | `simulate(projection)` + `summarizeSamples(samples[])` — the seam any structural sim feeds.                                    | `packages/simulation`     |
| `src/lib/tennis/model/simulator.ts`                     | 321 | Structural point→game→tiebreak→set→match Monte Carlo; seeded; best-of-3/5. The correct tennis idea the spec demands preserved. | `packages/sports/tennis`  |
| `src/lib/tennis/model/rating.ts`                        | 233 | Elo + surface-Elo, chronological replay, `getPlayerRatingBefore` (no leakage), no walkover update.                             | `packages/sports/tennis`  |
| `src/lib/tennis/model/features.ts`                      | 459 | Windowed features returning `{value,sampleSize,source,freshness,missingReason}` — matches spec §16 exactly.                    | `packages/sports/tennis`  |
| Zod boundary-validation pattern (`schemas/validate.ts`) | —   | Generic safe-parse + graceful degradation.                                                                                     | `packages/data-contracts` |

**Caveat on KEEP:** these are kept as _starting implementations_, still subject to
re-review by the quantitative/skeptic roles and re-tested under the new package
layout. KEEP ≠ frozen.

### REWRITE — concept is right, implementation inadequate for the new spec

| Legacy path                                                              | Why REWRITE                                                                                                                                                                                                                                                 |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/mlb/{client,api,analysis,series,slate,market}.ts`               | Solid live MLB client, but stateless: no persistence, no provenance, no `provider_requests`/`ingestion_runs`, no raw-payload retention. New spec requires all of these. Reimplement as a `providers/mlb-stats` package writing to Postgres with provenance. |
| `src/lib/providers/statcast.ts`, `savantClient.ts`                       | Good Savant access; must become a persisted, cached, provenance-tracked ingestion path, not an on-demand fetch.                                                                                                                                             |
| `src/lib/props/catalog.ts` (377)                                         | Good prop→distribution-family registry, but MLB-only and not tied to per-market validated models/backtests. Rebuild as `packages/markets` with per-market model + validation + UI + tests gating each market (spec §14 DoD).                                |
| `src/lib/prediction/{projection,paSim,engine,adjustments}.ts`            | The projection engine is genuinely good but must gain: explicit `asOf` cutoff everywhere (leakage safety §13), model/feature/sim versioning + config checksum, and calibration/backtest gating (§19,§21) before any market is "supported".                  |
| `src/lib/prizepicks/*`                                                   | Adapter discipline is right; rewrite around the new `MarketLine` contract + canonical identity resolution + CSV/PDF import with formula-injection defense.                                                                                                  |
| `src/lib/tennis/model/{markets,assessment,matchModel,config,version}.ts` | Keep the structure; rewire to consume DB-backed real data + provenance instead of fixtures; wire calibration/backtest gating.                                                                                                                               |
| `src/lib/sports/*` registry                                              | Right idea (`SportKey`, `SportDefinition`, adapter). Rebuild as `packages/core` sport abstraction spanning DB-backed sports, not an in-app registry.                                                                                                        |
| Frontend (`src/app/*`, `src/components/*`, 44 tsx)                       | Reuse the design system + chart components + honest empty-states; rebuild routing to the spec's `/mlb/*` and `/tennis/*` route map (§24) against real API/DB.                                                                                               |

### RESEARCH — cannot safely reuse until externally validated

| Item                                                              | Why RESEARCH                                                                                                                                                                                            |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/tennis/providers/{sportradar,sportsDataIo,apiTennis}.ts` | Inert credential-gated adapters written **without ever seeing a real response**. The upstream→domain mapping is unverified and may be wrong. Do NOT reuse until validated against a live key (Phase 6). |
| `src/lib/tennis/providers/historicalCsv.ts` (235)                 | Parses Sackmann CSV — technically fine, but the **CC BY-NC-SA license** (non-commercial) means its _use_ must be researched/legally cleared, not just its code.                                         |
| `src/lib/mlb/context.ts` (park factors + weather)                 | Park factors / weather multipliers — provenance and source of the factor tables is unclear; must verify the numbers are real/traceable (spec §38) before reuse.                                         |
| Prop park/matchup **adjustment coefficients**                     | Any hard-coded multiplier must be traced to a real, cited source or a fitted/backtested value — otherwise it violates "never invent numbers" (§38).                                                     |
| Statcast field selection / xStats formulas                        | Confirm each expected-stat field maps to the documented Savant CSV column before trusting it.                                                                                                           |

### DELETE — demo-only, misleading, or superseded by the new architecture

| Item                                                                                  | Why DELETE                                                                                                                                                                               |
| ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/tennis/fixtures/sample.ts` (175)                                             | Fixture tennis data. Allowed only under tests/dev in the new system; must NOT be carried into any production path. Re-create minimal, clearly-labeled fixtures under test scope instead. |
| In-memory-only TTL cache as the _system of record_                                    | Superseded by Postgres + a real cache layer. The cache pattern survives; "cache-as-database" does not.                                                                                   |
| `localStorage` as primary persistence                                                 | Superseded by the database.                                                                                                                                                              |
| README superlatives ("luxury UI", "positive-EV signals" as product promise)           | Marketing framing that oversells; the new README must use the honest Working/Configurable/Experimental/Planned taxonomy (§40).                                                           |
| Any single-normal-distribution shortcut for tennis totals (if present in older paths) | Spec §15 forbids naïve normal for tennis totals; only the structural sim path survives.                                                                                                  |

## 3. Subsystem-by-subsystem verdicts (spec §3 checklist)

| Subsystem                   | Verdict                                       | Note                                                             |
| --------------------------- | --------------------------------------------- | ---------------------------------------------------------------- |
| Math library                | **KEEP**                                      | Pure, tested, sport-neutral.                                     |
| Seeded RNG                  | **KEEP**                                      | `mulberry32`, deterministic.                                     |
| Probability distributions   | **KEEP**                                      | Poisson/negbinom/normal/Beta.                                    |
| Monte Carlo                 | **KEEP** (MLB) / **KEEP** (tennis structural) | `simulate` + `summarizeSamples` seam.                            |
| Odds math                   | **KEEP**                                      | EV/Kelly/CLV/arb.                                                |
| MLB API client              | **REWRITE**                                   | Add persistence + provenance.                                    |
| MLB data normalization      | **REWRITE**                                   | Move to provider package + DB.                                   |
| Player identity (MLB)       | **REWRITE**                                   | Canonical IDs + provenance in DB.                                |
| Tennis identity resolution  | **KEEP-as-pattern / REWRITE**                 | Never-name-alone logic is right; rebuild on DB.                  |
| Tennis structural simulator | **KEEP**                                      | The correct structural model.                                    |
| Frontend                    | **REWRITE**                                   | Reuse design system; new route map + real data.                  |
| PrizePicks importer         | **REWRITE**                                   | New `MarketLine` + identity + CSV/PDF.                           |
| Data-health system          | **REWRITE**                                   | Legacy = static readiness; new = real operational metrics (§26). |
| Provider registry           | **REWRITE**                                   | DB-backed provider + `provider_requests`.                        |
| Tests                       | **KEEP-as-pattern**                           | Good unit coverage; add contract/integration/leakage/E2E (§29).  |
| Historical storage          | **DELETE→BUILD**                              | None exists; build Postgres schema.                              |
| Backtesting                 | **BUILD**                                     | Deferred in legacy; mandatory now (§19).                         |
| Caching                     | **KEEP-as-pattern**                           | TTL+dedup+retry pattern reusable atop DB.                        |
| Persistence                 | **BUILD**                                     | Postgres is now required (§5).                                   |

## 4. Headline gaps the new build must close

1. **No database / no provenance / no reproducibility** — the biggest gap. Spec §5–§6
   make Postgres + provenance mandatory. Legacy has neither.
2. **No live tennis** — tennis is fixtures + non-commercial CSV. Live is
   `BLOCKED_EXTERNAL_CREDENTIAL`.
3. **No backtesting/calibration** — deferred in legacy; a core product feature now.
4. **No CI/CD** — must add quality gates (§31).
5. **Commercial-use / licensing posture unaddressed** — MLB Stats API, Savant, and
   Sackmann all carry non-commercial/redistribution caveats (see Risk Register R-01/R-02).
6. **Hard-coded coefficients** (park/weather/matchup) need provenance or DELETE (§38).

## 5. Net recommendation

**Fork the ideas, not the app.** Port the pure analytical core (math, odds,
simulation, tennis structural model, feature framework) into fresh `packages/`,
wrap everything in the mandated Postgres + provenance + backtesting infrastructure,
and rebuild the data-access and UI layers against real, persisted, traceable data.
Treat every tennis live provider and every hard-coded coefficient as unverified
until proven.
