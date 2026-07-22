# OXZI — Token-Saving Context Compiler Specification

## Status and Goal

**Status:** Approved and specified; not implemented. The formal product name remains Token-Saving Context Compiler.

The Token-Saving Context Compiler must:

> Generate the smallest sufficient, evidence-backed context package required for an agent to complete the approved task without reducing project quality.

Quality, safety, and correctness outrank token reduction. Compression removes redundancy, not meaning. The compiler optimizes for the smallest sufficient context and may select an explicit no-optimization path when its own overhead is likely to exceed the benefit.

## Modes

1. `quality_first` — broad relevant context with minimal compression
2. `balanced_quality` — default; concise context with complete mandatory coverage
3. `maximum_token_saving` — strongest safe deduplication under the same sufficiency gates
4. `custom_token_budget` — user target accepted only when the mandatory package fits safely

All modes preserve the same mandatory-context, dependency, blocker, and security gates. If a custom budget is too small, the compiler returns an explicit `insufficient_budget` result with the minimum-safe estimate. It may prepare or reference the minimum-safe package, but it cannot silently truncate or claim that the unsafe budget was honored.

## Inputs

- Approved task identity and goal
- Validated canonical project version/hash
- Task-relevant Knowledge Graph subgraph
- Target agent and its known context constraints
- Current phase and progress state
- Accepted decisions and protected invariants
- Review findings, blockers, and failed validations when present
- Selected mode and optional custom token budget
- Compiled Project Constitution version/fingerprint
- Healthy specification, Technical Plan, implementation-slice, Task Card, and Execution Passport references when applicable
- Temporal Project and task-relevant Repository Intelligence subgraphs with freshness

## Mandatory Context

Include each item whenever relevant:

- Task goal
- Approved scope
- Protected invariants
- Security and privacy constraints
- Blocking conflicts
- Accepted architectural decisions
- Direct dependencies
- Affected interfaces and contracts
- Required tests
- Acceptance criteria
- Files explicitly in scope or protected from modification
- Unresolved risks that could affect execution
- Applicable constitutional rules and specification/plan obligations
- Required artifact references with verified target-agent access and readability

Mandatory-context coverage, direct-dependency coverage, and blocker coverage must each be `100%`. An item can be represented by a stable versioned reference only when the target agent is guaranteed access to the referenced content.

## Reducible Context

- Repeated explanations
- Duplicate facts
- Irrelevant history
- Unrelated modules
- Verbose examples when equivalent concise rules exist
- Unchanged context already represented by accessible stable references or version IDs

## Context That Cannot Be Reduced Away

- Unique requirements
- Critical evidence
- Blocking decisions
- Necessary dependency context
- Security boundaries
- Validation requirements
- Ambiguity warnings

This protection also covers relevant acceptance criteria, required tests, and protected modification boundaries.

## Selection and Widening Algorithm

1. Preserve every explicit task seed.
2. Query the Knowledge Graph before loading the Project Bible or repository.
3. Traverse direct dependency, blocker/conflict, accepted-decision, security, test, acceptance, and documentation relationships.
4. Suppress generic high-degree hub expansion unless directly justified.
5. Read raw files only when graph evidence, missing traceability, or execution requires them.
   Repository selection prefers explicit file/symbol seeds, current parsed definitions, direct imports/calls/references, interfaces/types, tests, applicable structural rules, and recent relevant changes before whole files.
6. Record why any scope expansion occurred.
7. Add interfaces, risks, and evidence needed to understand or verify the task.
8. Deduplicate semantically identical versioned facts using deterministic identifiers.
9. Calculate coverage, graph-confidence sufficiency, and the minimum-safe package.
10. Automatically widen when a required relationship is absent, uncertain, or unsupported by enough evidence.
11. Estimate optimization overhead and select no optimization when likely net-negative.
12. Apply mode-specific compression only after all gates pass.
13. Return explicit insufficiency when a requested budget cannot contain the minimum-safe package.

Activation scales with work: no optimization for tiny tasks, compact maps for medium tasks, graph-guided compilation for larger tasks, and Quality First for high-risk work. The pipeline joins task/repository seeds, temporal project context, repository evidence, Constitution, requirements/plans, mandatory gates, deduplication, safe compression, target formatting, measurement, and Passport packaging.

Maximum Token Saving mode must pass exactly the same gates. Low-confidence graph paths cannot justify omitting adjacent context.

The governing acquisition rule is: “Read only task scope and justified dependency closure.” A compiler must never emit an unsafe blanket prohibition such as “Do not read any other file.”

## Output Contract

Every package exposes:

- Target agent
- Task identifier
- Context mode
- Included graph node IDs with inclusion reasons
- Included decisions and invariants
- Included evidence references
- Omitted categories with reasons
- Baseline input, output, cache, and total tokens with measurement status
- Optimized input, output, cache, and total tokens with measurement status
- Gross savings, optimization overhead, and net savings as separate values
- Optimization decision and no-optimization reason when applicable
- Sufficiency status and gate results
- Unresolved context risks
- Canonical version/hash and graph-policy version
- Custom-budget warning when applicable
- `truncated`, reasons, omitted-node count, omitted categories, mandatory-coverage status, and minimum-safe token estimate

Token values use `measured`, `tokenizer-estimated`, `character-estimated`, or `unavailable`. Output reduction cannot be reported as total-session reduction. The complete ledger contract is in `specs/10-efficiency-ledger.md`.

## Sufficiency Status

- `sufficient` — every mandatory gate passes
- `widened_sufficient` — initial selection failed a gate and automatic widening repaired it
- `insufficient` — required evidence or graph coverage is unavailable; no execution-ready package may be claimed
- `blocked` — a conflict, security finding, or task-definition failure prevents safe compilation
- `insufficient_budget` — the requested token budget cannot contain the minimum-safe package

## Non-Goals

- Prompt rendering
- Requirements rewriting
- Canonical or graph mutation
- Provider invocation
- Hiding unresolved ambiguity to satisfy a budget
- Workflow-policy selection, Passport certification, or prompt rendering

## Governance and Handoff Integration

The compiler consumes task seeds from the normalized Task Card and Constitution/specification/plan closure from the Knowledge Graph. It emits a versioned Context Package; it does not own those artifacts. The future Execution Passport references a sufficient package and certifies delivery compatibility. A stale parent version, unreadable artifact reference, missing mandatory constitutional rule, or unhealthy specification returns `insufficient` or `blocked` rather than an execution-ready package.

Convergence analysis may use package inclusion/omission evidence to diagnose stale or missing context. It cannot treat deliberate, justified omission of irrelevant material as drift.

Structural evidence includes its parser/query/rule version, freshness, evidence level, and inclusion reason. A structural match supplements exact text and repository-graph traversal; it cannot displace mandatory Constitution, requirement, security, acceptance, or validation context. Stale parsed evidence widens to current raw content or returns insufficiency.

## Acceptance Criteria

- Identical versioned inputs and mode produce deterministic packages.
- Tests prove 100% mandatory, dependency, and blocker coverage in every mode.
- Unsafe budgets widen with an explicit warning.
- Low-confidence or incomplete graph coverage widens or returns insufficient.
- Token optimization never changes approved meaning.
- Net savings subtract optimization overhead and quality failure prevents a positive success claim.
