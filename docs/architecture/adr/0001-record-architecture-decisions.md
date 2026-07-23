# ADR-0001: Record architecture decisions

- **Status:** Accepted
- **Date:** 2026-07-23

## Context

This is a greenfield rebuild whose central promise is that its **claims survive
verification**. Decisions about providers, database, and modeling carry licensing,
correctness, and reproducibility consequences. We need a durable, reviewable trail
of *why* each significant choice was made.

## Decision

We will use Architecture Decision Records (ADRs), one Markdown file per decision in
`docs/architecture/adr/`, numbered sequentially. Each ADR states Context, Decision,
and Consequences, and is never edited after acceptance except to change status
(e.g. Superseded by ADR-N).

## Consequences

- Provider selection, DB choice, identity-resolution rules, leakage policy, and
  market-support criteria each get an ADR before implementation.
- Reviewers (including the skeptic role) can audit the reasoning, not just the code.
