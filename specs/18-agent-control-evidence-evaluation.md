# OXZI — Agent Control, Evidence, and Evaluation Specification

## Status

**Contracts implemented:** Task Card, Passport, capability profile, separate status enums, execution event, artifact reference, receipt, and Token Ledger schemas. Delivery, persistence, runtimes, monitoring, adapters, and evaluation are not implemented.

## Architect and Executor

High-impact work defaults to a reviewable Architect stage defining boundaries, interfaces, risks, and validation, followed by an approved Executor stage. Small mechanical work may skip the split. Profiles may differ; repository claims require evidence and sufficient Passport context is not duplicated.

## Profiles and Adapters

Versioned agent profiles reference separate model, tool, MCP, workflow, prompt, quality, and approval profiles. Capabilities cover instruction files, formats, context/tokenizer/cost/cache, planning/coding/review, edits, read-only context, plan/session/compaction, tools/MCP/skills/hooks/artifacts, delivery/monitoring/pause/cancel/sub-agents, and sandbox requirements.

Prompt Program compatibility, Typed AI Contract support, parser/repository capabilities, trace privacy, and skill-surface versions remain separate referenced profiles rather than branded assumptions.

Adapters are instruction-file, CLI, API, plugin, session-hook, agent-protocol, artifact-exchange, or manual copy/export. They disclose launch/send/status/pause/resume/cancel/event/artifact/report support. Connected delivery is optional and explicit-approval-only.

## Control Plane States

Conversation (`created`, `active`, `paused`, `completed`, `archived`, `failed`), execution (`queued`, `preparing`, `awaiting_approval`, `running`, `awaiting_input`, `blocked`, `validating`, `reviewing`, `completed`, `failed`, `cancelled`, `timed_out`), and runtime (`missing`, `starting`, `running`, `paused`, `error`, `stopping`, `archived`) remain separate. Executions record parents/children, trigger, exact profiles/backends, revisions, timestamps, costs, artifacts, and outcomes.

## Events, Artifacts, and Recovery

Append-oriented events carry stable ID, execution, ordered sequence, time/type/actor/source, payload reference, redaction/hash/parent/visibility, and evidence state. Versioned artifacts carry location/hash/producer/project/execution/privacy/freshness/retention/verification. Durable execution records join task, Passport, revisions, files, validations, reviews, repairs, artifacts, ledger, decision, and next action. Conversation is never the sole evidence.

Git execution records the base and dirty state, separates user/agent changes, preserves recovery, detects stale Passports, and never commits without approval. Edit formats are capability/risk-selected and independently validated; read-only/generated scope is protected.

## Runtime Security

Future local process/container, remote container, VM, organization, or cloud runtimes declare capabilities and enforce least privilege, scoped files/credentials, redaction, network/command policy, timeout/resources, archive state, and destructive-action approval. Secret values are not prompt content by default.

## Evaluation Program

Future OXZI Bench compares baseline, Plain English, Agent Optimized, graph-guided, and full Passport workflows across completion, criteria/hidden tests, scope/security, repair, input/output/net tokens, cost, latency, and user outcome. Prompt changes are versioned, evaluated, meaning-preserving, regression-tested, and approved. Private project data never trains a global system without consent; private/local performance memory remains supported.

Prompt Certification evaluates a rendered package before execution. Execution Certification evaluates actual diff, scope, commands, trajectory, criteria, security, and evidence afterward. They use distinct IDs and schemas; neither substitutes for the other. Assertion/evaluation contracts live in `specs/19-prompt-evaluation-certification-optimization.md`, while divergent branches remain artifact-backed future child executions.

Future traces connect exact Task Card, Passport, Prompt Program, context, agent/model, repository-operation, artifact, evaluation, and repair versions. Observability is derived evidence governed by `specs/23-observability-datasets-experiments.md`; raw sensitive content is not captured by default.
