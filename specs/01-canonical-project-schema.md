# OXZI — Canonical Project Schema Specification

## Purpose

The canonical project schema stores the normalized truth from which discovery decisions, UI views, and all six Markdown files are generated.

## Field Record

Every meaningful project field uses this conceptual structure:

```ts
type ProjectField<T> = {
  value: T | null;
  status: "missing" | "inferred" | "defaulted" | "confirmed" | "conflicted";
  confidence: number; // 0–100
  criticality: "blocking" | "high" | "medium" | "low";
  evidenceIds: string[];
  assumptionId?: string;
  approvedAt?: string;
  updatedAt: string;
};
```

## Evidence Record

```ts
type FieldEvidence = {
  id: string;
  sourceType: "prompt" | "upload" | "interview" | "user_edit" | "system_default";
  sourceId: string;
  excerpt?: string;
  interpretation: string;
  createdAt: string;
};
```

## Top-Level Project Structure

```yaml
identity:
  name
  one_liner
  project_type
  industry
  current_stage
business:
  problem
  solution
  target_users
  geography
  business_model
  goals
  success_metrics
scope:
  in_scope
  out_of_scope
  constraints
  assumptions
  dependencies
product:
  platforms
  core_user_flows
  features
  roles
  permissions
  content_requirements
visual:
  personality
  visual_keywords
  avoid_list
  themes
  colors
  typography
  layout_rules
  motion_rules
  three_d_rules
  references
technical:
  preferred_stack
  architecture_style
  data_entities
  integrations
  authentication
  storage
  background_jobs
  security
  privacy
  deployment
quality:
  performance
  accessibility
  testing
  observability
  localization
  seo
execution:
  phases
  milestones
  acceptance_criteria
  risks
  open_decisions
  current_task
  next_task
meta:
  sources
  evidence
  decisions
  conflicts
  completeness
  schema_version
```

## Critical Field Sets by Project Type

### Website

- Goal and primary conversion action
- Target user
- Required pages/sections
- Content ownership/editing requirement
- Visual direction
- Mobile behavior
- Localization
- Performance-sensitive media behavior
- Deployment expectation

### SaaS/Application

- Primary user and problem
- Core user flow
- Roles and access
- Data ownership
- Authentication
- Core entities
- Integrations
- Security/privacy constraints
- Business model when it affects functionality

### Automation System

- Trigger
- Inputs and source systems
- Transformations
- Outputs/destinations
- Failure behavior
- Retry/idempotency expectations
- Human approval points
- Scheduling
- Monitoring and audit history

## Merge Priority

```text
confirmed user edit
> interview answer
> explicit source statement
> accepted assumption
> system default
> model inference
```

## Conflict Rules

Create a conflict when:

- Two explicit sources provide incompatible critical values.
- New input contradicts an approved decision.
- A requested feature violates an architecture invariant.
- A local/private requirement conflicts with a cloud-only integration.

Conflicts must never be resolved through silent confidence selection when impact is high.

## Completeness Metrics

- `critical_completeness`: percentage of blocking/high fields sufficiently resolved
- `overall_completeness`: weighted percentage of all relevant fields
- `contradiction_count`
- `blocking_question_count`
- `assumption_count`

## Approval Rules

A project may generate a draft Bible at any time.

A project may be marked `approved` only when:

- No blocking fields are missing
- No blocking conflicts remain
- All high-impact assumptions are accepted or replaced
- Required outputs pass schema and consistency validation
