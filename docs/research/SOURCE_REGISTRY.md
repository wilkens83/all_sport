# Source Registry

Authoritative record of every external data source considered for this platform.
Each entry follows the template mandated by the build spec (§37). `Last verified`
plus `Verification method` distinguish **live** checks (a request was actually
made from this environment) from **documentation-only** review.

> **Verification legend**
> - `LIVE` — a real HTTP request was made from this environment and the response inspected.
> - `DOCS` — verified against vendor documentation / public README only; no credentialed call was possible.
> - `BLOCKED` — requires credentials that are not present in this environment.

---

## 1. MLB Stats API (statsapi.mlb.com)

```
Provider:                 MLB Advanced Media (MLBAM)
Sport:                    MLB
Purpose:                  Primary MLB foundation — teams, players, schedules,
                          games, rosters, probable pitchers, game logs, season
                          stats, splits.
Official documentation:   No formal public contract; community reference at
                          https://github.com/toddrob99/MLB-StatsAPI/wiki and the
                          live JSON at https://statsapi.mlb.com/api/v1/
Endpoint (base):          https://statsapi.mlb.com/api/v1
Authentication:           None (public, keyless)
Coverage:                 Full MLB: teams, people, schedule, boxscore, game
                          feeds, rosters, standings, stats, splits.
Freshness:                Near real-time during games (LIVE feed endpoints).
Historical availability:  Deep — many seasons of schedule/boxscore/stats.
Known limitations:        Undocumented / unversioned; response shapes can change
                          without notice. Terms of use restrict commercial
                          redistribution — see copyright notice returned in every
                          payload (gdx.mlb.com/components/copyright.txt). MUST be
                          treated as "personal / non-commercial informational use"
                          until a commercial arrangement is confirmed.
Last verified:            2026-07-23
Verification method:      LIVE — see evidence below.
```

**Live evidence captured 2026-07-23:**

| Endpoint | Request | Result |
|---|---|---|
| Teams | `GET /api/v1/teams?sportId=1&season=2025` | HTTP 200, real 2025 teams (e.g. Athletics id=133, venue Sutter Health Park) |
| Schedule (today) | `GET /api/v1/schedule?sportId=1&date=2026-07-23` | HTTP 200, `totalGames=5`, real matchups w/ live statuses ("Final", "In Progress") |
| Schedule (historical) | `GET /api/v1/schedule?sportId=1&date=2025-06-15` | HTTP 200, `totalGames=15` |
| Person | `GET /api/v1/people/592450` | HTTP 200, "Aaron Judge", RF, bats R |

**Verdict:** Production-viable as the MLB backbone. No credential blocker. The
only open risk is the **commercial-use / redistribution** clause — flagged in the
Risk Register (R-01).

---

## 2. Baseball Savant / Statcast (baseballsavant.mlb.com)

```
Provider:                 MLB Advanced Media (Statcast)
Sport:                    MLB
Purpose:                  Statcast enrichment — exit velocity, launch angle,
                          barrel/hard-hit rate, xBA/xSLG/xwOBA, whiff/chase,
                          pitch mix, velocity/spin, expected stats.
Official documentation:   https://baseballsavant.mlb.com/csv-docs (CSV field docs);
                          leaderboard + statcast_search CSV export endpoints.
Endpoint (examples):      https://baseballsavant.mlb.com/statcast_search/csv
                          https://baseballsavant.mlb.com/leaderboard/expected_statistics?csv=true
Authentication:           None (public, keyless)
Coverage:                 Pitch-level Statcast (2015+) and season leaderboards.
Freshness:                Updated after games are processed (minutes–hours).
Historical availability:  2015-present for pitch-level; leaderboards per season.
Known limitations:        Rate-sensitive; aggressive scraping is discouraged and
                          can trigger throttling. CSV schema is wide and can shift.
                          Same non-commercial posture as MLB Stats API. Must cache
                          and persist, never hammer.
Last verified:            2026-07-23
Verification method:      LIVE (reachability) — see evidence below.
```

**Live evidence captured 2026-07-23:**

| Endpoint | Result |
|---|---|
| `GET /statcast_search/csv?...&game_date_gt=2025-06-01&game_date_lt=2025-06-01` | HTTP 200 |
| `GET /leaderboard/expected_statistics?type=batter&year=2025&min=q&csv=true` | HTTP 200 |

**Verdict:** Viable for enrichment. Access pattern must be polite (cache +
persist raw payloads). No credential blocker.

---

## 3. Sportradar Tennis v3

```
Provider:                 Sportradar
Sport:                    ATP / WTA / ITF / Challenger tennis
Purpose:                  Tier-A production candidate — schedules, competitors,
                          rankings, surfaces, tournaments, results, live scoring,
                          match & serve/return statistics, historical, PBP.
Official documentation:   https://developer.sportradar.com/tennis/reference/overview
                          Coverage Matrix: developer.sportradar.com/tennis/docs/ig-data-coverage-tiers
Endpoint (base, docs):    https://api.sportradar.com/tennis/{access}/v3/...
Authentication:           API key (commercial license). Server-side only.
Coverage:                 4,000+ competitions incl. Grand Slams, ATP, WTA, ITF,
                          Challenger. Official ATP partnership. Rankings,
                          competitor profiles, match summaries w/ statistics,
                          point-by-point "when available" (varies by tier).
Freshness:                Real-time live scoring.
Historical availability:  Historical results included; depth varies by package.
Known limitations:        Point-by-point and statistics availability vary by
                          competition/season (see Coverage Matrix). Trial/free
                          keys serve LIMITED or scrambled data — MUST NOT be
                          mistaken for production truth. Commercial contract
                          required. Price = sales-quoted (UNKNOWN here).
Last verified:            2026-07-23
Verification method:      DOCS — no key in this environment (BLOCKED for live).
```

**Verdict:** Strongest production candidate on coverage. **BLOCKED_EXTERNAL_CREDENTIAL** —
no key present. Adapter ships inert until `SPORTRADAR_TENNIS_API_KEY` is provided
and the upstream→domain mapping is verified against a real response.

---

## 4. SportsDataIO Tennis

```
Provider:                 SportsDataIO
Sport:                    ATP / WTA tennis
Purpose:                  Tier-A production candidate / cross-validation.
Official documentation:   https://sportsdata.io/developers/api-documentation/tennis
                          Coverage: https://sportsdata.io/tennis-confirmed-coverage
Endpoint (base, docs):    https://api.sportsdata.io/v3/tennis
Authentication:           API key via `Ocp-Apim-Subscription-Key` header.
Coverage:                 ATP & WTA 250+ rankings (singles & doubles), player
                          profiles, schedules/venues, post-game box scores, live
                          scores, and betting data (odds, spreads, moneylines,
                          totals w/ open/close timestamps).
Freshness:                Live coverage; rankings updated as matches conclude.
Historical availability:  UNKNOWN depth (not stated on coverage page).
Known limitations:        Serve/return granularity and point-by-point NOT clearly
                          advertised (UNKNOWN). Commercial. *** FREE-TRIAL DATA CAN
                          BE SCRAMBLED BUT REALISTIC *** — SportsDataIO explicitly
                          states trial responses may contain scrambled (fake-but-
                          plausible) values. This data MUST be classified
                          `trial_scrambled` and NEVER used as production truth
                          (no model eval, historical ROI, player assessment, or
                          recommendation) while presented as real. See R-19 and the
                          `DataTruthClass` design (Phase 1 core package).
Last verified:            2026-07-23
Verification method:      DOCS — no key in this environment (BLOCKED for live).
```

**Verdict:** Strong on **odds/betting lines** (a genuine differentiator for
edge analysis) but weaker/unclear on serve-return and PBP granularity, and its
**free-trial data is scrambled** and must be technically quarantined.
**BLOCKED_EXTERNAL_CREDENTIAL**.

---

## 5. Secondary tennis vendors — TWO DISTINCT services (do not conflate)

`api-tennis.com` and `tennis-api.com` are **separate vendors**, not aliases. They
have different infrastructure, authentication, and endpoint structures and MUST be
implemented as two independent adapters. The ambiguity flagged in Phase 0 is now
resolved.

### 5A. Provider A — `api-tennis.com`

```
Provider:                 api-tennis.com (own API infrastructure)
Sport:                    ATP / WTA / ITF / Challenger tennis
Purpose:                  Tier-B backup / enrichment / cross-validation.
Official documentation:   https://api-tennis.com (own docs)
Endpoint (base):          api-tennis.com — own endpoint structure
Authentication:           `APIkey` parameter (own auth scheme; server-side only).
Coverage (verified traits): fixtures, livescore, H2H, standings, players, odds,
                          live odds.
Freshness:                Live (livescore + live odds).
Historical availability:  UNKNOWN exact depth.
Known limitations:        Distinct vendor from tennis-api.com. Confirm exact
                          coverage/limits against a live key before wiring.
Env var:                  API_TENNIS_API_KEY
Last verified:            2026-07-23
Verification method:      DOCS + user-confirmed vendor characteristics.
```

### 5B. Provider B — `tennis-api.com` (via RapidAPI)

```
Provider:                 tennis-api.com (distributed through RapidAPI; matchstat)
Sport:                    ATP / WTA / ITF / Challenger tennis
Purpose:                  Tier-B backup / enrichment / cross-validation.
Official documentation:   https://tennis-api.com/api-coverage/ ; docs.tennis-api.com
Endpoint (base):          RapidAPI-hosted; separate endpoint structure from 5A.
Authentication:           RapidAPI headers: `X-RapidAPI-Key`, `X-RapidAPI-Host`
                          (server-side only).
Coverage:                 ATP, WTA, ITF, Challenger, Grand Slams; live scores,
                          fixtures, profiles, rankings, H2H, draws, odds,
                          point-by-point (WebSocket), historical results, serve/
                          return & surface stats.
Freshness:                Live (REST + WebSocket).
Historical availability:  "Varies by plan and endpoint" (UNKNOWN exact depth).
Known limitations:        Freemium; free 50 req/day, 4 req/s. Paid: Pro $29/mo
                          (150k/mo), Ultra $59/mo, Mega $99/mo; overage $0.003/req.
Env var:                  TENNIS_API_RAPIDAPI_KEY (+ RapidAPI host)
Last verified:            2026-07-23
Verification method:      DOCS (coverage page fetched live) + user-confirmed traits.
```

**Verdict:** Two independent cheap-ish paths to *some* live tennis; useful backups /
cross-checks. Neither is the automatic primary. Both **BLOCKED_EXTERNAL_CREDENTIAL**.
They will be built as **two separate adapters** with different auth — never a single
combined "api-tennis" abstraction.

---

## 6. Jeff Sackmann / Tennis Abstract datasets (historical)

```
Provider:                 Jeff Sackmann (Tennis Abstract)
Sport:                    ATP / WTA tennis (historical)
Purpose:                  Historical ATP/WTA match corpus for backtesting,
                          Elo/surface-Elo reconstruction, serve/return priors.
Official documentation:   https://github.com/JeffSackmann/tennis_atp
                          https://github.com/JeffSackmann/tennis_wta
                          https://github.com/JeffSackmann/tennis_pointbypoint
                          https://github.com/JeffSackmann/tennis_MatchChartingProject
Endpoint:                 Git / raw CSV files (one row per completed match).
Authentication:           None (public repos).
Coverage:                 Decades of ATP & WTA matches: winner/loser, score,
                          surface, tourney metadata, ranks, aces/DF and more;
                          separate point-by-point and Match Charting projects.
Freshness:                Community-maintained; updated through recent seasons.
Historical availability:  Very deep (multi-decade).
Known limitations:        *** LICENSE: CC BY-NC-SA 4.0 ***
                          Attribution-**NonCommercial**-ShareAlike. This is the
                          single most important licensing constraint in the whole
                          project: usable for RESEARCH / BACKTESTING, but a
                          commercial product cannot ship on it without either (a)
                          staying non-commercial, or (b) sourcing equivalent data
                          under a commercial license. ShareAlike would also force
                          derivative data under the same license.
Last verified:            2026-07-23
Verification method:      DOCS (license confirmed via repo READMEs / CC page).
```

**Verdict:** Excellent for the **backtesting/research** plane. **NOT** a lawful
foundation for a commercial live product. Drives the core provider decision:
*historical (Sackmann, NC) and live (licensed vendor) are separate planes and
must never be silently merged.* See R-01, R-02.

---

## 7. PrizePicks (market-line input)

```
Provider:                 PrizePicks
Sport:                    MLB / Tennis (player prop lines)
Purpose:                  MARKET-INPUT layer only — NOT a source of truth about
                          player performance. Supplies lines to compare against
                          model projections.
Official documentation:   None public/authorized for automated ingestion.
Endpoint:                 N/A for automation initially.
Authentication:           N/A.
Coverage:                 Player prop lines (More/Less) across supported sports.
Freshness:                Real-time board (when captured).
Historical availability:  None retained by vendor for us.
Known limitations:        Automated ingestion is NOT authorized/verified. Initial
                          methods MUST be manual entry + CSV/PDF import only.
                          Names must go through identity resolution — never
                          silently matched to athletes. No scraping of protected
                          pages; no account automation.
Last verified:            2026-07-23
Verification method:      Policy decision (documentation-only).
```

**Verdict:** Manual / CSV / PDF import first. Automated ingestion deferred until
authorization + technical legitimacy are verified. Treated as `MarketLine` input.

---

## Cross-cutting conclusions

1. **Two independent tennis data planes.** Live (licensed vendor, credential-gated)
   and Historical (Sackmann, non-commercial). They must remain separate and clearly
   labeled (LIVE / HISTORICAL) in both storage and UI. Merging them invisibly would
   violate both licensing and the "never mix categories" rule (§39).
2. **MLB is unblocked and live-verified today.** Tennis LIVE is universally
   **BLOCKED_EXTERNAL_CREDENTIAL** in this environment.
3. **Commercial-use posture is unresolved** for every free source (MLB Stats API,
   Savant, Sackmann). The platform must default to a research/non-commercial stance
   until a commercial data arrangement exists.
