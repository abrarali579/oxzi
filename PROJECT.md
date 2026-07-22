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
7. Generate six living Markdown files from the approved canonical state.
8. Approve, edit, version, and export the project package.
9. Let coding agents implement one scoped unit at a time while keeping decisions and progress synchronized.

## Current Phase

Phase 2 — Repository Bootstrap and UX Prototype is in progress.

The Next.js application foundation is complete. The next planned unit is baseline development tooling: formatting, a test runner, and environment validation. Product-domain schema and workflow implementation follow that tooling unit. See [context/06-progress-tracker.md](context/06-progress-tracker.md) for the live implementation state.

## Locked Stack

The current implementation foundation is locked to:

- npm package management
- Latest stable Next.js with the App Router
- Strict TypeScript
- Application code under `src/`
- Tailwind CSS styling baseline
- Next.js ESLint flat configuration

The broader MVP architecture retains PostgreSQL, Supabase Auth and Storage, Zod validation, a provider-neutral AI gateway, database-backed jobs, and initial Vercel/Supabase deployment. The ORM remains an explicit later decision; none of these later services are installed during repository bootstrap.

## MVP Boundaries

The MVP includes project intake, requirement extraction, adaptive minimal discovery, understanding review, canonical project state, deterministic six-file generation, versioning, and portable Markdown/ZIP export. It supports cloud providers and local OpenAI-compatible models through one provider-neutral boundary.

The initial MVP excludes autonomous full-project coding, direct Figma generation, real-time multiplayer collaboration, billing enforcement, direct GitHub repository creation, automatic deployment, and continuous code-versus-spec auditing.

## Detailed Context

- [Project overview](context/01-project-overview.md) — product, users, scope, and success criteria
- [Architecture](context/02-architecture.md) — stack, system boundaries, data flow, security, and invariants
- [UI and visual context](context/03-ui-visual-context.md) — experience direction, screens, responsive behavior, and accessibility
- [Code standards](context/04-code-standards.md) — engineering, validation, testing, and organization rules
- [AI workflow rules](context/05-ai-workflow-rules.md) — agent behavior, priorities, and verification
- [Progress tracker](context/06-progress-tracker.md) — current phase, completed work, checks, and next unit

Formal accepted decisions are recorded in [DECISIONS.md](DECISIONS.md). Implementation contracts live under [`specs/`](specs/).
