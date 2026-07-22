# OXZI — Knowledge Graph Engine Specification

## Status and Purpose

**Status:** Approved and specified; not implemented.

The Knowledge Graph Engine produces a typed, evidence-backed directed graph from one validated canonical project version. It supports impact analysis, context selection, Task Card compilation, visual architecture, and later repository-aware review. It is a derived projection, not a second database or source of truth.

## Initial Node Types

- `project`
- `goal`
- `user_persona`
- `problem`
- `solution`
- `requirement`
- `feature`
- `user_flow`
- `decision`
- `assumption`
- `conflict`
- `risk`
- `architecture_component`
- `integration`
- `api`
- `data_entity`
- `security_invariant`
- `ui_screen`
- `visual_rule`
- `implementation_module`
- `repository_file`
- `test`
- `documentation_artifact`
- `task`
- `review_finding`
- `version`

## Initial Relationship Types

- `depends_on`
- `enables`
- `affects`
- `implements`
- `implemented_by`
- `blocked_by`
- `conflicts_with`
- `derived_from`
- `decided_by`
- `assumed_by`
- `mitigates`
- `secured_by`
- `validated_by`
- `tested_by`
- `documented_in`
- `rendered_as`
- `reads_from`
- `writes_to`
- `precedes`
- `supersedes`
- `relevant_to`

## Common Record Contract

Every node and relationship contains:

- A stable identifier derived from stable canonical or repository evidence identity
- Its declared node or relationship type
- Source references and evidence references
- Confidence bounded by the canonical confidence policy
- Canonical lifecycle and version/hash metadata
- A deterministic ordering key
- Optional approval state when approval is meaningful

Relationships additionally identify stable `from` and `to` node IDs. Implementations must reject dangling references, duplicate IDs, unknown types, non-finite confidence, and nondeterministic ordering.

## Projection Rules

1. The initial graph is generated only from a validated canonical project version.
2. Canonical identifiers are reused when suitable; derived identifiers use versioned deterministic rules.
3. Evidence-backed explicit links outrank inferred structural links.
4. Low-confidence relationships remain visible with their confidence and evidence. They cannot silently drive destructive changes, approval, scope removal, or security decisions.
5. Repository-file, implementation-module, test, documentation-artifact, task, and review-finding nodes are added later only through explicit repository or Review Engine evidence.
6. AI-assisted enrichment is deferred. A future provider may only emit validated graph proposals that require the configured approval policy.
7. Regenerating the graph from identical canonical version and repository evidence produces byte-stable logical content and ordering.
8. Deleting, changing, or superseding a feature exposes directly and transitively affected nodes; it never deletes canonical state.

## Required Traversals

The foundation must support deterministic:

- Direct neighbors filtered by relationship type
- Forward and reverse dependency traversal
- Direct and transitive impact sets
- Blocker and conflict closure
- Evidence and decision traceability
- Feature-to-interface, file, test, and documentation traceability when repository evidence exists
- Task-relevant subgraph extraction with inclusion reasons
- Stable cycle reporting rather than unbounded traversal

Traversal results retain paths, relationship confidence, and inclusion reasons. Consumers must widen or stop when required paths are missing or too uncertain.

## Task Subgraph Contract

A task subgraph includes the task target nodes, mandatory decisions and invariants, direct dependencies, blockers, affected interfaces, required tests, acceptance criteria, unresolved risks, and the evidence needed to explain inclusion. It records the canonical version/hash and graph policy version used. A subgraph is context-selection evidence, not permission to omit mandatory context.

## Consumers

- Impact analysis identifies direct and transitive consequences.
- The Token-Saving Context Compiler selects and explains sufficient task context.
- The AI Task Card Prompt Compiler references affected graph nodes.
- The Visual Master Architecture Generator renders audience-specific views.
- The Review/Audit Analyzer may later attach evidence-backed findings.

## Non-Goals for the Foundation

- Graph database adoption
- Persistence or synchronization jobs
- Embeddings or semantic search
- AI enrichment
- Repository scanning
- UI visualization
- Canonical mutation

## Foundation Acceptance Criteria

- Strict TypeScript and Zod contracts cover all initial types and common metadata.
- Two canonical fixtures produce valid deterministic projections.
- Stable traversal and task-subgraph tests cover cycles, missing references, low confidence, blockers, and transitive impact.
- The implementation is provider-neutral, pure, JSON-safe, and does not modify canonical state.

