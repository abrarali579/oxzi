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
- `domain/knowledge-graph/` — implemented temporal typed projection, Episodes, indexes, traversal/path, impact, task subgraphs, integrity, serialization, and fingerprints
- `domain/governance/` — implemented deterministic Specification Governance runtime: normalization, Constitution resolution/compliance, structure, clarification, consistency, lifecycle-aware traceability, testability, temporal freshness, categorical health, readiness recommendation, controlled-living checks, normalized reporting, and fixtures
- `domain/planning/` — implemented deterministic Technical Plan normalization/governance, dependency-safe Slice derivation, plan/slice structure and consistency checks, exact-parent traceability, categorical health/readiness, immutable-version validation, reporting, and fixtures
- `domain/workflow/` — implemented policy/skill/activation/escalation schemas only
- `domain/execution/` — implemented Task Card, Passport, profile, status, event, artifact, receipt, and Token Ledger schemas only
- `domain/evaluation/` — implemented assertion, suite/scenario, trust, certification, dataset, optimization, renderer, and release schemas; runtime deferred
- `domain/divergence/` — implemented frame, request, candidate/critic/cluster/trap, cost/activation, and report schemas; orchestration deferred
- `domain/prompt-programs/` — implemented version/example/optimization/experiment/promotion contracts; registry and optimizer deferred
- `domain/ai-contracts/` — implemented typed invocation/parse/repair/partial-result contracts and known normalization; provider runtime deferred
- `domain/observability/` — implemented privacy-aware trace/span/generation/dataset/experiment contracts; capture and persistence deferred
- `domain/repository-intelligence/` — implemented parser/snapshot/file/symbol/query/rule/preview/update contracts; parsers and graph runtime deferred
- Unified Evidence View — future query-time join; never persisted as product truth
- `domain/project-constitution/` — implemented inside `domain/governance/` over explicit versioned rule snapshots; canonical rule storage and persistence remain future
- `domain/specification-health/` — implemented inside `domain/governance/` as deterministic categorical requirement-readiness gates; `domain/planning/` consumes only healthy, current readiness recommendations
- `domain/specification/` — Specification governance and Technical Plan/Slice runtime live in `domain/governance/` and `domain/planning/`; convergence findings remain future
- `domain/context-compiler/` — future quality-gated smallest-sufficient context selection
- `domain/task-card/` — future normalized Task Card and deterministic style renderers
- `domain/workflow-policy/` — future explainable policy selection, selective skills, and repair escalation
- `domain/execution-passport/` — future portable certification, artifact references, execution ledger, and adapter contracts
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
- ConstitutionalRule and ProjectConstitutionProjection
- Specification and SpecificationHealthResult
- TechnicalPlan and ImplementationSlice
- WorkflowPolicy and AgentSkill
- ExecutionPassport, ArtifactReference, and TaskExecutionRecord
- ComplianceReview, QualityReview, and ConvergenceFinding
- PromptProgram, PromptProgramVersion, ExampleRecord, and OptimizationExperiment
- AIContractDefinition, TypedCompletionResult, and RepairAttempt
- Trace, Span, GenerationRecord, Dataset, and ExperimentRun
- ParserAdapter, ParsedFileRecord, StructuralRule, RuleFinding, and TransformationPreview

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
→ compiled Constitution and deterministic specification-health gate
→ approved Technical Plan and independent implementation slices
→ query-first task subgraph with mandatory coverage and truncation evidence
→ smallest-sufficient context package or explicit insufficiency
→ normalized Task Card and selected Workflow Policy
→ Prompt Program and typed-output contract selection
→ certified Execution Passport and one selected prompt/adapter rendering
→ privacy-controlled trace and repository-operation evidence
→ six Markdown renderers
→ visual graph views and export package
→ implementation review evidence
→ compliance and quality review
→ convergence findings and audit-gated repair, escalation, or next-task recommendation
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
16. Every task seed survives graph and context limits; generic hubs cannot cause uncontrolled traversal.
17. Token optimization includes its own overhead and cannot claim success after mandatory-coverage failure or omission-caused rework.
18. Input, output, cache, and net savings remain separate measures with explicit measurement status.
19. Specifications, Technical Plans, Task Cards, Context Packages, Passports, and renderings retain separate identities and version links.
20. Planning requires a healthy specification; execution delivery requires a fresh certified Passport.
21. Implementation evidence cannot silently mutate approved requirements; discoveries use controlled reverse proposals.
22. Compliance and quality are independent blocking review dimensions.
23. Workflow, skill, artifact, Passport, review, convergence, repair, and adapter overhead is measurable execution cost.
24. Effective/event time and ingestion/system time remain distinct; superseded graph facts are preserved.
25. Project intent and repository implementation remain separate derived projections.
26. Conversation, execution, and runtime statuses are separate state machines.
27. Task Card meaning, context, renderer wording, target profile, evaluation scenario, execution, and outcome retain separate identities.
28. Deterministic failures outrank model judging; Prompt and Execution Certification remain separate.
29. Divergent branches require runtime isolation, and hard safety failures cannot win through aggregate scoring.
30. Imported/repository/generated content remains explicitly trusted or untrusted data, never implicit instruction authority.
31. Task Card meaning, Prompt Program configuration, rendered request, provider response, parsed result, execution, and outcome remain separate versioned artifacts.
32. AI output crosses a typed validated boundary before trust elevation; repair cannot invent required meaning or approval.
33. Metadata-only observability cannot retain raw prompts, code, or model output; traces never become canonical truth.
34. DAILY skills require current repository evidence; LIBRARY skills remain discoverable and unloaded until selected.
35. Repository text, parsed structure, symbols, repository-graph relationships, tests, and human approval remain distinct evidence levels.
36. Structural detection never grants transformation permission; transformation previews are non-applying until separately authorized.

## Deterministic Intelligence Flow

The implemented Knowledge Graph is a versioned, byte-stable project-intent projection, not persistence. Its indexes and traversals provide impact sets and task subgraphs with explicit cap, hub, omission, confidence, and coverage metadata. Repository parser, structural-query, rule, update, and preview contracts now exist separately; AST parsing, repository graph construction, and transformations remain deferred.

The future Token-Saving Context Compiler queries this graph before reading broad raw context, widens whenever mandatory coverage or relationship confidence is insufficient, accounts for optimization overhead, and returns explicit insufficiency for an unsafe budget. The AI Task Card Prompt Compiler consumes that safe package and renders only the selected style. The Review/Audit Analyzer consumes Review Engine evidence and recommends accept, repair, clarify, focused re-audit, proceed, or stop. Visual Master Architecture views render the same graph at audience-specific detail levels.

Future governance layers compile constitutional rules, certify specification health, separate plans from executable slices, and package a Task Card into a target-compatible Execution Passport. Workflow Policy selection occurs before rendering. Execution evidence enters append-only ledgers and independent compliance/quality review; convergence compares durable versions without owning mutation. Detailed ownership is specified in `specs/11-project-constitution.md` through `specs/15-execution-passport.md`.

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
