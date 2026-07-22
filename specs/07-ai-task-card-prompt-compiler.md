# OXZI — AI Task Card Prompt Compiler Specification

## Status and Purpose

**Status:** Approved and specified; not implemented.

The AI Task Card Prompt Compiler normalizes one approved unit of work, verifies that its context is sufficient, and renders exactly one selected prompt style by default. It does not execute code, mutate canonical state, or invent requirements.

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

The normalized schema is the source for all styles. Rendered prompt text is a derived view.

## Prompt Styles

### Plain English

Easiest for users to read. It may be longer and less structurally efficient; the UI must state that trade-off honestly.

### Agent Optimized

Default. Concise structured sections balance execution precision, readability, and token use.

### YAML Task Card

Human-readable structured output suitable for copy/paste and integrations.

### JSON Task Card

Machine-readable output for APIs and automation, with lower human editing convenience.

### Compact Command

Available only for small, low-risk, well-defined tasks whose full mandatory context fits safely. Any blocker, unresolved security issue, cross-domain change, insufficient graph coverage, or complex acceptance contract disables it.

### Custom Template

Deferred future user/team-defined renderer. It must consume the same normalized schema and pass meaning-preservation tests.

## Generation Policy

- Generate only one selected style initially.
- Default style: Agent Optimized.
- Default context mode: Balanced Quality.
- Default approval policy: manual review required.
- Alternate styles are rendered only when requested.
- Style regeneration does not recompute unrelated project analysis.
- Every style preserves the same normalized meaning and references.
- User/workspace style preferences stay outside canonical project state.
- Prompt output cannot add requirements absent from the normalized Task Card.
- Requirement edits create validated proposals before the Task Card is recompiled.
- Users may review, regenerate style, edit through proposals, copy, or explicitly approve a future connected-agent send.

## Prompt Performance Dataset Direction

A future private-by-default dataset may record user goal, normalized Task Card, rendered style, target agent, token estimate, agent output, audit findings, rework, acceptance/rejection, and user feedback. Derived metrics are preferred over raw prompt or project content. Users can keep all performance data private. Private data cannot support global model training without explicit consent, and optimization cannot alter approved requirements merely to improve token metrics.

No telemetry is implemented by this specification.

## Acceptance Criteria

- Strict validation rejects incomplete Task Cards and insufficient context.
- Every renderer passes normalized meaning-equivalence fixtures.
- Only one style is generated unless another is explicitly requested.
- Compact Command eligibility is deterministic and conservative.
- Failed review evidence produces repair or clarification classification.
- No renderer mutates canonical state or calls a provider.

