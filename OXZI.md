# OXZI — Project Genesis Operating File

OXZI converts a plain-language idea, an existing brief, or a complete master prompt into a structured, AI-ready project operating system. It asks only for information that is both missing and materially important.

## Product Position

- Product type: future SaaS
- Primary users: founders, solo builders, agencies, product teams, and AI-assisted developers
- Primary output: six living project context files plus structured project data
- AI support: cloud providers and local OpenAI-compatible models
- Interaction style: frank, concise, helpful, and non-corporate

## Core Promise

> Describe the project once. OXZI keeps every AI aligned from planning through delivery.

## Mandatory Principles

1. Never ask for information already present in user input or imported files.
2. Infer safe defaults where reversal is cheap.
3. Ask only when a wrong assumption could materially change scope, architecture, cost, security, timeline, or visual direction.
4. Skip discovery when the master prompt provides sufficient critical information.
5. Keep the canonical structured project schema as the source of truth.
6. Generate Markdown files from the canonical schema; do not treat Markdown as the database.
7. Record assumptions, decisions, conflicts, and unresolved questions explicitly.
8. Do not silently modify approved architecture or product scope.
9. Keep the user interaction short; prefer selectable answers over typing.
10. Every generated requirement must be traceable to user input, imported material, an approved assumption, or a documented default.

## Agent Entry Point

All coding agents use this reading order:

1. `AGENTS.md`
2. `PROJECT.md`
3. `DECISIONS.md`
4. `OXZI.md`
5. Context files in numerical order
6. Relevant specifications
7. Relevant examples

## Current Build Boundary

Phase 1 defines the product, canonical schema, discovery logic, six living files, architecture guardrails, and handoff process. Phase 2 application implementation is in progress; the repository bootstrap is complete and product-domain logic has not yet been implemented.
