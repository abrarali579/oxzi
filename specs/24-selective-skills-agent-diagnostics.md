# OXZI — Selective Skill Surfaces and Agent Self-Diagnostics Specification

## Status and Boundary

**Normalized contracts implemented; auditor, router, loop detector, and recovery runtime not implemented.** `src/domain/workflow/intelligence.ts` extends existing workflow/skill metadata with availability evidence, activation plans, failure capture, diagnostic hypotheses, contained recovery, introspection reports, and deterministic serialization.

## DAILY and LIBRARY

- `DAILY`: relevant to nearly every current-repository task, small enough for frequent activation, compatible, and supported by current repository evidence.
- `LIBRARY`: discoverable through routing/search and loaded only for applicable tasks. It is not deleted or unavailable.

DAILY status requires fresh stack/workflow evidence rather than model preference. Off-stack or incompatible skills remain LIBRARY or inactive. Full instructions load only after activation. Every record exposes estimated overhead, conflicts, compatibility, usage/result history, freshness, and recommendation. Classification is revisited when repository evidence changes. Project-specific evidence outranks generic bundles, and a no-skill path remains valid.

The future Skill Surface Auditor inspects languages, frameworks, package/test/build/deployment configuration, hooks, agent integrations, task types, and skill history. It emits DAILY/LIBRARY inventories, activation plans, stale warnings, incompatible-hook findings, and evidence-backed verification.

## Agent Self-Diagnostic

Activation signals include repeated no-progress tool calls, repeated command failures, context pressure, repository/environment mismatch, task drift, repeated repair hypotheses, and disproportionate token burn.

```text
Failure Capture → Root-Cause Classification → Smallest Discriminating Check
→ Contained Recovery → Evidence Verification → Introspection Report → Escalation
```

Failure categories are logic, state, environment, policy, context, tool, provider, repository freshness, and requirement ambiguity. The agent verifies current state, narrows to one discriminating check, avoids blind unchanged retries, uses reversible contained recovery, and verifies the result. Repeating an identical failed action requires escalation. Unsupported auto-healing claims are prohibited. Preventive insights remain reviewable proposals before becoming rules or skills.

## Non-Goals

Deferred: skill marketplace/runtime, automatic classification, activation router, hook execution, loop monitoring, automatic recovery, agent execution, persistence, and UI.

