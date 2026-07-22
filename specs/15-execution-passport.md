# OXZI — Execution Passport, Ledger, and Adapter Specification

## Status and Purpose

**Status:** Approved and specified; not implemented.

An Execution Passport is the portable, certified handoff wrapper for exactly one normalized Task Card. It binds approved work, context, workflow, capabilities, artifacts, review gates, and freshness into an auditable execution contract. It does not compete with or replace the Task Card.

## Ownership Boundaries

- Specification owns approved behavior.
- Technical Plan owns implementation design and slice structure.
- Task Card owns one bounded work definition.
- Context Package owns smallest-sufficient evidence selection.
- Workflow Policy owns execution method.
- Execution Passport owns certification, packaging, and target compatibility.
- Prompt renderer owns presentation only.
- Task Execution Ledger owns durable run evidence.

## Passport Contract

Every Passport contains:

- stable Passport ID, version, status, and fingerprint
- project ID/version, task type, goal, and exact scope
- Task Card, specification, plan, slice, Constitution, canonical, and graph references
- relevant Knowledge Graph subgraph reference
- compiled context package reference and mandatory-coverage result
- selected workflow policy and activated skill IDs/versions
- Prompt Program, examples, renderer, and Typed AI Contract IDs/versions
- target agent capability-profile and adapter reference
- relevant interfaces and estimated token budget
- allowed tools and explicit prohibited operations
- affected and protected mutation boundaries
- approved and restricted files/modules
- required inputs and artifact outputs
- evidence/report destination and output contract
- acceptance criteria, validation commands, and review gates
- approval policy and existing approvals
- freshness timestamps and dependency fingerprints
- token/overhead measurement references
- observability privacy/retention policy and trace destination references
- expiration, invalidation, and re-certification reasons

Passport lifecycle statuses are `draft`, `ready_for_review`, `certified`, `stale`, `executing`, and `closed`; readiness outcomes are `certified`, `certified_with_warnings`, `review_required`, `insufficient_context`, `blocked`, `stale`, or `incompatible`. Only a currently certified outcome may be delivered for execution. Any referenced semantic version/fingerprint change makes the Passport stale until re-certified. No fabricated confidence percentage is permitted.

## Artifact-First Handoff

Large context, logs, diffs, plans, and generated outputs are referenced as versioned artifacts rather than copied into messages. Every required artifact reference includes stable ID, media/schema type, version, content hash, producer, created time, freshness state, sensitivity class, access requirement, readability verification, and concise purpose.

A reference is valid only when the target agent is guaranteed authorized access and the artifact passes integrity/readability checks. Missing access widens inline context or blocks certification. Long raw logs remain artifacts with exact decisive errors summarized and linked.

Messages return bounded receipts instead of repeatedly copying intermediate artifacts. A receipt contains status, artifact ID, changed files, validation summary, blocking findings, and next required decision. References never hide missing evidence.

## Task Execution Ledger

The durable future ledger records task/Passport/run IDs, agent and capability profile, prompt renderer/version, start/end state, specification/graph versions, repository base/resulting revisions, commands/tool calls, changed files, artifacts, validation results, compliance/quality reviews, audit findings, accepted/rejected state, repairs, token-ledger references, user decision, blockers, and next action. Entries are append-only, ordered, evidence-backed, and fingerprinted. Conversation memory is never the sole completion record; agent narration remains a claim until corroborated.

Where enabled, provider-neutral traces reference the ledger and exact Passport lineage without becoming the ledger or canonical truth. Metadata-only tracing is the default direction; raw content requires a stronger explicit privacy mode.

## Integration Adapters

Adapters translate a certified Passport into a target-agent delivery envelope without changing normalized meaning. Adapter profiles declare supported structured formats, context limits, artifact access, tools/MCP, plan mode, sub-agents, session reset/compaction, approval callbacks, streaming, and result-import contracts.

Adapter classes are:

- instruction-file adapter such as root agent-rule files
- command or CLI adapter
- plugin or extension adapter
- API adapter
- session-hook adapter
- artifact-exchange adapter

Capability profiles cover supported instruction files, prompt styles, structured input/output, approvals, session reset, context inspection, compaction, plan mode, tools/MCP, hooks, artifacts, direct delivery, execution monitoring, and stop/cancel behavior.

Unsupported capabilities cause deterministic downgrade, user-visible clarification, or blocked delivery—never silent field removal. Connected delivery remains optional and requires the configured approval policy.

A renderer may present a bare Task Card for human review or render a certified Passport delivery envelope for a selected agent. In both cases it formats existing normalized meaning only. The adapter transports that rendered envelope and imports its result contract.

## Certification Gates

Certification requires healthy specifications, an approved plan/slice where required, complete Constitution coverage, sufficient context, no blocking conflict, compatible target capabilities, valid artifacts, selected safe workflow policy, complete acceptance/validation contracts, and required user approval.

## Non-Goals

- Agent execution or connected delivery
- Provider SDKs, persistence, UI, or billing
- Prompt rendering
- Automatic approval
- Replacing the Review Engine or Review/Audit Analyzer

## Acceptance Criteria for Implementation

- Strict schemas reject missing parent references and invalid certification transitions.
- Meaning-equivalence tests cover every adapter.
- Stale dependencies invalidate certification deterministically.
- Artifact access/readability failures block or safely widen the Passport.
- Ledger fixtures preserve failed checks, retries, and repair escalation honestly.
