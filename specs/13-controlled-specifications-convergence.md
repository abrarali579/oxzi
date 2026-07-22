# OXZI — Controlled Specifications, Planning, and Convergence Specification

## Status and Purpose

**Status:** Approved and specified; not implemented.

This specification separates requirement truth, technical planning, executable work, controlled change, independent implementation slicing, and long-lived spec-to-code convergence.

## Artifact Separation

### Specification

Defines approved what, why, actors, required outcomes, constraints, acceptance criteria, risks, scope, exclusions, evidence, and constitutional obligations without prescribing incidental implementation detail.

### Technical Plan

Defines **how** an approved specification will be implemented: architecture, components, interfaces, data model, dependencies, migrations, security implementation, testing strategy, rollout/rollback, implementation sequence, technical risks, and slice boundaries. Every plan traces to specification and Constitution IDs.

### Task Card

Defines one bounded unit of work selected from a healthy specification and approved plan. It contains execution instructions and validation but cannot broaden either parent artifact.

Specification, Technical Plan, and Task Card are distinct normalized, versioned artifacts. Rendering one never mutates another. Every Task Card traces to specification and plan nodes, and every acceptance criterion eventually links to implementation and verification evidence or remains visibly unverified.

## Independent Implementation Slice Planner

The future planner emits the smallest vertical slices that can be implemented and validated independently. Every slice contains stable ID, goal, parent plan/spec references, prerequisites, owned files or boundaries, protected areas, acceptance criteria, validation, artifact outputs, risk, and completion state.

A valid slice:

- delivers a coherent observable capability or foundation contract;
- has explicit dependencies and no hidden prerequisite;
- is independently implementable, testable, reviewable, and demonstrable;
- can pass its own acceptance and regression checks;
- is reversible where practical and bounded for one agent session;
- avoids unrelated horizontal cleanup; and
- records why a horizontal foundation slice is unavoidable when no safe vertical slice exists.

Ordering is deterministic from blockers, dependencies, Constitution rules, specification priority, risk, context size, affected modules, testing boundaries, lifecycle relevance, and value. Parallel eligibility requires disjoint mutation boundaries or an explicit merge contract.

## Controlled Living Specification Flows

Three change flows are mandatory:

1. **Forward Flow:** approved specification guides plan and implementation.
2. **Reverse Proposal:** repository evidence or audit findings propose an evidence-backed change for configured approval. Code never silently becomes requirement truth.
3. **Continuous Reconciliation:** specifications, graph, repository evidence, progress, and audits are compared without automatic approval.

Change-proposal statuses are `proposed`, `awaiting_review`, `accepted`, `rejected`, `superseded`, and `withdrawn`. Material requirement changes require configured human approval. Lower thresholds for minor implementation-detail synchronization are allowed only when explicitly configured.

Every change records initiator, reason, prior/new version, affected graph IDs, evidence, approval, and invalidated artifacts. Historical versions remain immutable and readable.

## Spec-to-Code Convergence Engine

The future deterministic engine compares versioned Specifications, Technical Plans, Task Cards, Constitution rules, repository evidence, execution artifacts, and reviews. It reports normalized findings, not automatic mutations.

Finding classes include:

- requirement absent from plan or task
- planned work absent from implementation evidence
- implementation outside approved scope
- stale specification, plan, task, or Passport
- acceptance criterion without validation evidence
- incompatible interface, schema, security, or dependency evidence
- implementation discovery awaiting reverse approval
- artifact or graph evidence too weak to decide
- fully converged, partially implemented, or unverified implementation
- stale technical plan or architecture drift
- conflicting evidence, repair required, blocked, or human decision required

Each finding includes stable ID, requirement/rule ID, direction, severity, affected graph nodes, expected and observed state, involved versions, evidence, confidence, freshness, recommended action, approval requirement, and status. Evidence may be file-, symbol-, test-, artifact-, documentation-, progress-, or review-level. Required validations and repository evidence outrank agent completion claims.

## Boundary from Review/Audit

Review/Audit evaluates one bounded execution and recommends accept, repair, clarification, re-audit, proceed, or stop. Convergence evaluates alignment among durable artifacts and implementation evidence across versions. Review findings are convergence inputs; convergence findings can require a focused review. Neither owns command execution, secret redaction, approval, or canonical mutation.

## Knowledge Graph Direction

Future graph vocabulary includes specification, acceptance criterion, technical plan, implementation slice, Task Card, artifact, compliance review, quality review, convergence finding, and escalation nodes with traced relationships. Reservation does not imply current graph-runtime support.

## Non-Goals

- Repository AST ingestion or source graph construction
- Runtime planners, convergence analyzers, UI, persistence, or providers
- Automatic approval or code execution
- Treating generated Markdown as the authoritative specification record

## Acceptance Criteria for Implementation

- Strict schemas enforce version, parent, evidence, and approval links.
- Slice ordering and parallel eligibility are deterministic.
- Controlled changes never overwrite history.
- Convergence fixtures cover drift in both spec-to-code and code-to-spec directions.
- Unsupported agent claims remain unverified.
