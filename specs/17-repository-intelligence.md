# OXZI — Repository Intelligence Specification

## Status and Boundary

**Status:** Approved and specified; not implemented. No AST parser, embedding, repository scanner, or persistence is added by this unit.

The Repository Intelligence Graph derives actual implementation evidence—tracked files, language, symbols, imports/exports, references/calls, interfaces, routes, schemas, tests, configuration, documentation, ownership, and fingerprints. It remains separate from the Temporal Project Knowledge Graph. A Unified Evidence View joins both at query time and is never a source of truth.

## Deterministic Pipeline

Repository static scan → file/symbol graph → task-aware ranking → bounded repository subgraph → lines of interest → full files only when required.

Ranking prioritizes explicit file/symbol seeds, project-graph seeds, plan/editable scope, definitions/references, dependencies, rare identifiers, tests, recent changes, and audit findings. It down-ranks generic hubs, generated or historical files, duplicates, and lockfiles unless directly required.

## Compact Map and Lines of Interest

Budget fitting preserves all seeds, definitions, critical dependencies, interfaces, and tests. It never silently character-truncates. Raw reads prefer the relevant symbol, parent scope, nearby imports/types, interface, and necessary surroundings.

Scopes are `editable`, `read_only`, `restricted`, `generated`, or `unknown_requires_approval`. Incremental scans use content hash, parser/grammar version, commit, changed-file set, and deleted-file pruning. Large graphs may use deterministic strongly connected communities with cross-batch neighbor/interface artifacts.

## Hybrid Retrieval

Provider-neutral policies include `exact_first`, `task_dependency`, `current_truth`, `historical`, `impact_analysis`, `diverse_context`, `security_first`, and `review_evidence`. Signals may combine exact IDs/files/symbols, lexical search, graph distance, structure, temporal validity, source/evidence, optional semantics, frequency, recency, confidence, and approved importance. Every result explains selection; deterministic operation requires no embeddings.

## Acceptance Direction

Future implementation must support multiple languages through versioned adapters, incremental correctness, task-seed preservation, deterministic fitting, freshness, and repository evidence without AI enrichment.
