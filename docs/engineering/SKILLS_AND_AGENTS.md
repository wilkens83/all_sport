# Skills & Agents Capability Inventory

**Status:** Phase 0 · **Date:** 2026-07-23

Inventory of the Claude Code Skills, subagents, and MCP tool servers available in
this environment, and how each maps to the platform build. "Relevant?" is judged
against *this* project (MLB/Tennis analytics with a Postgres backend).

## A. Installed Skills

| Skill | Purpose | Invoke when | Relevant to this project? |
|---|---|---|---|
| `web-artifacts-builder` | Elaborate multi-component claude.ai HTML artifacts (React/Tailwind/shadcn). | Building rich standalone artifact UIs. | Partial — the product is a Next.js app, not an artifact; useful for one-off visual reports/dashboards. |
| `dataviz` | Design-system for charts/plots/dashboards (color, marks, accessibility, light/dark). | Before writing ANY chart (Recharts, SVG, etc.). | **Yes** — analysis pages need distribution/hit-rate/rolling/calibration charts (§25). |
| `artifact-design` / `artifact-capabilities` | Design + runtime-capability guidance for Artifacts. | When producing an Artifact deliverable. | Partial — only if we ship artifact-based reports. |
| `docx` / `pdf` / `pptx` / `xlsx` | Create/read Office + PDF documents & spreadsheets. | Generating reports, importing CSV/PDF prop sheets, exporting data. | **Yes (pdf/xlsx)** — PrizePicks CSV/PDF import (§22) and data exports. |
| `session-start-hook` | Set up SessionStart hooks so web sessions can run tests/linters. | Configuring the repo for Claude-Code-on-web CI-like startup. | **Yes** — helps guarantee lint/test/typecheck run in web sessions. |
| `skill-creator` | Create/edit/optimize skills; run evals. | Building project-specific skills. | Optional — could author an "ingestion-verify" skill later. |
| `update-config` | Configure the Claude Code harness (settings.json, hooks, permissions). | Automations, permissions, env vars, hook troubleshooting. | **Yes** — reduce permission prompts for common DB/test commands; wire hooks. |
| `keybindings-help` | Customize keyboard shortcuts. | Editing keybindings. | No. |
| `fewer-permission-prompts` | Allowlist common read-only Bash/MCP calls in project settings. | Reducing repeated prompts. | **Yes** — smoother iterative dev. |
| `loop` | Run a prompt/command on an interval. | Recurring polling/status tasks. | Optional — could poll a long ingestion/CI run. |
| `claude-api` | Reference for Claude API / SDK (models, pricing, tool use, caching). | Any LLM-in-the-loop feature. | Low — no LLM feature is core here. |
| `run` | Launch/drive the app to confirm a change works. | Verifying UI changes in the real app. | **Yes** — Phase 10+ E2E verification. |
| `review` / `security-review` / `simplify` | PR review, security review of pending changes, code simplification. | Before/at PR time. | **Yes** — maps to qa/security/skeptic roles. |
| `init` | Initialize a CLAUDE.md for the repo. | First-time repo docs. | **Yes** — used to seed CLAUDE.md. |
| `morning` / `higgsfield-content-factory` | Morning brief / viral content pipeline. | N/A. | No. |

## B. Subagents (Agent tool types)

| Agent type | Use | Mapped project role |
|---|---|---|
| `Explore` | Read-only broad codebase search (returns conclusions). | Legacy audit sweeps, finding call-sites. |
| `Plan` | Design implementation plans / architecture trade-offs. | architecture-agent. |
| `general-purpose` | Multi-step research / search / execution. | data-research / catch-all. |
| `claude` | Catch-all default. | Any specialized role when spawned with a role-scoped prompt. |
| `claude-code-guide` | Q&A about Claude Code / SDK / API. | Tooling questions only. |
| `statusline-setup` | Configure status line. | N/A. |

> **Note on the spec's named roles** (architecture-/data-research-/mlb-data-/
> tennis-data-/quantitative-model-/backtesting-/frontend-/qa-/security-/skeptic-agent):
> these are **role definitions**, not distinct installed agent types. They are
> realized either by (a) prompting `Plan`/`general-purpose`/`Explore` with the role's
> charter, or (b) invoking the matching Skill (`review`, `security-review`,
> `simplify`, `run`, `dataviz`). The skeptic role is enforced procedurally: an
> independent verification pass (via `general-purpose` + `security-review`) with veto
> authority at each phase gate, per spec §1 and §32.

## C. MCP tool servers available

| Server | Relevance |
|---|---|
| **github** | **Core** — PRs, files, CI, reviews on `wilkens83/all_sport` and (added) `wilkens83/mlb`. |
| **Supabase** | **High** — managed Postgres for the mandated DB (migrations, SQL, types, advisors). Candidate dev DB host (ADR-0002). |
| **Vercel** | Optional — hosting/deploy + runtime logs for `apps/web`. |
| `Gmail` / `Google_Drive` | Low — possible CSV/PDF import source or report delivery. |
| `Shopify` / `higgsfield` | Not relevant to this project. |

## D. How roles are used in this project

- **architecture-agent** → `Plan` + ADRs.
- **data-research-agent** → `general-purpose` + WebSearch/WebFetch + this SOURCE_REGISTRY.
- **mlb-data-agent / tennis-data-agent** → `general-purpose` scoped to provider work + contract tests.
- **quantitative-model-agent / backtesting-agent** → `Plan`/`general-purpose` + model & leakage tests.
- **frontend-agent** → `run` + `dataviz` + Playwright E2E.
- **qa-agent** → `review` + test pyramid.
- **security-agent** → `security-review` + secret scanning.
- **skeptic/reviewer-agent** → independent `general-purpose` verification pass with
  phase-gate veto; does not trust prior agents' summaries.

Subagents are spawned **only when a task genuinely needs an independent context**
(e.g. the skeptic's independent audit) — routine work is done inline to avoid cold
re-derivation cost.
