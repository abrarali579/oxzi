# OXZI — Specification Health Engine Specification

## Status and Purpose

**Status:** Deterministic runtime foundation implemented; planning integration and UI deferred.

The Specification Health Engine deterministically decides whether a normalized requirement or specification is ready for technical planning. It does not discover project facts and does not assign an AI-generated quality percentage.

## Boundary from Discovery

Discovery identifies missing, uncertain, or conflicting project facts and asks the smallest useful set of questions. Specification Health begins after requirements exist and checks whether they are precise, traceable, testable, dependency-aware, Constitution-compliant, and safe enough to plan.

## Inputs

- normalized requirement and acceptance-criterion records
- canonical project version and evidence references
- compiled Project Constitution reference
- accepted decisions and unresolved conflicts
- dependency and Knowledge Graph evidence
- security, privacy, accessibility, and quality constraints
- lifecycle phase and requested planning boundary

## Deterministic Checks

Every applicable requirement is checked for:

1. stable identity and source traceability;
2. clear user/business value and actor/persona where relevant;
3. unambiguous wording, defined scope, and measurable outcome;
4. temporal scope: `current`, `deferred`, `out_of_scope`, or `undecided`;
5. decidable acceptance criteria, testability, and implementation independence where appropriate;
6. explicit dependencies and downstream consumers;
7. visible conflicts, security/privacy implications, and approval status;
8. blocking Constitution obligations and defined failure/recovery behavior when relevant; and
9. absence of unresolved placeholders in approved material.

Applicability rules are explicit and versioned. A non-applicable check is reported as such rather than treated as passed.

## Result Contract

The engine returns:

- per-requirement `status`: `healthy`, `clarification_required`, `conflicted`, `incomplete`, `untestable`, `blocked`, `deferred`, or `superseded`
- aggregate readiness: `ready`, `clarification_required`, `blocked`, or `insufficient_evidence`
- `planningMayProceed`
- ordered passed check IDs
- ordered failed check IDs with evidence
- missing information and clarification targets
- blocker IDs and constitutional rule references
- dependency and security coverage state
- checked canonical/specification versions
- policy version and deterministic fingerprint

No aggregate percentage may hide a failed blocking check. If a future UI shows a summary score, the score is secondary and derived only from published deterministic weights.

The implemented foundation uses eight categorical dimensions with no hidden weights: structural completeness, clarification completeness, constitutional compliance, internal consistency, traceability, testability, approval completeness, and freshness. Every dimension reports `pass`, `warning`, `fail`, or `unknown` plus exact calculation inputs and check/finding IDs. The aggregate health and readiness class are deterministic gates, not quality percentages.

## Planning Gate

Technical planning may proceed only when:

- all applicable blocking checks pass;
- mandatory evidence and Constitution coverage are complete;
- no unresolved blocking conflict remains;
- required approvals are present; and
- every planned acceptance criterion is decidable.

Clarification output points to the minimum facts needed to repair health. It may feed Discovery or a clarification Task Card, but it cannot invent answers.

The runtime returns `readiness_recommended`, `not_ready`, `human_review_required`, or `stale`. `readiness_recommended` is evidence for the configured approval workflow; it does not itself approve a specification or authorize implementation.

## Implemented Pipeline

The public governance evaluator performs normalization, Constitution resolution, structural validation, clarification analysis, constitutional compliance, consistency analysis, traceability analysis, categorical health calculation, readiness recommendation, and report compilation. Reports include authoritative versions/fingerprints, evaluator versions, findings, evidence references, temporal metadata, and a semantic fingerprint. Approved Specifications remain immutable inputs.

## Non-Goals

- Natural-language extraction
- Interview generation
- Code review or convergence analysis
- Provider calls, persistence, or UI
- Technical-plan generation, Task Card compilation, or execution authorization

## Acceptance Criteria for Implementation

- Identical normalized inputs produce byte-stable results.
- Fixtures cover every requirement status, aggregate readiness state, and blocking gate.
- Discovery-complete but specification-unhealthy input is rejected for planning.
- Missing or stale Constitution evidence cannot yield `healthy`.
- Results cite exact requirement, criterion, rule, conflict, and evidence IDs.
