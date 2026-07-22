# OXZI — Six-File Rendering Contract

## Purpose

All six files are generated from one approved canonical state. Shared facts must never be re-inferred independently by separate renderers.

## File Mapping

### 01-project-overview.md

Contains product/business truth:

- Definition
- Users
- Problem and solution
- Goals
- Core flows
- Features
- Scope
- Success criteria

### 02-architecture.md

Contains implementation structure:

- Stack
- Boundaries
- Data model
- Auth/access
- Integrations
- Storage
- Deployment
- Invariants

### 03-ui-visual-context.md

Contains experience direction:

- Interaction voice
- Brand personality
- Visual rules
- Layout
- Responsive behavior
- Motion/3D/media
- Accessibility
- Avoid list

### 04-code-standards.md

Contains implementation conventions:

- Language/framework rules
- Validation
- APIs
- Data handling
- Testing
- File organization
- Documentation synchronization

### 05-ai-workflow-rules.md

Contains coding-agent behavior:

- Reading order
- Scope discipline
- Decision hierarchy
- Change process
- Verification
- Protected rules

### 06-progress-tracker.md

Contains living execution state:

- Current phase
- Current goal
- Completed
- In progress
- Next up
- Blockers
- Open decisions
- Session resume context

## Rendering Requirements

1. Never emit bracket placeholders in approved exports.
2. Omit irrelevant sections rather than filling them with generic prose.
3. Show unresolved blocking decisions explicitly in draft exports.
4. Keep duplicated facts textually consistent.
5. Include project-specific rules, not generic template advice.
6. Keep progress tracker concise enough to read at the start of every coding session.
7. Generated files must pass internal link and consistency checks.

## File Headers

Each file should include:

- Project name
- Schema version
- Generated/updated timestamp
- Approval status
- “Generated from OXZI canonical project state” notice

## Regeneration

When canonical state changes:

- Determine affected files
- Generate a preview diff
- Preserve manual notes in explicitly designated user-note sections
- Require confirmation before replacing approved material changes
