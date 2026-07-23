# OXZI — Project Brief

## Product Purpose

OXZI converts a plain-language idea, an existing brief, or a complete master prompt into a structured, AI-ready project operating system. It extracts what is already known, asks only for missing information that materially affects the project, and keeps implementation agents aligned through a durable canonical state and six generated context files.

> Describe the project once. OXZI keeps every AI aligned from planning through delivery.

## Target Users

- Vibe coders and founders planning software, websites, automation systems, content products, or internal tools
- Solo builders and AI-assisted developers working with Codex, Cursor, Claude Code, or similar agents
- Agencies producing repeatable briefs and technical specifications
- Startup engineering teams that need persistent architecture, visual direction, decisions, and progress memory
- Later enterprise buyers that need privacy-first governance for confidential code and company data

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

Wave 2 — Specification Governance and Planning Runtime Foundation is complete.

The deterministic canonical, discovery, extraction, Temporal Knowledge Graph, Constitution resolution, Specification governance, Technical Plan governance, and independently verifiable Implementation Slice foundations are implemented without AI. Technical Plan Runtime and Implementation Slice Runtime are separate, independently testable implementation units. Workflow, Task Card/Passport, evaluation/divergence, Prompt Program, Typed AI, observability, selective-skill/diagnostic, and repository-intelligence schemas remain contract foundations. Task Card compilation, canonical-artifact Context Compiler v1, parsers, code-aware context compilation, agent delivery, persistence, and UI remain future work.

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

OXZI does not execute project code. The initial product excludes autonomous full-project coding, real-time multiplayer collaboration, billing enforcement, direct repository creation, and automatic deployment. Connected-agent delivery is a future optional integration that requires the configured approval policy. Internal Product UI may begin once the core deterministic pipeline is stable; authentication, billing, teams, and multiplayer remain deferred to a later SaaS phase. Prompt-performance telemetry and global training reuse are deferred and may never use private project data without explicit consent.

## Implementation Waves

Status vocabulary: `implemented`, `implemented foundation only`, `approved and specified`, `planned`, or `deferred`.

- Wave 0 Lean Agent Context — `implemented`
- Wave 1 Unified Contracts and Temporal Graph — `implemented`; workflow/execution schemas are `implemented foundation only`
- Wave 2 Specification Governance and Planning — deterministic governance, Technical Plan, and Implementation Slice runtimes `implemented`; canonical Constitution storage remains `planned`
- Wave 3 Repository Intelligence — parser/structural contracts `implemented foundation only`; runtimes `approved and specified`
- Wave 4 Context Intelligence — `approved and specified`
- Wave 5 Prompt and Handoff — Prompt Program/Typed AI contracts `implemented foundation only`; compilers/runtime `approved and specified`; connected delivery `deferred`
- Wave 6 Review and Convergence — `approved and specified`
- Wave 7 Agent Control Plane — execution/observability/skill-diagnostic contracts `implemented foundation only`; runtime `planned`
- Wave 8 Product Experience — `planned`
- Wave 9 SaaS Infrastructure — `planned`
- Wave 10 Evaluation and Launch — evaluation/divergence/experiment contracts `implemented foundation only`; Assertion Registry, suites, certifications, optimization/release, red-team/Bench, trace viewer, divergence runtime, benchmarks, and UI are `approved and specified` or `planned`

The complete unit sequence and status vocabulary are maintained in [context/06-progress-tracker.md](context/06-progress-tracker.md).

## Authoritative V1 Implementation Sequence

1. Technical Plan Runtime
2. Implementation Slice Runtime
3. Task Card Compiler Runtime
4. Context Compiler Runtime — canonical artifacts first
5. Prompt Program Renderer
6. Deterministic Prompt Evaluation / Certification
7. Repository Parsing + Structural Intelligence
8. Code-aware Context Compiler Integration
9. Review + Spec-to-Code Convergence
10. Agent Control Plane + Execution Passport
11. Approval-gated Connected Agent Delivery
12. Internal Product UI + Basic Persistence + APIs
13. Authentication, Billing, Teams, and Multiplayer
14. Evaluation Lab, Benchmarks, and Launch Hardening

Context Compiler v1 compiles canonical project artifacts only. Code-aware context compilation starts later, after Repository Parsing and Structural Intelligence can supply validated structural evidence.

## Deployment and Commercial Strategy

OXZI's near-term market is vibe coders, AI-assisted developers, agencies, and startup engineering teams. The same governance-first architecture can later support enterprise buyers that are reluctant to send confidential code or company data to external frontier-model providers.

Deployment modes:

- Cloud SaaS — managed OXZI service for fast onboarding and subscription-based access.
- Self-hosted Enterprise — future product mode deployed inside customer infrastructure so sensitive source code and company data can remain inside the organization. It supports customer-controlled models and providers, privacy, compliance, auditability, approval workflows, and governance, but is not immediate runtime scope.

Source and IP strategy:

- Core OXZI SaaS and orchestration engine remain closed-source; full source is not published publicly by default.
- Selected SDKs, schemas, integrations, templates, CLI utilities, or community tools may later be open-sourced.
- Public documentation and educational content may support adoption without exposing core product IP.

## Post-v1 Opportunities

- Multi-model orchestration
- Example optimization and fine-tuning workflows
- Prompt Program / Skill marketplace
- Plugin and MCP ecosystem
- Enterprise governance expansion
- Analytics and cost optimization

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
- [Prompt evaluation and certification](specs/19-prompt-evaluation-certification-optimization.md) — assertions, suites, trust, certification, datasets, Lab, red-team, and Bench
- [Divergent Reasoning](specs/20-divergent-reasoning-engine.md) — isolated branches, frames, critic, traps, adaptive cost, and decision reports
- [Prompt Programs and optimization](specs/21-prompt-programs-optimization.md) — versioned programs, examples, candidates, experiments, promotion, and rollback
- [Typed AI Contracts](specs/22-typed-ai-contracts-repair.md) — structured parsing, validation, bounded repair, partial results, and escalation
- [Observability and experiments](specs/23-observability-datasets-experiments.md) — privacy-aware traces, versions, datasets, and reproducible experiments
- [Selective skills and diagnostics](specs/24-selective-skills-agent-diagnostics.md) — DAILY/LIBRARY evidence and agent self-diagnostics
- [Repository structural intelligence](specs/25-repository-parsing-structural-intelligence.md) — parser adapters, incremental records, queries, rules, and safe previews

Formal accepted decisions are recorded in [DECISIONS.md](DECISIONS.md). Implementation contracts live under [`specs/`](specs/).
