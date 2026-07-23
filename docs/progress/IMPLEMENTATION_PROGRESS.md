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

| Phase | Description | Status | Notes |
|---|---|---|---|
| 0 | Research + legacy audit | **VERIFIED** | This session. Audit, provider research, architecture proposal, risk register, credentials list, skills inventory all produced; MLB + Savant live-verified; tennis providers doc-verified; Sackmann license flagged. |
| 1 | Repo + architecture + CI + DB | `NOT_STARTED` | Next phase: monorepo skeleton, Postgres, GitHub Actions gates. |
| 2 | Canonical entities + provenance + provider interfaces | `NOT_STARTED` | |
| 3 | MLB ingestion (prove with real data) | `NOT_STARTED` | Unblocked (MLB API live). |
| 4 | MLB Statcast enrichment | `NOT_STARTED` | Unblocked (Savant reachable). |
| 5 | Tennis historical ingestion (Sackmann) | `NOT_STARTED` | Research plane; NC license (R-02). |
| 6 | Tennis live provider integration | `BLOCKED_EXTERNAL_CREDENTIAL` | No Sportradar/SportsDataIO/API-Tennis key. |
| 7 | MLB analytics/model engine | `NOT_STARTED` | Port pure core; gate on baselines. |
| 8 | Tennis structural simulator | `NOT_STARTED` | Port legacy structural sim; validate invariants. |
| 9 | Backtesting + calibration | `NOT_STARTED` | Mandatory before "production-ready". |
| 10 | Frontend foundation | `NOT_STARTED` | No fixtures in production. |
| 11 | MLB complete UI | `NOT_STARTED` | |
| 12 | Tennis complete UI | `NOT_STARTED` | Consumes tennis backend only. |
| 13 | PrizePicks market-line ingestion | `NOT_STARTED` | Manual/CSV/PDF first; identity resolution. |
| 14 | Probability vs line analysis | `NOT_STARTED` | P(More)/P(Less)/fair line/edge/confidence/quality. |
| 15 | Correlation engine | `NOT_STARTED` | Before entry builder. |
| 16 | Entry analysis/builder | `NOT_STARTED` | No profitability promises. |
| 17 | Data health + monitoring | `NOT_STARTED` | Real operational metrics; break-a-provider test. |
| 18 | Security + performance audit | `NOT_STARTED` | |
| 19 | Full independent QA (skeptic) | `NOT_STARTED` | No trust in prior summaries. |

## Live data status (as of 2026-07-23)
- **MLB:** LIVE-VERIFIED. `statsapi.mlb.com` and `baseballsavant.mlb.com` reachable
  (HTTP 200) with real data (today's 5 games, 2025-06-15 15 games, Aaron Judge profile).
- **Tennis:** LIVE = `BLOCKED_EXTERNAL_CREDENTIAL` (no provider key). HISTORICAL =
  available via Sackmann but non-commercial (research plane only).

## Change log
- **2026-07-23 — Phase 0 complete/VERIFIED.** Cloned + audited legacy `wilkens83/MLB`
  (`c2d3ecd`); reviewed PR #1/#2/#3. Live-verified MLB Stats API + Baseball Savant.
  Doc-verified Sportradar / SportsDataIO / API-Tennis coverage. Confirmed Sackmann
  CC BY-NC-SA (non-commercial) license. Produced: LEGACY_SYSTEM_AUDIT, SOURCE_REGISTRY,
  TENNIS_PROVIDER_DECISION, EXTERNAL_CREDENTIALS, SKILLS_AND_AGENTS, ARCHITECTURE_PROPOSAL
  (+ ADR-0001/0002), RISK_REGISTER. No production code written (per §44: Phase 0 only).
