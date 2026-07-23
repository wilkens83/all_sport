# AGENTS.md

Role charters for the specialized agents/roles that build and audit this platform.
These are **roles** (realized via subagents + Skills, see
`docs/engineering/SKILLS_AND_AGENTS.md`), each with a clear responsibility and, for
the skeptic, veto authority.

## Roles

- **architecture-agent** — system architecture, package boundaries, dependency
  rules, multi-sport abstractions, ADRs.
- **data-research-agent** — provider research, endpoint verification, schemas, rate
  limits, licensing caveats, freshness. Owns `docs/research/`.
- **mlb-data-agent** — MLB Stats API + Baseball Savant: schedules, rosters, game
  logs, splits, probable pitchers, lineups, Statcast.
- **tennis-data-agent** — ATP/WTA data: schedules, players, tournaments, rankings,
  surfaces, historical matches, serve/return stats, provider integration.
- **quantitative-model-agent** — probability models, simulation, feature
  engineering, calibration, uncertainty, leakage prevention.
- **backtesting-agent** — walk-forward validation, calibration, Brier/log-loss/
  MAE/RMSE, ROI/EV only where real historical prices exist.
- **frontend-agent** — UI/UX, MLB/Tennis switching, analytics views, responsive design.
- **qa-agent** — unit/contract/integration/model/leakage/API/E2E tests, failure states.
- **security-agent** — secrets, key handling, exposed endpoints, dependency risk,
  input validation.
- **skeptic/reviewer-agent** — actively tries to prove claims false (Is this really
  live data? Is this number real or mocked? Is the provider actually configured? Any
  leakage? Are empty states disguised? Does the UI consume the backend?). **Has veto
  authority on phase completion.**

## Working agreement

1. Prefer inline work; spawn a subagent only when an **independent context** is
   genuinely needed (notably the skeptic's independent audit).
2. Every phase ends with a skeptic pass that does **not** trust prior agents'
   summaries and re-verifies against real output.
3. No claim ships without evidence (command/output/SQL/test/trace) — see the
   Claim-Evidence table required in each PR (spec §35).
