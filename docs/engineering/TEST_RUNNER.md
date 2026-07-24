# Test Runner Decision

**Status:** Accepted (Phase 1) · **Date:** 2026-07-23

## Decision

**Vitest** is the single primary test runner for all TypeScript across the
monorepo. There is no mixture of Bun test / Jest / Node test.

## Rationale

- **One runner, one config surface.** Unit and integration tests share tooling;
  contributors learn one API.
- **Native ESM + TypeScript** with no separate transpile step — matches the
  source-based internal packages (consumed as TS, not pre-built).
- **Proxy compatibility.** The legacy project documented that Bun's `fetch` does not
  work through this environment's TLS-intercepting proxy; standardizing on Vitest
  (Node runtime) avoids that class of problem for any test that touches the network.
- **First-class watch + workspace globs**, and easy separation of unit vs
  integration suites by filename.

## Conventions

- Unit tests: `*.test.ts`, run by `pnpm test` (config: `vitest.config.ts`). No
  external dependencies; pure logic only.
- Integration tests: `*.integration.test.ts`, run by `pnpm test:integration`
  (config: `vitest.integration.config.ts`). Require a live PostgreSQL at
  `DATABASE_URL`.
- The integration config sets `passWithNoTests: false`, and each integration suite
  **fails loudly** if `DATABASE_URL` is unset — so CI can never be green merely
  because integration tests were skipped.

## Test pyramid (target across phases)

Unit → contract (Zod against saved provider responses) → integration
(provider → normalization → DB) → model (statistical invariants) → leakage
(no future data) → API (route behavior) → E2E (browser) → live smoke (real
providers when credentials exist). Phase 1 implements the unit, contract,
integration, and API layers.
