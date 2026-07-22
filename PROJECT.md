# OXZI — Project Brief

## Product Purpose

OXZI converts a plain-language idea, an existing brief, or a complete master prompt into a structured, AI-ready project operating system. It extracts what is already known, asks only for missing information that materially affects the project, and keeps implementation agents aligned through a durable canonical state and six generated context files.

> Describe the project once. OXZI keeps every AI aligned from planning through delivery.

## Target Users

- Founders planning software, websites, automation systems, content products, or internal tools
- Solo builders working with Codex, Cursor, Claude Code, or similar agents
- Agencies producing repeatable briefs and technical specifications
- Product teams that need persistent architecture, visual direction, decisions, and progress memory
- AI-assisted developers who need a reliable project handoff

## Core Workflow

1. Create a project and provide a rough idea, detailed prompt, or imported material.
2. Extract facts, constraints, preferences, assumptions, and evidence into canonical structured state.
3. Detect project type, contradictions, and critical gaps.
4. Calculate critical completeness.
5. Skip discovery when the project is sufficiently complete, or ask only the highest-impact missing questions.
6. Review confirmed facts, inferences, defaults, assumptions, conflicts, and deferred items.
7. Derive a typed Knowledge Graph for impact analysis and task-specific context selection.
8. Compile approved constitutional rules and check specification health before technical planning.
9. Produce versioned Technical Plans and independently verifiable implementation slices.
10. Generate six living Markdown files and other controlled views from canonical state.
11. Compile a reviewable Task Card, sufficient context, workflow policy, and certified Execution Passport.
12. Render one selected prompt style, or export/deliver through an approved compatible adapter.
13. Record execution artifacts and dual review evidence before repair or the next scoped unit.
14. Detect spec/plan/task/code drift and route controlled updates without silent mutation.

## Current Phase

Wave 1 — Unified Contracts and Temporal Graph Foundation is complete.

The deterministic canonical, discovery, extraction, and Temporal Knowledge Graph foundations are implemented without AI. Governance, workflow, Task Card/Passport, agent-profile, event/artifact, and Token Ledger schemas are implemented as contracts only. Their engines, Repository Intelligence, context compilation, agent delivery, persistence, and UI remain future work.

## Locked Stack

The current implementation foundation is locked to:

- npm package management
- Latest stable Next.js with the App Router
- Strict TypeScript
- Application code under `src/`
- Tailwind CSS styling baseline
- Next.js ESLint flat configuration
- Prettier formatting
- Vitest application testing
- Zod environment and runtime validation
- GitHub Actions CI on Node.js 24

The broader MVP architecture retains PostgreSQL, Supabase Auth and Storage, Zod validation, a provider-neutral AI gateway, database-backed jobs, and initial Vercel/Supabase deployment. The ORM remains an explicit later decision; none of these later services are installed during repository bootstrap.

## MVP Boundaries

The expanded MVP direction includes project intake, minimal discovery, canonical state, a derived Knowledge Graph, constitutional governance, specification health, controlled specifications and planning, independent slices, deterministic six-file generation, safe context compilation, reviewable Task Cards, Execution Passports, dual review, convergence findings, visual architecture, versioning, and portable Markdown/ZIP export. Cloud and local OpenAI-compatible models remain behind one provider-neutral boundary. Efficiency work is quality-gated and includes workflow, artifact, review, repair, and handoff overhead.

OXZI does not execute project code. The initial product excludes autonomous full-project coding, real-time multiplayer collaboration, billing enforcement, direct repository creation, and automatic deployment. Connected-agent delivery is a future optional integration that requires the configured approval policy. Prompt-performance telemetry and global training reuse are deferred and may never use private project data without explicit consent.

## Implementation Waves

Status vocabulary: `implemented`, `implemented foundation only`, `approved and specified`, `planned`, or `deferred`.

- Wave 0 Lean Agent Context — `implemented`
- Wave 1 Unified Contracts and Temporal Graph — `implemented`; governance/workflow/execution schemas are `implemented foundation only`
- Wave 2 Specification Governance — `approved and specified`
- Wave 3 Repository Intelligence — `approved and specified`
- Wave 4 Context Intelligence — `approved and specified`
- Wave 5 Prompt and Handoff — `approved and specified`; connected delivery `deferred`
- Wave 6 Review and Convergence — `approved and specified`
- Wave 7 Agent Control Plane — contracts `implemented foundation only`; runtime `planned`
- Wave 8 Product Experience — `planned`
- Wave 9 SaaS Infrastructure — `planned`
- Wave 10 Evaluation and Launch — `approved and specified`; execution `planned`

The complete unit sequence and status vocabulary are maintained in [context/06-progress-tracker.md](context/06-progress-tracker.md).

## Detailed Context

- [Project overview](context/01-project-overview.md) — product, users, scope, and success criteria
- [Architecture](context/02-architecture.md) — stack, system boundaries, data flow, security, and invariants
- [UI and visual context](context/03-ui-visual-context.md) — experience direction, screens, responsive behavior, and accessibility
- [Code standards](context/04-code-standards.md) — engineering, validation, testing, and organization rules
- [AI workflow rules](context/05-ai-workflow-rules.md) — agent behavior, priorities, and verification
- [Progress tracker](context/06-progress-tracker.md) — current phase, completed work, checks, and next unit
- [Knowledge Graph specification](specs/05-knowledge-graph-engine.md) — implemented projection, traversal, impact, and task-subgraph contracts
- [Efficiency and Token Ledger specification](specs/10-efficiency-ledger.md) — binding measurement, acquisition, session, tool, routing, and safe-compression policy
- [Project Constitution specification](specs/11-project-constitution.md) — canonical governance projection and enforcement contract
- [Specification Health specification](specs/12-specification-health-engine.md) — deterministic planning-readiness gates
- [Controlled specifications and convergence](specs/13-controlled-specifications-convergence.md) — artifact separation, slices, controlled change, and drift findings
- [Workflow Policy and skills](specs/14-workflow-policy-skill-registry.md) — method selection, selective capability loading, and repair escalation
- [Execution Passport specification](specs/15-execution-passport.md) — portable certification, artifacts, execution ledger, and adapters
- [Temporal Project Memory](specs/16-temporal-project-memory.md) — bitemporal facts, Episodes, history, and Project Time Machine
- [Repository Intelligence](specs/17-repository-intelligence.md) — static repository graph, ranking, maps, and hybrid retrieval
- [Agent control, evidence, and evaluation](specs/18-agent-control-evidence-evaluation.md) — profiles, adapters, runtime states, events, artifacts, and evaluation

Formal accepted decisions are recorded in [DECISIONS.md](DECISIONS.md). Implementation contracts live under [`specs/`](specs/).
