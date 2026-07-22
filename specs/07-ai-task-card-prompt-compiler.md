# OXZI — AI Task Card Prompt Compiler Specification

## Status and Purpose

**Status:** Approved and specified; not implemented.

The AI Task Card Prompt Compiler normalizes one approved unit of work, verifies that its context is sufficient, and renders exactly one selected prompt style by default. It does not execute code, mutate canonical state, or invent requirements.

Normalization and rendering are separate deterministic stages. The Task Card owns bounded work meaning; the renderer owns presentation. The future Execution Passport wraps and certifies a Task Card for delivery and does not replace either stage.

A Prompt Program is the versioned executable configuration that binds the Task Card schema, Context Package policy, renderer, examples, workflow, target compatibility, and evaluation suite. It does not replace the Task Card or renderer. Every rendered execution records a Prompt Program version, and changing program configuration must preserve the normalized Task Card meaning fingerprint. See `specs/21-prompt-programs-optimization.md`.

## Inputs

- User task request
- Canonical project state and version/hash
- Relevant Knowledge Graph subgraph
- Current project phase and progress tracker
- Accepted decisions and protected invariants
- Review Engine package and previous agent completion report when available
- Failed validations, findings, conflicts, and blockers
- Selected target agent
- User/workspace prompt preferences outside canonical state
- Selected context-quality mode and compiled context package

## Task Classification

Exactly one primary type is selected:

- `implementation`
- `repair`
- `audit`
- `investigation`
- `refactor`
- `documentation`
- `design`
- `test`
- `migration`
- `clarification_required`
- `decision`

Failed required checks, security findings, incomplete approved scope, or blockers default the next Task Card to `repair` or `clarification_required`, never unrelated feature development.

## Normalized Task Card

Every Task Card contains:

- Task ID
- Target agent
- Task type
- Goal
- Reason this is the next safest unit
- Required context references
- Affected graph nodes
- Affected files or expected boundaries
- Files/components that must not change
- Dependencies
- Constraints and protected invariants
- Implementation instructions
- Acceptance criteria
- Validation commands
- Risk analysis
- Expected outputs
- Documentation updates
- Deferred work
- Recommended commit message
- Context token estimate
- Context sufficiency status
- Parent specification, Technical Plan, and implementation-slice references
- Applicable Project Constitution rule references
- Repository seeds plus editable, read-only, and prohibited scope
- Workflow policy, required skills, approval, and freshness

The normalized schema is the source for all styles. Rendered prompt text is a derived view.

Task Cards must trace to healthy specifications and approved plan/slice records when those artifacts are required. They may narrow parent scope but cannot broaden it. A stale or failed parent gate produces `clarification_required` or `repair` rather than a renderable implementation task.

## Prompt Styles

### Plain English

Easiest for users to read. It may be longer and less structurally efficient; the UI must state that trade-off honestly.

### Agent Optimized

Default. Concise structured sections balance execution precision, readability, and token use.

### YAML Task Card

Human-readable structured output suitable for copy/paste and integrations.

### JSON Task Card

Machine-readable output for APIs and automation, with lower human editing convenience.

### XML Task Card

Agent-specific renderer option, not a universal prompt format. Structured tags may separate role, goal, instructions, context references, boundaries, source code, acceptance criteria, validation, and output contract. Eligibility comes from the target agent capability profile.

### Compact Command

Available only for small, low-risk, well-defined tasks whose full mandatory context fits safely. Any blocker, unresolved security issue, cross-domain change, insufficient graph coverage, or complex acceptance contract disables it.

### Custom Template

Deferred future user/team-defined renderer. It must consume the same normalized schema and pass meaning-preservation tests.

JSON, YAML, Agent Optimized, Plain English, Compact Command, XML, and future renderers all derive from one normalized Task Card. Style changes render existing meaning only; they cannot recompute requirements, context selection, or task semantics. Plain English prioritizes human review. Agent Optimized remains the default. Compact Command is disabled for complex, ambiguous, destructive, or security-sensitive tasks.

## Bounded Output Contracts

### Investigation

- path
- line or symbol
- concise finding
- evidence reference
- totals

### Implementation

- changed files
- concise change receipt
- validation results
- warnings
- deferred work
- recommended commit message

### Review

- severity
- path and line
- problem
- fix
- evidence
- totals

Task-specific bounds control length. Renderers omit tool-call narration, full edited-file reproduction, and raw long logs unless requested. Code, commands, API names, identifiers, paths, URLs, and exact errors remain verbatim. Security warnings, destructive operations, and ambiguous ordered steps use complete clear language.

When the safe result cannot fit a requested limit, the renderer returns a continuation or artifact reference instead of deleting findings. Concision cannot reduce technical meaning.

## Generation Policy

- Generate only one selected style initially.
- Default style: Agent Optimized.
- Default context mode: Balanced Quality.
- Default approval policy: manual review required.
- Alternate styles are rendered only when requested.
- Style regeneration does not recompute unrelated project analysis.
- Every style preserves the same normalized meaning and references.
- User/workspace style preferences stay outside canonical project state.
- Target-agent renderer, tool, cache, and context behavior comes from a configurable capability profile rather than a permanent branded-model rule.
- Prompt output cannot add requirements absent from the normalized Task Card.
- Requirement edits create validated proposals before the Task Card is recompiled.
- Users may review, regenerate style, edit through proposals, copy, or explicitly approve a future connected-agent send.
- Workflow Policy selection occurs before rendering and is referenced by ID/version; renderers do not choose methodology.
- Passport certification occurs after Task Card and context compilation; prompt generation alone is not execution authorization.

## Prompt and Workflow Certification

Before a rendered prompt or Passport is ready, deterministic gates evaluate specification health, Constitution coverage, context sufficiency, scope clarity, dependencies, blockers, security, acceptance criteria, validation commands, output contract, target/edit-format compatibility, token-budget safety, project/graph/repository freshness, conflicts, and approval. Visible outcomes are `certified`, `certified_with_warnings`, `review_required`, `insufficient_context`, `blocked`, `stale`, or `incompatible`. Scores are forbidden until supported by a published evaluation dataset.

Prompt Certification follows `specs/19-prompt-evaluation-certification-optimization.md` and remains separate from post-execution certification. Renderers record both the normalized meaning fingerprint and rendered meaning fingerprint; mismatch is a hard failure.

## Decision Task Cards

The compiler chooses direct, plan-first, clarification, investigation, divergent-reasoning, architecture-decision, or repair output from workflow policy. Divergent work receives a normalized Decision Task Card containing the decision, constraints, accepted facts, prohibited options, evaluation criteria, uncertainty, relevant graph context, frame policy, budget, and final decision format. Open ideation and final implementation instructions are never mixed in one uncontrolled prompt.

## Prompt Performance Dataset Direction

A future private-by-default dataset may record user goal, normalized Task Card, rendered style, target agent, token estimate, agent output, audit findings, rework, acceptance/rejection, and user feedback. Derived metrics are preferred over raw prompt or project content. Users can keep all performance data private. Private data cannot support global model training without explicit consent, and optimization cannot alter approved requirements merely to improve token metrics.

No telemetry is implemented by this specification.

Important compiler or renderer outputs cross the Typed AI Contract System when AI is used. Provider prose is parsed, validated, and optionally repaired through the bounded contract in `specs/22-typed-ai-contracts-repair.md`; it cannot silently become a Task Card.

## Acceptance Criteria

- Strict validation rejects incomplete Task Cards and insufficient context.
- Every renderer passes normalized meaning-equivalence fixtures.
- Only one style is generated unless another is explicitly requested.
- Compact Command eligibility is deterministic and conservative.
- Failed review evidence produces repair or clarification classification.
- No renderer mutates canonical state or calls a provider.
