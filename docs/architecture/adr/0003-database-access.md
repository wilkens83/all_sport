# ADR-0003: Database access — Kysely over Drizzle

- **Status:** Accepted
- **Date:** 2026-07-23
- **Context for:** ADR-0002 (PostgreSQL system of record)

## Context

Phase 1 must pick a typed PostgreSQL access layer. The build spec's decision
criteria are: PostgreSQL fidelity, migration transparency, type safety, a raw-SQL
escape hatch, testability, schema complexity handling, time-series/historical query
ergonomics, and **minimal magic** — and explicitly: do not pick an ORM because it
is popular.

We evaluated **Kysely** and **Drizzle**.

## Decision

Use **Kysely** as the typed query builder, with **plain `.sql` migration files**
applied by a small in-repo transactional runner (`packages/db/src/migrator.ts`).

### Criterion-by-criterion

| Criterion                         | Kysely                                                                             | Drizzle                                                                  | Winner |
| --------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ------ |
| PostgreSQL fidelity               | Thin builder over pg; SQL maps 1:1.                                                | Good, but its own schema DSL abstracts DDL.                              | Kysely |
| Migration transparency            | We own plain `.sql` files + a visible runner; nothing generated behind the scenes. | `drizzle-kit` generates migrations from the TS schema DSL.               | Kysely |
| Type safety                       | Full inference from a hand-written `Database` interface.                           | Full inference from the schema DSL.                                      | Tie    |
| Raw-SQL escape hatch              | First-class `sql` template tag everywhere.                                         | `sql` operator exists but the DSL is the primary path.                   | Kysely |
| Testability                       | Just a pool + query builder; trivial to point at a test DB.                        | Fine, but couples tests to the DSL/kit.                                  | Kysely |
| Schema complexity / provenance    | We write exact DDL (check constraints, partial/polymorphic FKs, triggers).         | DSL can express most, but exotic constraints push you to raw SQL anyway. | Kysely |
| Time-series/historical ergonomics | Compose raw SQL windows/CTEs freely.                                               | Possible but more DSL friction.                                          | Kysely |
| Minimal magic                     | No codegen step; schema types are explicit and reviewable.                         | Codegen + kit tooling.                                                   | Kysely |

## Consequences

- `database/migrations/*.sql` are the source of truth for DDL — reviewable as SQL.
- The runner records applied versions in `schema_migrations` and is idempotent at
  the runner level (re-running applies nothing). CI proves this from an empty DB.
- The `Database` TypeScript interface in `packages/db/src/schema.ts` is maintained
  by hand to mirror the SQL. This is deliberate: it keeps the SQL authoritative and
  the types honest, at the cost of manual upkeep (acceptable at this schema size;
  revisit codegen if the schema grows large).
- We avoid an ORM's entity/session abstractions entirely; queries are explicit SQL
  or Kysely builder calls.

## Alternatives considered

- **Drizzle ORM** — capable and type-safe, but its schema-DSL-first workflow and
  `drizzle-kit` codegen add magic and reduce migration transparency relative to
  hand-written SQL. Rejected on the "minimal magic" and "migration transparency"
  criteria, not on capability.
- **Prisma** — heaviest abstraction, weakest raw-SQL story, migration engine is a
  black box. Rejected outright against these criteria.
