# OXZI — Knowledge Graph Engine Specification

## Status and Purpose

**Status:** Deterministic temporal foundation `2.0.0` implemented in `src/domain/knowledge-graph/`; repository enrichment, persistence, cross-version storage, AI enrichment, and UI remain deferred.

The Knowledge Graph is a typed, evidence-backed directed projection from one validated canonical project version. It supports deterministic impact analysis and query-first task-subgraph selection. It is a derived view, never a second database or source of truth.

## Graph Model

Schema-supported node types (the canonical projector emits only evidence-backed current categories):

- `project`, `goal`, `user_persona`, `problem`, `solution`, `requirement`, `feature`, `user_flow`
- `decision`, `assumption`, `conflict`, `risk`
- `architecture_component`, `integration`, `api`, `data_entity`, `security_invariant`
- `ui_screen`, `visual_rule`, `implementation_module`, `repository_file`, `test`
- `documentation_artifact`, `task`, `review_finding`, `version`, `episode`
- governance, planning, workflow, Passport, execution, artifact, convergence, symbol, and escalation types listed below

Implemented relationship vocabulary:

- `depends_on`, `enables`, `affects`, `implements`, `implemented_by`
- `blocked_by`, `conflicts_with`, `derived_from`, `decided_by`, `assumed_by`
- `mitigates`, `secured_by`, `validated_by`, `tested_by`, `documented_in`
- `rendered_as`, `reads_from`, `writes_to`, `precedes`, `supersedes`, `relevant_to`

Every node and edge contains stable identity/type/label, source/evidence references, bounded confidence, derivation method, approval/lifecycle, bitemporal/freshness metadata, schema/projector versions, deterministic order, and a fingerprint. Edges also contain stable endpoints and an explicit `inferred` flag.

The graph contains:

- canonical project version/hash
- graph schema version `2.0.0`
- projector version `2.0.0`
- node and edge fingerprints
- one graph fingerprint

Fingerprints are deterministic content invalidation keys, not cryptographic security claims.

## Deterministic Projection

Canonical evidence records project as immutable Episode nodes with `evidenced_by` relationships. Effective/event and ingestion/system time remain distinct; current facts and superseded historical facts can coexist without canonical mutation.

`projectCanonicalProjectToKnowledgeGraph()` first validates input through the canonical project schema and never mutates it. Projection currently covers:

- project and version metadata
- problems, solutions, goals, users, scope, dependencies, features, flows, and acceptance criteria
- visual rules
- architecture, stack, deployment, integrations, data entities, public-environment requirements, security, privacy, and authentication
- quality requirements and canonical testing requirements
- delivery phases, milestones, tasks, risks, assumptions, decisions, and conflicts
- the six contract-defined living documentation artifacts

Canonical field IDs form stable identity anchors. Named list-item IDs derive from their field identity and normalized semantic name; changing a description changes the node and graph fingerprints without unnecessarily changing the node ID. Projection order is independent of runtime map ordering, and stable JSON serialization recursively sorts object keys.

Explicit canonical relationships retain field evidence. Structural relationships such as user-flow-to-goal or architecture-to-integration remain visibly inferred and may carry lower confidence. Open conflicts remain blocker nodes; blocking risks remain visible. No projection authorizes canonical mutation.

Repository-file, implementation-module, API, UI-screen, and review-finding types are valid but are not fabricated when canonical evidence lacks those records. Later repository ingestion must add them through a separate validated evidence contract.

## Deterministic Indexes

`buildKnowledgeGraphIndexes()` provides indexes for:

- node ID
- node type
- edge type
- outgoing relationships
- incoming relationships
- source reference across nodes and edges
- evidence reference across nodes and edges
- temporal status/current validity, canonical version, and canonical project section

Index array order follows graph order and stable identity.

## Traversal Contract

Forward and reverse traversal support relationship/node filters, confidence thresholds, current/historical/all temporal queries, depth/caps, cycle safety, seed preservation, hub suppression, and deterministic ordering.

## Path Finding and Integrity

Path finding returns node/edge paths, relationship types, minimum confidence, evidence, temporal validity, unresolved gaps, and truncation. The integrity auditor covers schema/ID validity, dangling/self edges, evidence direction, temporal and supersession consistency, ordering, fingerprints, orphans, unresolved relationships, freshness, conflicts, and canonical traceability. Statuses are `valid`, `valid_with_warnings`, `stale`, `partially_stale`, `conflicted`, `invalid`, or `rebuild_required`.

Every task seed survives even when the requested result cap is smaller than the seed set. Generic project/version/documentation hubs stop expansion when their eligible degree exceeds the configured threshold unless the caller explicitly enables hub expansion. Low-confidence traversed edges are disclosed.

Traversal truncation metadata contains:

- `truncated`
- ordered reasons
- omitted node count
- omitted node categories
- mandatory coverage status
- minimum-safe token estimate with measurement status

Generic traversal reports mandatory coverage as `not_assessed` and its minimum-safe estimate as unavailable. The task-subgraph operation performs that assessment.

## Impact Analysis

`analyzeKnowledgeGraphImpact()` traverses forward and reverse from one or more seeds and returns affected:

- requirements, features, decisions, risks, and blockers
- security invariants and architecture components
- integrations, screens, modules, and files
- tests and documentation

It classifies direct, transitive, uncertain, and blocking impact independently. A node may appear in multiple classifications. Missing repository evidence yields empty module/file/screen groups rather than invented records.

## Task Subgraph Contract

`extractTaskSubgraph()` selects task seeds and justified relationship closure for dependencies, blockers/conflicts, accepted decisions, assumptions, security invariants, acceptance criteria, tests, and documentation. It returns:

- seed nodes
- mandatory dependencies
- blockers
- accepted decisions
- security invariants
- relevant tests and documentation
- included nodes/edges
- every omitted node with a reason
- truncation and coverage state
- canonical and graph fingerprints and policy versions

The result cap cannot remove a seed or mandatory node. If the cap is below the mandatory set, the result may exceed the requested cap, reports `result_cap_below_mandatory_set`, and includes a clearly `character_estimated` minimum-safe token estimate. Task subgraphs are selection evidence for the later Context Compiler; they do not compress content or grant permission to omit mandatory context.

## Typed Governance and Execution Vocabulary

The `2.0.0` schemas accept the following types, while the canonical projector creates only categories supported by current canonical data:

- Nodes: `constitutional_rule`, `specification`, `acceptance_criterion`, `technical_plan`, `implementation_slice`, `workflow_policy`, `agent_skill`, `task_card`, `execution_passport`, `execution_record`, `artifact`, `compliance_review`, `quality_review`, `convergence_finding`, and `escalation`.
- Edges: `governed_by`, `specifies`, `satisfies`, `violates`, `planned_by`, `decomposed_into`, `executed_by`, `packaged_as`, `uses_workflow`, `requires_skill`, `produces`, `evidenced_by`, `reviewed_by`, `converges_with`, `diverges_from`, `supersedes`, `repairs`, and `escalates_to`.

The existing generic `task` type remains valid for current canonical execution fields. A future migration must define compatibility and cannot silently reinterpret existing node IDs. Every new record will preserve source/evidence references, confidence, lifecycle/version metadata, freshness, deterministic ordering, and fingerprints. Repository-derived file or symbol evidence remains a separate validated ingestion boundary.

Future graph versions may add assertion, evaluation suite/scenario, prompt certification, execution certification, renderer candidate, cognitive frame, divergence request, candidate/cluster/score/trap, and decision-report nodes. Relationships must preserve proposal/approval state and may not turn generated candidates or evaluator claims into canonical truth.

Prompt Programs, typed completions, traces, experiments, skill diagnostics, parser records, structural rules/findings, and transformation previews are future graph evidence types. Repository-derived nodes remain in a separate Repository Intelligence Graph; only a derived evidence view may join them to project intent. Trace, AI, optimization, or structural evidence cannot become canonical truth through projection.

## Non-Goals of the Implemented Foundation

- Repository AST or code graph
- Repository scanning or evidence ingestion
- Graph database or persistence
- Incremental projection updates beyond fingerprints for later invalidation
- Embeddings, semantic search, or AI graph enrichment
- Provider calls, prompt compilation, or token compression
- UI or visual diagram rendering
- Canonical-state mutation

## Foundation Acceptance Evidence

The unit suite covers deterministic projection and serialization, stable IDs, evidence/source indexes, forward/reverse and filtered traversal, cycles, seed preservation, caps, hubs, impact classes, low-confidence disclosure, task mandatory coverage, non-mutation, fingerprint invalidation, both canonical fixtures, and invalid graph rejection.
