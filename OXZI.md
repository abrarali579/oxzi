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
11. Project quality, safety, and correctness always take priority over token reduction.
12. Optimize for the smallest sufficient context, never the smallest possible context.
13. Never remove critical constraints, security rules, blockers, accepted decisions, direct dependencies, required tests, or relevant acceptance criteria merely to save tokens.
14. Treat Knowledge Graphs, context packs, task cards, prompts, visual diagrams, and Markdown as derived views that cannot silently mutate canonical state.
15. Generate only the user's selected or default prompt style initially; alternate styles are generated only when requested.
16. Let users review, regenerate, edit requirements, copy, or explicitly approve a prompt before any future connected-agent delivery.
17. OXZI does not execute project code; connected-agent delivery is optional, future, and governed by explicit approval policy.
18. Audit failures, security findings, and blockers must be repaired before unrelated feature work is recommended.

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

Phase 1 defines the original product contracts and Phase 2 established the application/tooling foundation. Phase 3 implements deterministic intelligence: the canonical, discovery, extraction, and derived Knowledge Graph foundations. Later phases add context outputs, agent workflow, product experience, SaaS infrastructure, and launch validation in that order.
