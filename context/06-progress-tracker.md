# OXZI — Progress Tracker

## Current Phase

Phase 1 — Product Foundation: Complete

## Current Goal

Prepare the OXZI repository for implementation using a locked product definition, canonical schema, discovery rules, six living files, and Codex handoff instructions.

## Completed

- Product purpose and target users defined
- Core user flow defined
- MVP and out-of-scope boundaries defined
- Canonical structured state selected as source of truth
- Six living-file model upgraded
- Minimal interview philosophy defined
- Master Prompt interview-skip behavior defined
- Field evidence, confidence, criticality, and approval model defined
- Question scoring and question budget defined
- Cloud/local provider-neutral architecture defined
- Security and engineering invariants defined
- Two validation projects selected
- Codex local-folder handoff guide created

## Locked Architecture Decisions

### ADR-001 — Canonical Structured State

Markdown files are generated views, not the primary database. This prevents contradictions and enables consistent regeneration and export.

### ADR-002 — Minimal Discovery

OXZI asks only for missing high-impact information. It never uses a fixed questionnaire.

### ADR-003 — Interview Skip

When critical completeness meets the threshold and there are no unresolved contradictions, OXZI skips the interview.

### ADR-004 — Provider Neutrality

Cloud and local models connect through one AI gateway interface.

### ADR-005 — Portable Ownership

Users can export readable Markdown and ZIP packages that remain useful outside OXZI.

## Next Phase

Phase 2 — Repository Bootstrap and UX Prototype

Recommended first implementation units:

1. Initialize Next.js TypeScript project.
2. Add linting, formatting, test runner, and environment validation.
3. Implement canonical Zod schemas and fixtures.
4. Implement deterministic completeness scoring and question ranking.
5. Build static New Project and Understanding Review flows.
6. Add mocked zero-question and minimal-question scenarios.

## Open Decisions for Later

- Prisma versus Drizzle
- Exact cloud model providers available at launch
- Billing provider and pricing plans
- Final OXZI brand identity
- Deployment domain

These decisions do not block Phase 2 bootstrap.

## Session Resume Context

Start with `specs/01-canonical-project-schema.md` and implement runtime Zod schemas before connecting a real AI provider. Use fixtures for the Oxzire 3D Website and News Automation validation projects.
