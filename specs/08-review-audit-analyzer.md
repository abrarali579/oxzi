# OXZI — Review/Audit Analyzer Specification

## Status and Purpose

**Status:** Approved and specified; not implemented.

The Review/Audit Analyzer consumes the existing local Review Engine package, verifies available evidence, normalizes findings, and recommends the next safe action. It recommends; the user approves.

## Inputs

- `.review/summary.md`
- `.review/changed-files.md`
- `.review/validation-results.md`
- `.review/architecture-impact.md`
- `.review/codex-report.md`
- `.review/git.diff` metadata and safely available diff evidence
- Security findings
- Unresolved limitations
- Canonical project/version reference and progress state
- Approved unit scope and acceptance criteria

The Review Engine remains responsible for safe evidence collection and redaction. The analyzer treats all narrative fields as claims to verify against available evidence.

Future AI-produced findings use a versioned Typed AI Contract and remain untrusted until schema and evidence validation pass. Trace IDs may connect findings to exact Prompt Program, context, repository operation, and evaluation versions, but traces do not replace Review Engine evidence.

## Normalized Finding

Each finding contains a stable ID, category, severity, evidence references, affected files/graph nodes, acceptance-criterion reference when applicable, status, recommended remedy, and confidence. Unsupported claims are marked unverified rather than accepted.

Initial finding categories include validation, security, scope, architecture, schema/contract, API, UI, documentation, test coverage, portability, and incomplete evidence.

Each finding also declares a review dimension: `compliance` or `quality`. Compliance asks whether implementation satisfies approved Constitution, specification, plan, scope, security, and acceptance obligations. Quality asks whether the implementation is correct, maintainable, tested, accessible, performant, and appropriately designed. A finding may contribute to both dimensions but retains one primary dimension for deterministic routing.

### Specification Compliance Review

Checks the requested outcome, acceptance-criterion coverage, scope boundaries, missing required behavior, unapproved added behavior, applicable Constitution rules, and required documentation updates.

### Engineering Quality Review

Checks correctness, maintainability, code quality, security, relevant performance, tests, architecture consistency, error handling, and operational safety.

## Next-Action Classification

- `accept_unit`
- `request_repair`
- `request_clarification`
- `request_focused_reaudit`
- `proceed_to_next_planned_unit`
- `stop_due_to_blocker`

The result also reports independent gate statuses: compliance `passed`, `failed`, or `uncertain`; quality `passed`, `failed`, or `uncertain`; validation `passed`, `failed`, or `unavailable`; and overall `accepted`, `accepted_with_warnings`, `repair_required`, `clarification_required`, `blocked`, or `invalid_evidence`.

The evidence receipt keeps requirement correctness, implementation correctness, security compliance, validation completeness, and token efficiency as separate facets. A task may pass one and fail another; no aggregate status hides the failing facet.

## Decision Rules

1. Never trust an agent narrative without checking available validation and diff evidence.
2. Failed required checks block normal progression.
3. Security findings outrank roadmap progression.
4. Changed files outside approved scope require explicit review; high-impact unexplained changes block acceptance.
5. Incomplete acceptance criteria produce a repair Task Card.
6. Missing or contradictory evidence produces clarification or focused re-audit.
7. A genuine unresolved blocker produces `stop_due_to_blocker`.
8. `proceed_to_next_planned_unit` requires required checks to pass, scope and acceptance criteria to be satisfied, and no blocking finding to remain.
9. Findings and classifications are deterministic for the same normalized evidence.
10. Approved analyzer output may be rendered through the AI Task Card Prompt Compiler.
11. Both compliance and quality gates must pass before `accept_unit` or `proceed_to_next_planned_unit`.
12. A passed quality review cannot waive non-compliance, and formal compliance cannot waive a blocking quality or security defect.

Audit-to-next-task output is `accept_unit`, `focused_repair`, `clarification`, `focused_reaudit`, `architecture_investigation`, `proceed_to_next_planned_slice`, or `stop_due_to_blocker`. It consumes convergence status before recommending a normalized Task Card.

## Review Engine Boundary

The analyzer does not replace secret redaction, Git diff collection, command execution, or Review Engine exit codes. A nonzero Review Engine result is preserved as evidence and cannot be narrated away. Missing files, truncated output, or heuristic architecture classification are represented as limitations.

## Convergence Boundary

This analyzer judges one bounded execution against its approved contract. The future Spec-to-Code Convergence Engine compares durable Specifications, Technical Plans, Task Cards, implementation evidence, and reviews across versions. Review findings feed convergence; convergence findings may request focused re-audit. Neither system silently updates specifications or treats agent narration as verified evidence.

## Non-Goals

- Automatic repair
- Code execution
- Canonical mutation
- Automatic user approval
- Provider calls
- Replacing a human security review

## Acceptance Criteria

- Fixtures cover every next-action classification.
- Failed checks, security findings, out-of-scope changes, incomplete criteria, and absent evidence cannot yield normal progression.
- The analyzer cites the evidence used for each material conclusion.
- An approved repair/clarification recommendation compiles into a normalized Task Card without meaning loss.
