<div align="center">

# All-Sport Intelligence Platform

### MLB · ATP Tennis · WTA Tennis — analytics & player-prop intelligence

*A greenfield rebuild whose claims are designed to survive verification.*

</div>

---

A professional-grade sports analytics and player-prop intelligence platform for
**MLB** and **ATP/WTA Tennis**, built on **real, traceable, verified data** with a
persistent database, per-record provenance, and backtesting as first-class features.

> **Honesty policy.** This README uses four status categories and never advertises
> planned work as existing. No invented games, players, statistics, projections, or
> provider status. See `docs/` for the full audit trail.

## Status

This repository is at **Phase 0 (research + legacy audit) complete**. Implementation
phases have not begun. The sections below reflect that precisely.

### ✅ Working (verified end-to-end)
- **Phase 0 research & audit** — legacy system audited; MLB Stats API and Baseball
  Savant **live-verified** (real data, HTTP 200, 2026-07-23); tennis providers
  documentation-verified; historical-data licensing confirmed. See `docs/`.

### 🔧 Configurable (implemented later; requires credentials)
- *(none yet — implementation starts in Phase 1)*
- **Planned to be configurable:** live Tennis via Sportradar / SportsDataIO /
  API-Tennis — each **inert without a server-side API key**
  (`SPORTRADAR_TENNIS_API_KEY`, `SPORTSDATAIO_TENNIS_API_KEY`, `API_TENNIS_API_KEY`).

### 🧪 Experimental (exists but under-validated)
- *(none yet)*

### 🗺️ Planned (not implemented)
- Postgres schema + migrations, provider ingestion (MLB, Savant), tennis historical
  ingestion, structural tennis simulator, MLB model engine, backtesting/calibration,
  the `/mlb/*` and `/tennis/*` UI, PrizePicks market-line import, correlation + entry
  builder, data-health monitoring. Tracked in `docs/progress/IMPLEMENTATION_PROGRESS.md`.

## Data sources (verified 2026-07-23)

| Source | Sport | Status | Note |
|---|---|---|---|
| MLB Stats API (`statsapi.mlb.com`) | MLB | **LIVE-verified**, keyless | Commercial-use caveat (see risk R-01). |
| Baseball Savant (`baseballsavant.mlb.com`) | MLB | **LIVE-verified**, keyless | Statcast enrichment; polite access only. |
| Sportradar Tennis v3 | Tennis | doc-verified; **needs key** | Primary live candidate. |
| SportsDataIO Tennis | Tennis | doc-verified; **needs key** | Odds/market cross-source. |
| API-Tennis / tennis-api.com | Tennis | doc-verified; **needs key** | Backup/cross-check. |
| Jeff Sackmann / Tennis Abstract | Tennis (historical) | available; **CC BY-NC-SA (non-commercial)** | Backtesting/research plane only (risk R-02). |

Full details: [`docs/research/SOURCE_REGISTRY.md`](docs/research/SOURCE_REGISTRY.md).

## Documentation

- [`docs/audit/LEGACY_SYSTEM_AUDIT.md`](docs/audit/LEGACY_SYSTEM_AUDIT.md) — KEEP/REWRITE/RESEARCH/DELETE of the legacy Diamond Edge system.
- [`docs/research/SOURCE_REGISTRY.md`](docs/research/SOURCE_REGISTRY.md) — every source, with verification evidence.
- [`docs/research/TENNIS_PROVIDER_DECISION.md`](docs/research/TENNIS_PROVIDER_DECISION.md) — provider decision matrix.
- [`docs/research/EXTERNAL_CREDENTIALS.md`](docs/research/EXTERNAL_CREDENTIALS.md) — the credential blocker list.
- [`docs/architecture/ARCHITECTURE_PROPOSAL.md`](docs/architecture/ARCHITECTURE_PROPOSAL.md) — target monorepo + data model.
- [`docs/audit/RISK_REGISTER.md`](docs/audit/RISK_REGISTER.md) — risks, likelihood, impact, mitigations.
- [`docs/engineering/SKILLS_AND_AGENTS.md`](docs/engineering/SKILLS_AND_AGENTS.md) — tooling capability inventory.
- [`docs/progress/IMPLEMENTATION_PROGRESS.md`](docs/progress/IMPLEMENTATION_PROGRESS.md) — living status journal.

## Licensing note

A code license is intentionally **not yet chosen** — the decision is coupled to the
commercial-vs-research posture, which depends on data-source licensing (MLB Stats
API redistribution terms and the non-commercial Sackmann datasets). See
[`docs/LICENSE_DECISION.md`](docs/LICENSE_DECISION.md).

## Disclaimer

Research and modeling tool for informational purposes. **Not betting advice.**
Gambling involves risk. 21+. Nothing here guarantees any outcome.
