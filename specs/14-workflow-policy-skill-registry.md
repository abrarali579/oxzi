# OXZI — Workflow Policy and Selective Skill Registry Specification

## Status and Purpose

**Status:** Approved and specified; not implemented.

The Workflow Policy Engine selects an explainable execution method for one certified task. The Selective Skill Registry exposes only capabilities relevant to that method. Neither component compiles prompts, executes agents, nor changes task meaning.

## Workflow Policies

Supported normalized policies are:

- `clarification`, `brainstorming`, and `specification`
- `technical_planning` and `architecture_review`
- `implementation`, `test_driven_implementation`, and `systematic_debugging`
- `investigation`, `refactor`, `security_review`, and `migration`
- `documentation`, `verification`, and `specification_compliance_review`
- `code_quality_review`, `repair`, and `escalation`

Policies define required preconditions, artifact inputs, ordered stages, review gates, repair limits, validation classes, output contract, and completion evidence. A policy may compose named stages but cannot silently waive a Constitution rule or Passport gate.

## Deterministic Selection

Selection inputs include task type, requirement clarity, risk, security sensitivity, reversibility, affected module count, graph impact, expected context size, prior failures, audit findings, specification health, target-agent capabilities, and user instruction.

Selection returns chosen policy/version, considered alternatives, matched rules, rejected-policy reasons, required skill IDs, risk class, and whether user clarification or approval is required. User choice may select among eligible policies but cannot select an unsafe policy. Ties resolve by explicit priority and stable policy ID.

A mechanical fix does not activate brainstorming. High-risk cross-cutting work cannot skip planning. Test-driven implementation is selected only when technically appropriate, but every policy requires an explicit validation strategy. Security-sensitive or destructive work requires stronger review and approval. Selection balances relevance, criticality, risk, expected benefit, and workflow overhead.

## Selective Skill Registry

Each skill record contains stable ID, name, version, activation conditions, compatible task types, incompatible conditions, estimated context overhead, required tools, supported agents, required inputs, output contract, source, approval policy, freshness, and integrity fingerprint.

Only concise relevance metadata is loaded initially; it describes activation rather than repeating the full execution process. Full instructions load lazily after policy selection. The registry must:

- exclude irrelevant skills and tool catalogs;
- verify target-agent compatibility;
- preserve exact security and approval rules;
- reject stale or untrusted skill records;
- disclose activation and estimated overhead; and
- support a no-skill path for simple tasks.

## Repair Escalation

Every repair attempt records attempt ID, triggering finding, hypothesis, evidence, change, validations, result, remaining uncertainty, newly introduced findings, agent/profile, cost/token ledger references, and artifacts.

The default maximum is three materially failed attempts for the same unresolved failure class, configurable by risk and policy. Escalation occurs earlier for security regressions, expanding scope, destructive uncertainty, repeated loops, or inadequate evidence. Repeating substantially the same fix without new evidence is prohibited. Outcomes include `repaired`, `focused_reaudit`, `architecture_review`, `requirement_clarification`, `environment_investigation`, `dependency_investigation`, `security_review`, `manual_intervention`, or `blocked`. Retry counts never reset through cosmetic rewording.

## Efficiency and Safety

Policy instructions, registry lookup, skill loading, handoffs, and retries count as optimization/execution overhead. A complex policy is not activated when a simpler safe policy has equivalent coverage. Exact decisive errors, evidence, and safety rules remain intact.

## Non-Goals

- Skill runtime or marketplace
- Agent/model execution and routing implementation
- Provider-specific branded policy
- Prompt rendering, persistence, or UI
- Automatic repair

## Acceptance Criteria for Implementation

- Selection is deterministic, explainable, and rejects unsafe choices.
- Tests cover every policy, ties, unavailable capabilities, security-first routing, no-skill behavior, and escalation.
- Registry output is bounded and loads no unrelated full instructions.
- Repair loops produce durable evidence and a terminal outcome.
