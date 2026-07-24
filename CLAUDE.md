# CLAUDE.md

Guidance for Claude Code when working in this repository.

@AGENTS.md

## What this is

A greenfield **multi-sport analytics & player-prop intelligence platform** for MLB,
ATP Tennis, and WTA Tennis. The non-negotiable premise: **claims must survive
verification** — real, traceable data only; no invented games, players, stats,
projections, provider status, or numbers.

The repository is currently at **Phase 0 complete** (research + legacy audit). See
`docs/progress/IMPLEMENTATION_PROGRESS.md` for live status.

## Operating rules (from the build spec — do not violate)

1. **Verify before building.** Any API/endpoint/package/formula/market definition is
   verified against an authoritative source and recorded under `docs/research/`
   before use. Never rely on model memory alone.
2. **No invented numbers.** Every probability/edge/rating/line traces to real inputs.
   Hard-coded coefficients need a cited source, a fitted value, or deletion.
3. **Provenance is mandatory.** Every normalized record stores its source; every
   projection stores its data cutoff + model/feature/sim versions + config checksum +
   seed. A projection that can't be reproduced is unacceptable.
4. **Explicit `asOf` cutoff** on every analytics query; models read only pre-cutoff
   data. Leakage is a tested invariant.
5. **No fixtures in production.** Fixtures live only under tests/dev, clearly labeled.
6. **No key = no fake live product.** Live tennis without a provider key shows
   "Live Tennis provider not configured" — never fabricated data.
7. **Never join players by name alone.** Use canonical identity resolution; return
   `IDENTITY_UNRESOLVED` on ambiguity.
8. **Label data categories** (LIVE/RECENT/HISTORICAL/STALE/SIMULATED/UNAVAILABLE)
   distinctly; never mix invisibly.
9. **Definition of done** (§32): researched + implemented + wired + tested +
   documented + visible in UI + real-data-verified + failures-handled +
   provenance-exposed + skeptic-reviewed. A route/component existing is NOT done.

## Phasing

Execute phases sequentially with a STOP-and-validate gate between each. The skeptic
review has veto authority on phase completion. Do not start Phase N+1 code before
Phase N is verified. See the build spec §33 and `IMPLEMENTATION_PROGRESS.md`.

## Environment notes

- Outbound HTTPS goes through a TLS-intercepting proxy. Node needs
  `NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt` to reach external APIs; this is
  sandbox-specific and must NOT be committed into scripts.
- MLB Stats API + Baseball Savant are keyless and reachable here. Tennis live
  providers require keys that are absent (`BLOCKED_EXTERNAL_CREDENTIAL`).
- Secrets are server-side only; `.env` is gitignored; `.env.example` documents names.

## Legacy reference

`wilkens83/MLB` (Diamond Edge) is an **audited reference only**, not a base to mutate.
See `docs/audit/LEGACY_SYSTEM_AUDIT.md` for the KEEP/REWRITE/RESEARCH/DELETE map.

## Commands

_(Populated in Phase 1 once the monorepo skeleton + tooling land. Nothing to run yet.)_
