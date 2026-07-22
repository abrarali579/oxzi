# OXZI — Prompt Evaluation, Certification, and Optimization Specification

## Status and Purpose

**Contracts implemented; engines not implemented.** Strict schemas cover assertions, suites, scenarios, trust boundaries, prompt/execution certification, dataset records, renderer candidates, hypotheses, and release decisions. No model judge, evaluation runtime, red-team runner, telemetry, or external framework is included.

The future Prompt Evaluation Engine measures Task Cards, context packages, rendered prompts, target profiles, executions, and user outcomes as distinct artifacts. Renderer optimization may change presentation, ordering, formatting, or agent-specific instructions but never goal, scope, constraints, protected boundaries, criteria, security rules, or approved decisions.

Prompt Programs supply the versioned executable configuration evaluated by this system. Optimization candidates and releases follow `specs/21-prompt-programs-optimization.md`; this specification owns assertions/certification evidence, not Prompt Program identity or release aliases.

## Assertion Registry

Versioned assertions are deterministic prompt, context, execution, trajectory, security, or optional qualitative checks. They declare hard/soft status, evidence requirements, evaluator, and version. Categories cover required/forbidden content, schema and budgets, meaning fingerprints, mandatory graph coverage, commands/tests/diffs, file and operation scope, tool/order/loop claims, secrets, injection, destructive approval, and restricted paths.

Deterministic checks run first. Model judging is permitted only where evidence cannot decide, is visibly labeled, and can never override a deterministic failure.

## Evaluation Suites and Selection

Declarative suites cover documentation, implementation, repair, architecture, migration, security, renderer regression, token regression, and divergence. Each defines task/risk applicability, hard assertions, soft metrics, evidence, evaluator policy, token budget, and human review. Selection uses minimum sufficient coverage based on risk, security, ambiguity, scope, workflow, target capability, and overhead; not every task runs every suite.

## Prompt Certification

Pre-execution checks include Task Card validity and meaning, goal/scope/boundaries, Constitution/conflicts/security, criteria/validation/output contract, target/style/edit compatibility, context/graph/repository freshness, budget sufficiency, trust isolation, and approval. Status is `certified`, `certified_with_warnings`, `review_required`, `insufficient_context`, `stale`, `incompatible`, or `blocked`. Failed hard gates cannot certify. Percentages are forbidden without evaluated data.

## Execution Certification

Post-execution certification is separate. It verifies actual diff/files/scope, commands and statuses, behavior/criteria, security, documentation, trajectory, and repairs. Goal success, process compliance, specification compliance, engineering quality, validation evidence, and token efficiency remain independent. Unsafe or prohibited process blocks overall acceptance even if output appears correct; agent narrative is not proof.

## Trust and Red-Team Boundaries

Trust levels are constitutional, approved canonical, trusted evidence, repository evidence, untrusted import, generated proposal, agent claim, and verified execution evidence. Notes, README files, comments, tool descriptions, and conversations remain delimited data and cannot override higher authority. Suspicious instructions are reported.

High-risk Passports may select prompt-injection, repository-poisoning, fake-test, secret-exfiltration, scope-expansion, destructive-command, malicious-tool, structured-format injection, poisoned-audit, hierarchy, or evaluator-manipulation suites. Mechanical tasks do not pay this cost by default.

## Dataset, Lab, and Release Gate

Performance records separate training, unseen validation, regression, red-team, private project, organization, and consented anonymized global partitions. Records relate project/task/risk, Task Card, context/renderer/profile/model, evidence/certification, tokens/cache/overhead/repairs/latency, and verdict. Training/validation leakage is invalid; private data requires explicit consent before global use.

Optimization proposals state change, hypothesis, measurable target, expected benefit, regressions, and suite. Promotion requires semantic equivalence, unseen validation, security regression, approval, and rollback. Training-only wins cannot ship.

## OXZI Bench

Future benchmarks compare raw prompts, human structure, OXZI Plain English, Agent Optimized, graph-guided context, full Passport, and eligible divergence. Metrics cover completion, criteria, scope/security, repair, input/output/cache/net tokens, cost, latency, readability, and user verdict. Token claims require an appropriate baseline and equal-or-better quality.
