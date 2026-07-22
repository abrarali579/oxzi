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

## Normalized Finding

Each finding contains a stable ID, category, severity, evidence references, affected files/graph nodes, acceptance-criterion reference when applicable, status, recommended remedy, and confidence. Unsupported claims are marked unverified rather than accepted.

Initial finding categories include validation, security, scope, architecture, schema/contract, API, UI, documentation, test coverage, portability, and incomplete evidence.

## Next-Action Classification

- `accept_unit`
- `request_repair`
- `request_clarification`
- `request_focused_reaudit`
- `proceed_to_next_planned_unit`
- `stop_due_to_blocker`

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

## Review Engine Boundary

The analyzer does not replace secret redaction, Git diff collection, command execution, or Review Engine exit codes. A nonzero Review Engine result is preserved as evidence and cannot be narrated away. Missing files, truncated output, or heuristic architecture classification are represented as limitations.

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

