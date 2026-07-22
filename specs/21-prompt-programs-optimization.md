# OXZI — Prompt Programs and Optimization Specification

## Status and Boundary

**Normalized contracts implemented; registries and optimization runtimes not implemented.** `src/domain/prompt-programs/` defines Prompt Programs, immutable versions, examples, selections, optimization candidates/experiments, promotion decisions, deterministic serialization, and update guards. No model call or automatic optimization occurs.

A Prompt Program is a versioned executable configuration around one normalized Task Card operation. It is not a prompt string and does not own task meaning.

```text
Task meaning != Prompt Program != rendered prompt != provider request
             != model result != parsed result != execution outcome
```

## Program Contract

A program has stable identity, purpose, normalized input/output contracts, Task Card schema, and immutable versions. A version binds context-selection policy, renderer, selected examples, workflow policy, evaluation suite, compatible agent/model profiles, optimization history, approval, release status, timestamps, meaning fingerprint, and content fingerprint.

Goal, scope, constraints, constitutional rules, security requirements, protected files, acceptance criteria, and validation obligations remain Task Card meaning. Every program version must preserve the same normalized meaning fingerprint. A version used by an execution is immutable; changes create a child version. Mutable aliases such as `draft`, `staging`, `production`, and `rollback` may point only to immutable versions.

## Example Registry

Examples are private-by-default versioned artifacts with task type, input and expected normalized-output references, compatibility, provenance, approval, privacy, secret-scan result, quality evidence, token overhead, success/failure history, freshness, and fingerprint.

Selection is task-specific and records reasons and overhead. It must not inject every example, select a stale example silently, expose secrets, or change Task Card meaning. Successful and failed examples may both be valuable evidence. Future selection may use task/risk/profile/workflow similarity, prior results, budget, and diversity, but selection overhead is part of total cost.

## Optimization Contract

Allowed candidate targets include instruction ordering, renderer structure, example selection, context ordering, output-contract clarity, tool guidance, boundary placement, verbosity, decomposition, and agent-specific formatting. Every candidate records parent and rollback versions, change description, hypothesis, measurable metrics, expected benefit, regressions, separate training/unseen-validation datasets, suite, meaning fingerprint, and approval.

Promotion requires:

- unseen validation and regression evidence;
- all hard gates and security regression passing;
- normalized meaning preservation;
- quality not reduced for token savings;
- explicit user/admin approval; and
- a rollback reference.

Training-only improvement is insufficient. Failed and inconclusive experiments remain available. Optimization is against measurable outcomes, never subjective prose preference.

## Integration and Non-Goals

Prompt Programs consume Task Cards, Context Packages, Passports, target profiles, workflow/skill selections, and evaluation suites. Traces record exact program versions. The Prompt Evaluation system evaluates candidates; it does not own versions. Domain code consumes parsed typed results, not raw provider payloads.

Deferred: registry persistence, candidate generation, example routing, experiment execution, automatic optimization, provider adapters, release aliases, UI, and rollback runtime.

