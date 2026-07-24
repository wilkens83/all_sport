# Tennis Provider Decision Matrix

**Status:** Phase 0 research · **Date:** 2026-07-23 · **Verification:** documentation
review (no live tennis credentials in this environment). Every cell is either
sourced from vendor docs or marked `UNKNOWN`. No cell is guessed.

> This decision is **provisional**. No live tennis provider can be declared
> production-verified until a real API key is present and the upstream→domain
> mapping is confirmed against a real response (Phase 6). Until then all live
> providers are `BLOCKED_EXTERNAL_CREDENTIAL`.

## Comparison

| Requirement    | Sportradar Tennis v3                                | SportsDataIO Tennis                        | API-Tennis / tennis-api.com                            |
| -------------- | --------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------ |
| ATP            | YES (official ATP partner)                          | YES (ATP 250+)                             | YES                                                    |
| WTA            | YES                                                 | YES (WTA 250+)                             | YES                                                    |
| ITF/Challenger | YES (4,000+ comps)                                  | UNKNOWN (250+ tier stated)                 | YES                                                    |
| Historical     | YES (depth varies by pkg)                           | UNKNOWN depth                              | YES (varies by plan)                                   |
| Live           | YES (real-time)                                     | YES (live scores)                          | YES (REST + WebSocket)                                 |
| Rankings       | YES (singles asc; profiles w/ rank history)         | YES (singles & doubles)                    | YES                                                    |
| Surface        | YES (in competition/match metadata)                 | UNKNOWN (not explicit)                     | YES (surface stats)                                    |
| Serve stats    | YES (match/player statistics)                       | UNKNOWN (box scores; granularity unclear)  | YES (serve stats)                                      |
| Return stats   | YES (match/player statistics)                       | UNKNOWN                                    | YES (return stats)                                     |
| Point-by-point | PARTIAL ("when available"; by Coverage Matrix tier) | UNKNOWN                                    | YES (WebSocket)                                        |
| Stable IDs     | YES (Sportradar IDs; profiles)                      | YES (vendor IDs)                           | UNKNOWN (must verify)                                  |
| Odds           | UNKNOWN (separate odds product)                     | YES (odds/spreads/ML/totals w/ open+close) | YES (pre/live/historical, higher tiers)                |
| Rate limits    | Contract-defined (UNKNOWN exact)                    | Contract-defined (UNKNOWN exact)           | Free 50/day 4rps; Pro 150k/mo 10rps; Ultra/Mega higher |
| Price/access   | Commercial, sales-quoted (UNKNOWN)                  | Commercial, sales-quoted (UNKNOWN)         | Free → $29 → $59 → $99 /mo + overage $0.003/req        |
| Production SLA | YES (enterprise)                                    | YES (enterprise)                           | UNKNOWN (freemium)                                     |
| Documentation  | Strong (developer portal + Coverage Matrix)         | Good (developer portal)                    | Moderate (docs.tennis-api.com)                         |

Sources: developer.sportradar.com/tennis, sportsdata.io/developers/api-documentation/tennis,
sportsdata.io/tennis-confirmed-coverage, tennis-api.com/api-coverage. All fetched 2026-07-23.

## Weighting against project requirements

The build spec's tennis engine needs, in priority order:

1. **Serve/return statistics + surface** (the structural simulator is parameterized
   by serve-point win probability by surface). → Sportradar and API-Tennis both
   claim this; SportsDataIO is UNKNOWN.
2. **Stable IDs + historical** (Elo/surface-Elo reconstruction, identity resolution).
   → Sportradar strongest; historical also covered offline by Sackmann for backtest.
3. **Live schedules + results** (the LIVE board). → all three.
4. **Odds** (edge vs market). → SportsDataIO strongest and cheapest-to-reason-about;
   Sportradar via separate product; API-Tennis on higher tiers.

## Provisional decision

| Role                                       | Provider                                      | Rationale                                                                                                                                                                           |
| ------------------------------------------ | --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Primary LIVE (production candidate)**    | **Sportradar Tennis v3**                      | Best coverage of serve/return + surface + stable IDs + PBP tiering + official ATP partnership; enterprise SLA.                                                                      |
| **Odds / market cross-source**             | **SportsDataIO Tennis**                       | Explicit odds w/ open+close timestamps — needed for honest historical CLV/EV and edge. NOTE: free-trial data is **scrambled** → classify `trial_scrambled`, never production truth. |
| **Secondary backup / cross-validation #1** | **api-tennis.com** (Provider A)               | Own infra; `APIkey` auth; fixtures/livescore/H2H/standings/players/odds/live-odds.                                                                                                  |
| **Secondary backup / cross-validation #2** | **tennis-api.com** (Provider B, via RapidAPI) | Distinct vendor; `X-RapidAPI-Key`/`X-RapidAPI-Host`; WebSocket PBP, serve/return, historical.                                                                                       |
| **Historical / backtesting corpus**        | **Jeff Sackmann (CC BY-NC-SA)**               | Deep multi-decade ATP/WTA history — RESEARCH/NON-COMMERCIAL plane only.                                                                                                             |

> **Vendor identity resolved (was R-07).** `api-tennis.com` (Provider A) and
> `tennis-api.com` (Provider B) are **separate services** — different
> infrastructure, different authentication (`APIkey` vs `X-RapidAPI-Key` +
> `X-RapidAPI-Host`), different endpoint structures. They will be implemented as
> **two independent adapters**. There will be no single combined "api-tennis"
> abstraction that conflates them.

## Hard constraints on this decision

- **No key = no live product.** Every live provider is inert (`unconfigured`) until
  its env var is set server-side AND an integration test confirms the mapping.
  Until then the app shows `Live Tennis provider not configured` — never fabricated
  matches/props.
- **Trial data is not production truth.** Any free/trial key's limitations
  (scrambled or partial data) must be displayed prominently and never treated as
  real. SportsDataIO trial data specifically is scrambled-but-realistic and MUST be
  tagged `trial_scrambled` at the provider boundary so the analytics layer rejects
  it (see the `DataTruthClass` type introduced in `packages/core`, Phase 1).
- **Historical ≠ Live.** Sackmann (NC) powers backtesting/priors only; it must never
  masquerade as today's live board.
- **Vendor-identity check (R-07).** Confirm whether the intended Tier-B vendor is
  `api-tennis.com` or `tennis-api.com` (matchstat) before writing its adapter — they
  are similarly named but appear distinct.

## Open items requiring a human / credential

- [ ] Obtain Sportradar Tennis v3 trial → verify Coverage Matrix for target
      competitions (which seasons expose statistics + PBP).
- [ ] Obtain SportsDataIO tennis key → verify serve/return granularity (currently UNKNOWN).
- [x] Confirm secondary-vendor identities + auth mechanisms — **RESOLVED**:
      api-tennis.com (Provider A, `APIkey`) and tennis-api.com (Provider B,
      RapidAPI `X-RapidAPI-Key`/`X-RapidAPI-Host`) are distinct; two adapters.
- [ ] Get sales-quoted pricing/SLA for Sportradar and SportsDataIO (UNKNOWN).
- [ ] Legal review of MLB Stats API / Savant / Sackmann commercial-use posture.
