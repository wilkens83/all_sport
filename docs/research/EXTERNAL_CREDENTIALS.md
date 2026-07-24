# External Credential Requirements

Every item that needs an external API key, license, or authorization to proceed.
This is the definitive blocker list for the project (spec §44.16). Nothing on the
`BLOCKED` list can be marked VERIFIED until the credential exists and a live
response is confirmed.

## Status legend

- `AVAILABLE` — works in this environment today (keyless / already reachable).
- `BLOCKED_EXTERNAL_CREDENTIAL` — requires a key/license not present here.
- `AUTHORIZATION_REQUIRED` — needs legal/ToS authorization, not just a key.

| Capability                              | Env var / requirement                | Status                                    | Notes                                                                                  |
| --------------------------------------- | ------------------------------------ | ----------------------------------------- | -------------------------------------------------------------------------------------- |
| MLB schedules/teams/players/games/stats | none (public)                        | **AVAILABLE**                             | Live-verified 2026-07-23. Commercial-use caveat (R-01).                                |
| MLB Statcast enrichment                 | none (public)                        | **AVAILABLE**                             | Savant CSV endpoints reachable (200). Be polite (R-09).                                |
| Tennis LIVE — Sportradar v3             | `SPORTRADAR_TENNIS_API_KEY`          | **BLOCKED_EXTERNAL_CREDENTIAL**           | Primary live candidate. Adapter inert w/o key.                                         |
| Tennis LIVE — SportsDataIO              | `SPORTSDATAIO_TENNIS_API_KEY`        | **BLOCKED_EXTERNAL_CREDENTIAL**           | Odds/market source. `Ocp-Apim-Subscription-Key`.                                       |
| Tennis LIVE — API-Tennis                | `API_TENNIS_API_KEY`                 | **BLOCKED_EXTERNAL_CREDENTIAL**           | Backup. Confirm vendor identity first (R-07).                                          |
| Tennis HISTORICAL — Sackmann            | none (public repo)                   | **AUTHORIZATION_REQUIRED**                | Code works keyless, but CC BY-NC-SA = non-commercial only (R-02). Research plane only. |
| PrizePicks market lines                 | none for manual/CSV/PDF              | **AUTHORIZATION_REQUIRED** for automation | Manual/CSV/PDF now; automated ingestion needs verified authorization (R-13).           |
| Database (dev)                          | Postgres connection (`DATABASE_URL`) | provisioned in Phase 1                    | Managed Postgres (e.g. Supabase) available in this environment.                        |

## What to request from the user (escalation)

1. **A Sportradar Tennis v3 trial or production key** — unblocks Phase 6 and the
   whole tennis-live surface. Highest leverage.
2. **A SportsDataIO tennis key** — unblocks tennis odds / market cross-validation
   and honest EV/CLV.
3. **(Optional) an API-Tennis key** — cheap backup + cross-check.
4. **A legal decision** on commercial vs research posture — determines whether the
   free MLB/Savant/Sackmann sources are sufficient or must be replaced by licensed
   feeds before any "production"/commercial claim.

Until (1)–(3) arrive, all tennis-live phases remain `BLOCKED_EXTERNAL_CREDENTIAL`
and the app must show honest "not configured" states — never fabricated tennis data.
