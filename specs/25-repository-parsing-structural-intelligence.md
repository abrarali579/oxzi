# OXZI — Repository Parsing and Structural Intelligence Specification

## Status and Boundary

**Provider-neutral contracts and deterministic cache/fingerprint helpers implemented; no parser or rewriting runtime installed.** `src/domain/repository-intelligence/` defines parser metadata, snapshots, parsed files, ranges/errors, symbols, relationships, queries/matches, rules/findings, transformation previews, update classifications, cache invalidation, and deterministic serialization.

The Repository Intelligence Graph remains separate from the canonical Project Knowledge Graph. A joined Evidence View is derived at query time.

## Parsing Pipeline

```text
Repository Snapshot → Language Detection → Parser Selection
→ Incremental Syntax Trees → Symbols/Relationships → Repository Graph
→ Structural Indexes → Task-Relevant Retrieval
```

Parser adapters declare language, parser/grammar versions, applicability, error tolerance, incremental updates, changed ranges, traversal, extraction, query, and serialization capabilities. Domain code does not depend on one parsing library.

Parsed files retain revision/path/content hash, adapter and grammar versions, tree fingerprint, changed ranges, visible syntax-error regions, symbols, relationships, freshness, parse time, and fingerprint. Invalid/incomplete files remain partially inspectable where an adapter supports recovery. Generated/vendor paths are excluded by versioned policy. Text fallback is labeled textual evidence, never structural proof.

Unchanged files reuse cache only when content, parser, grammar, and extraction fingerprints match. Deleted files are pruned. Parser/grammar changes trigger explicit dependency-closure or full rebuild. Stale results are never reused silently.

## Structural Search and Rules

Structural queries support pattern, symbol, node, relationship, and rule selectors with language/file scope, captures, contextual constraints, exclusions, versions, and caps. Matches retain exact file/range/symbol/node/captures/scope/parser evidence, confidence, and freshness.

Text search, structural search, symbol indexes, repository graph traversal, and optional semantic retrieval are separate signals. Structural matches are evidence, not automatically defects or approved truth.

Rules are versioned architecture, security, quality, migration, deprecated API, repository convention, framework, task-scope, or generated-file policies. They include positive/negative examples, relational constraints, scope/exclusions, severity, Constitution links, evaluation history, approval, fix availability/risk, and enforcement class.

## Transformation Safety

Detection and rewrite permission are separate. The future pipeline selects an approved rule, scopes matches, generates a non-applying preview, detects overlaps/restricted files, applies only in isolation with permission, reparses, validates, emits evidence/diff, and preserves rollback. Uncertain transformations require review; complete-file replacement is avoided when a safe surgical edit exists.

Current transformation records are previews with `applied: false`; no code rewrite is implemented.

## Evidence Levels and Context Selection

Evidence strength is: textual match → parsed structural match → symbol relationship → repository graph relationship → validated runtime/test evidence → human-approved project truth. Claims cite the strongest available level and graph edges record derivation.

Context selection prioritizes explicit files/symbols, task seeds, definitions, direct imports/calls/references, interfaces/types, tests, applicable rules, relevant changes, supporting scope, then full files only when necessary. Inclusion reasons and freshness are disclosed; unrelated files, generated output, hubs, and lockfile bodies are avoided.

## Non-Goals

Deferred: language detection runtime, parser registry, initial incremental parser adapter, grammars, AST scanner, structural query executor, rule scanner, repository graph projector, safe rewrite executor, embeddings, persistence, providers, and UI.
