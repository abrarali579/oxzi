# OXZI — Architecture Context

## Architecture Principle

The canonical structured project state is the sole source of truth. Markdown, the Knowledge Graph, context packs, Task Cards, prompts, review recommendations, and visual diagrams are derived views or validated proposals; none may silently mutate canonical state.

## Proposed MVP Stack

| Layer | Technology | Responsibility |
|---|---|---|
| Web application | Next.js + TypeScript | UI, server routes, project workspace |
| UI system | Tailwind CSS + shadcn/ui | Accessible product interface |
| Validation | Zod | Runtime validation of AI and user data |
| Database | PostgreSQL | Users, projects, schema state, versions, decisions |
| ORM | Prisma or Drizzle | Typed database access; choose during implementation bootstrap |
| Authentication | Supabase Auth | User identity and sessions |
| File/object storage | Supabase Storage | Imports and generated export artifacts |
| AI gateway | Provider adapter layer | Cloud and local model access |
| Background jobs | Database-backed job queue initially | Long generation operations and retries |
| Deployment | Vercel + Supabase initially | Low-friction MVP hosting |

## Core System Boundaries

- `app/` — routes and page composition
- `components/` — reusable UI only
- `domain/project/` — canonical project types, runtime validation, fixtures, and deterministic serialization
- `domain/discovery/` — deterministic relevance, completeness, interview-skip, and question-ranking policy
- `domain/extraction/` — deterministic source parsing, canonical update proposals, provenance, deduplication, and contradiction detection
- `domain/knowledge-graph/` — future deterministic typed projection, traversal, impact analysis, and task subgraph extraction
- `domain/context-compiler/` — future quality-gated smallest-sufficient context selection
- `domain/task-card/` — future normalized Task Card and deterministic style renderers
- `domain/review-analysis/` — future evidence-backed Review/Audit Analyzer and next-action classification
- `domain/visual-architecture/` — future graph-derived visual view models and exports
- `features/project-intake/` — input, import, and source parsing
- `features/discovery/` — future discovery UI and workflow orchestration
- `features/project-schema/` — future application workflows and validated canonical-state mutations
- `features/generation/` — six-file rendering and export generation
- `features/agent-handoff/` — future Task Card review, copy/export, and approval-gated connected delivery
- `features/projects/` — project workspace, approval, and versions
- `lib/ai/` — provider-neutral AI gateway and structured output handling
- `lib/db/` — persistence and repositories
- `lib/security/` — authorization, rate limits, redaction, and secret handling

## Core Data Entities

- User
- Workspace
- Project
- SourceInput
- CanonicalProjectState
- FieldEvidence
- DiscoveryQuestion
- DiscoveryAnswer
- Assumption
- Decision
- ProjectVersion
- GeneratedArtifact
- AIProviderConfiguration
- GenerationRun
- KnowledgeGraphProjection
- ContextPackage
- TaskCard
- ReviewFinding
- VisualArchitectureView
- PromptPerformanceRecord (future, private by default)

## Canonical Data Flow

```text
Input or imported material
→ deterministic canonical update proposals and conflicts
→ validated mutation boundary
→ field-level evidence
→ canonical project state
→ deterministic completeness and ranked critical gaps
→ minimal discovery
→ approved canonical state
→ deterministic Knowledge Graph projection
→ task subgraph and smallest-sufficient context package
→ normalized Task Card and one selected prompt renderer
→ six Markdown renderers
→ visual graph views and export package
→ implementation review evidence
→ audit-gated repair or next-task recommendation
```

## Storage Model

### PostgreSQL

Stores project metadata, structured schema state, versions, evidence, decisions, questions, answers, approvals, and generation logs.

### Object Storage

Stores imported files, large source material, generated ZIP files, and later visual references.

### Local Export

Markdown exports remain portable and independent from OXZI. Users retain a usable project context even if they stop using the SaaS.

## AI Provider Model

Every provider implements a shared interface:

- `extractProjectState()`
- `identifyCriticalGaps()`
- `generateQuestions()`
- `mergeAnswers()`
- `renderProjectFiles()`
- `auditConsistency()`

Local models connect through an OpenAI-compatible base URL. Provider-specific logic must not leak into product features.

## Security and Privacy Boundaries

1. API keys are encrypted at rest and never written into generated project files.
2. Imported source content belongs only to its project/workspace.
3. Every project read or mutation requires server-side authorization.
4. AI provider calls receive only the minimum required project context.
5. Sensitive values detected in source input must be flagged and optionally redacted.
6. Local mode must allow project generation without sending content to cloud providers.
7. Prompt-performance analytics prefer derived metrics; private project or prompt content cannot be reused for global training without explicit consent.
8. Context compilation must include all relevant security and privacy constraints before any token optimization.

## System Invariants

1. Markdown output never directly mutates canonical state.
2. No interview question may request an already-known field unless the system detects a material contradiction.
3. Every inferred critical value carries confidence, evidence, and approval status.
4. Approved decisions cannot be silently overwritten by later generation.
5. A project cannot be marked `architecture_ready` while critical blockers remain unresolved.
6. AI output is untrusted until validated against the canonical schema.
7. Failed generation cannot overwrite the latest approved project version.
8. Long-running AI work must not execute inside a request handler without job tracking.
9. Completeness and question priority are computed from versioned deterministic policy, never from provider-generated weights.
10. Extraction cannot overwrite approved canonical values or silently resolve contradictory explicit sources.
11. Derived graphs, context packages, Task Cards, prompts, diagrams, and Markdown cannot directly mutate canonical state.
12. Context compression removes redundancy, not unique requirements or execution-critical meaning.
13. Failed required checks, security findings, and blockers prevent recommendation of unrelated feature work.
14. Only one selected prompt style is generated initially; style renderers preserve one normalized Task Card meaning.
15. OXZI does not execute project code; any future connected-agent delivery obeys explicit configured approval policy.

## Future Deterministic Intelligence Flow

The Knowledge Graph is a versioned projection, not persistence. Its traversals provide impact sets and task subgraphs to the Token-Saving Context Compiler. The compiler widens context whenever mandatory coverage or relationship confidence is insufficient. The AI Task Card Prompt Compiler consumes that safe package and renders only the selected style. The Review/Audit Analyzer consumes Review Engine evidence and recommends accept, repair, clarify, focused re-audit, proceed, or stop. Visual Master Architecture views render the same graph at audience-specific detail levels.

## Initial Status Lifecycle

```text
draft
→ analyzing
→ discovery_required | discovery_skipped
→ understanding_review
→ architecture_ready
→ bible_generated
→ approved
→ in_build
→ maintained
```
