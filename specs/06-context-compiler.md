# OXZI — Token-Saving Context Compiler Specification

## Status and Goal

**Status:** Approved and specified; not implemented. The formal product name remains Token-Saving Context Compiler.

The Token-Saving Context Compiler must:

> Generate the smallest sufficient, evidence-backed context package required for an agent to complete the approved task without reducing project quality.

Quality, safety, and correctness outrank token reduction. Compression removes redundancy, not meaning.

## Modes

1. `quality_first` — broad relevant context with minimal compression
2. `balanced_quality` — default; concise context with complete mandatory coverage
3. `maximum_token_saving` — strongest safe deduplication under the same sufficiency gates
4. `custom_token_budget` — user target accepted only when the mandatory package fits safely

All modes preserve the same mandatory-context, dependency, blocker, and security gates. If a custom budget is too small, the compiler warns and automatically widens to the minimum safe package.

## Inputs

- Approved task identity and goal
- Validated canonical project version/hash
- Task-relevant Knowledge Graph subgraph
- Target agent and its known context constraints
- Current phase and progress state
- Accepted decisions and protected invariants
- Review findings, blockers, and failed validations when present
- Selected mode and optional custom token budget

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

1. Seed the package with task goals and explicitly in-scope/protected files.
2. Add mandatory decisions, invariants, security/privacy rules, tests, and acceptance criteria.
3. Traverse direct dependencies and blocker/conflict paths.
4. Add interfaces, risks, and evidence needed to understand or verify the task.
5. Deduplicate semantically identical versioned facts using deterministic identifiers.
6. Calculate coverage and graph-confidence sufficiency.
7. Automatically widen when a required relationship is absent, uncertain, or unsupported by enough evidence.
8. Apply mode-specific compression only after all gates pass.
9. If a token target still cannot be met safely, emit the minimum safe package with a budget warning.

Maximum Token Saving mode must pass exactly the same gates. Low-confidence graph paths cannot justify omitting adjacent context.

## Output Contract

Every package exposes:

- Target agent
- Task identifier
- Context mode
- Included graph node IDs with inclusion reasons
- Included decisions and invariants
- Included evidence references
- Omitted categories with reasons
- Estimated original tokens
- Estimated compiled tokens
- Estimated savings percentage
- Sufficiency status and gate results
- Unresolved context risks
- Canonical version/hash and graph-policy version
- Custom-budget warning when applicable

Token values are labeled estimates unless calculated with the selected target agent/model tokenizer.

## Sufficiency Status

- `sufficient` — every mandatory gate passes
- `widened_sufficient` — initial selection failed a gate and automatic widening repaired it
- `insufficient` — required evidence or graph coverage is unavailable; no execution-ready package may be claimed
- `blocked` — a conflict, security finding, or task-definition failure prevents safe compilation

## Non-Goals

- Prompt rendering
- Requirements rewriting
- Canonical or graph mutation
- Provider invocation
- Hiding unresolved ambiguity to satisfy a budget

## Acceptance Criteria

- Identical versioned inputs and mode produce deterministic packages.
- Tests prove 100% mandatory, dependency, and blocker coverage in every mode.
- Unsafe budgets widen with an explicit warning.
- Low-confidence or incomplete graph coverage widens or returns insufficient.
- Token optimization never changes approved meaning.
