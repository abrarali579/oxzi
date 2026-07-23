# OXZI — Project Genesis Operating File

OXZI converts a plain-language idea, an existing brief, or a complete master prompt into a structured, AI-ready project operating system. It asks only for information that is both missing and materially important.

## Product Position

- Product type: future Cloud SaaS, with self-hosted Enterprise as a later product mode
- Primary users: vibe coders, AI-assisted developers, agencies, and startup engineering teams
- Primary output: six living project context files plus structured project data
- AI support: cloud providers and local OpenAI-compatible models
- Interaction style: frank, concise, helpful, and non-corporate

## Core Promise

> Describe the project once. OXZI keeps every AI aligned from planning through delivery.

## Mandatory Principles

Permanent priority: project quality → safety/security → correctness → requirement fidelity → mandatory context coverage → evidence/traceability → maintainability → token efficiency → speed/convenience.

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
19. Account for optimization overhead and allow a no-optimization path when compression would be net-negative.
20. Keep input, output, cache, gross, overhead, and net token metrics distinct and label every estimate honestly.
21. Acquire context query-first from task seeds and justified graph closure; widen automatically when sufficiency is uncertain.
22. A budget below the minimum safe context produces explicit insufficiency, never silent truncation.
23. Root agent files remain lean navigation maps; detailed requirements live in context and specifications.
24. Bounded outputs remove narration and repetition, never exact evidence or technical meaning.
25. Compile project governance from approved canonical constitutional rules; ADRs explain rationale but do not replace enforceable rule records.
26. Keep Specifications, Technical Plans, Task Cards, Context Packages, Passports, and rendered prompts as distinct versioned artifacts.
27. Do not plan from an unhealthy specification or deliver a stale, uncertified Execution Passport.
28. Implementation discoveries create reviewable reverse proposals; code never silently rewrites approved requirements.
29. Require both compliance and quality review before accepting a unit.
30. Select workflow policies, skills, tools, and adapters from task risk and capabilities, and account for their overhead.
31. Report requirement correctness, implementation correctness, security compliance, validation completeness, and token efficiency as separate dimensions; success in one cannot hide failure in another.
32. Preserve effective-time and ingestion-time history; superseded facts remain traceable through immutable Episodes.
33. Keep project-intent and repository-evidence graphs separate and join them only in derived query views.
34. Evaluate prompt, context, workflow, target agent, reasoning strategy, execution, and user outcome as separate evidence-linked artifacts.
35. Use isolated divergence only when risk-adjusted decision value exceeds repeated-context and orchestration cost; generated ideas remain proposals.
36. Optimize versioned Prompt Programs against measurable outcomes while preserving normalized Task Card meaning.
37. Require typed, validated AI results before trust elevation; malformed or partial prose cannot silently enter project workflows.
38. Keep observability privacy-first and version-complete; traces and experiments are derived evidence, not project truth.
39. Classify skills as evidence-backed DAILY or discoverable LIBRARY and diagnose repeated failures before blind retry.
40. Begin repository understanding with parser-neutral structural evidence, incremental freshness, and explicit evidence levels.
41. Keep structural detection separate from permission to transform code; future edits require preview, scope, validation, and rollback.

Future positioning: OXZI is not merely a prompt generator. It is designed for Typed Agent Reliability, measurable Prompt Programs, privacy-aware end-to-end traceability, selective agent intelligence, incremental structural repository understanding, evidence-gated divergence, and safe previewable transformations. These remain unavailable where `CURRENT.md` marks only contracts or planned runtimes.

## Agent Entry Point

All coding agents use this reading order:

1. `AGENTS.md`
2. `CURRENT.md`
3. Active Task Card or explicit user task
4. `context/00-context-map.md`
5. Relevant authoritative sections
6. Affected source files and tests
7. Justified dependency closure

Full-project context remains available for cross-cutting work or when targeted reading cannot establish sufficiency.

## Current Build Boundary

Phase 1 defines the original product contracts and Phase 2 established the application/tooling foundation. Phase 3 has implemented canonical, discovery, extraction, Knowledge Graph, Constitution resolution, Specification Health, Technical Plan Runtime, and Implementation Slice Runtime foundations. Technical Plan Runtime and Implementation Slice Runtime remain separate implementation units. Next comes Task Card Compiler Runtime, then Context Compiler Runtime for canonical artifacts first. Code-aware context compilation waits until Repository Parsing and Structural Intelligence are implemented. Internal Product UI may begin once the core deterministic pipeline is stable; authentication, billing, teams, multiplayer, and self-hosted Enterprise remain later scope.
