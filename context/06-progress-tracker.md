# OXZI — Progress Tracker

## Context Compiler v1 and Prompt Program Renderer

Completed on 2026-07-23.

### Files Created

- `src/domain/context-compiler/schemas.ts`
- `src/domain/context-compiler/compiler.ts`
- `src/domain/context-compiler/context-compiler.test.ts`
- `src/domain/context-compiler/index.ts`
- `src/domain/prompt-renderer/schemas.ts`
- `src/domain/prompt-renderer/renderer.ts`
- `src/domain/prompt-renderer/prompt-renderer.test.ts`
- `src/domain/prompt-renderer/index.ts`

### Files Modified

- `CURRENT.md`

---

## Step 14 — Evaluation Lab, Benchmarks, and Launch Hardening

Completed on 2026-07-23.

### Files Created

- `src/lib/evaluation/index.ts`
- `data/baseline.ts`
- `src/domain/evaluation/schema.ts`
- `src/domain/evaluation/runner.ts`
- `src/domain/evaluation/baseline.ts`
- `src/domain/evaluation/token-ledger.ts`
- `src/domain/evaluation/suites/extraction.suite.ts`
- `src/domain/evaluation/suites/discovery.suite.ts`
- `src/domain/evaluation/suites/context-compiler.suite.ts`
- `src/app/api/evaluate/route.ts`
- `src/__benchmarks__/context-compiler.bench.ts`
- `src/__tests__/benchmarks/benchmarks.test.ts`
- `src/__tests__/integration/pipeline.test.ts`
- `src/__tests__/integration/flows.test.ts`
- `docs/performance.md`
- `docs/launch-checklist.md`

### Files Modified

- `src/middleware.ts`
- `package.json`
- `README.md`
- `CURRENT.md`
- `.env.example`
- `src/lib/env.ts`
- `src/lib/env.test.ts`
- `context/06-progress-tracker.md`
- `PROJECT.md`
- `OXZI.md`
- `DECISIONS.md`
- `context/00-context-map.md`
- `context/06-progress-tracker.md`

### Completed Work

- Implemented canonical-only Context Compiler v1 over normalized Task Cards and explicit canonical artifact inputs.
- Added strict `CompiledContext`, `ContextItem`, and `ContextSelectionReason` schemas with inclusion reasons, omitted references, V1 limitation metadata, sufficiency, estimated minimum safe context size, and stable fingerprints.
- Implemented deterministic selection for referenced Specifications, task acceptance criteria, accepted/project decisions when referenced, and applicable/global blocking Constitution rules.
- Implemented a separate Prompt Program Renderer over Task Card, Compiled Context, and Agent Profile inputs.
- Added strict `AgentProfile` and rendered `PromptProgram` schemas with target compatibility, input/output contracts, rendered prompt text, immutable state, meaning fingerprint, context fingerprint, version, and renderer fingerprint.
- Preserved Task Card meaning and compiled-context identity across rendering; no prompt optimization, evaluation, certification, provider calls, Execution Passport, connected delivery, repository parsing, or UI was added.
- Added ADR-084 for canonical-only context compilation and immutable Prompt Program rendering.

### Validation Results

- Focused Context Compiler and Prompt Renderer run — passed; 2 files and 10 tests
- `npm run format:check` — passed
- `npm run typecheck` — passed
- `npm run lint` — passed
- `npm run test` — passed; 19 files and 261 tests
- `npm run review` — passed outside the restricted sandbox; captured typecheck, lint, build, and generated-output secret scan passed
- `git diff --check` — passed

The first restricted-sandbox Review Engine run failed only because its internal Turbopack build could not bind a required local IPC port (`Operation not permitted`). The approved unchanged rerun outside that restriction passed.

### Remaining Limits

- Context Compiler v1 does not parse source code, inspect repositories, traverse ASTs, perform structural search, or use semantic retrieval.
- Prompt Program Renderer does not certify prompts, evaluate prompt quality, optimize examples, package Execution Passports, deliver to agents, or call providers.

### Next Smallest Unit

Implement Deterministic Prompt Evaluation / Certification over immutable Prompt Programs. Keep repository parsing, code-aware context compilation, connected delivery, persistence, providers, and UI outside that unit.

## Task Card Compiler Runtime Foundation

Completed on 2026-07-23.

### Files Created

- `src/domain/task-card/schemas.ts`
- `src/domain/task-card/utils.ts`
- `src/domain/task-card/compiler.ts`
- `src/domain/task-card/task-card-compiler.test.ts`
- `src/domain/task-card/index.ts`

### Files Modified

- `CURRENT.md`
- `PROJECT.md`
- `OXZI.md`
- `DECISIONS.md`
- `context/00-context-map.md`
- `context/06-progress-tracker.md`

### Completed Work

- Added strict Zod contracts for normalized Task Cards, file boundaries, validation requirements, and Task Card validation reports.
- Implemented deterministic Task Card compilation from one approved Implementation Slice, preserving exact Slice, Technical Plan, Specification, Constitution, evidence, acceptance, rollback, validation, artifact, and fingerprint traceability.
- Added conservative file-boundary resolution with writable, read-only, and protected sets; protected entries include local secrets, generated review evidence, dependency/build outputs, Git metadata, and Slice-protected scope.
- Mapped Slice scope, exclusions, risks, protected boundaries, validation commands, prerequisites, and optional Constitution rules into agent-agnostic Task Card meaning.
- Added Task Card validation that reports malformed cards or protected-boundary overlaps as blocking findings instead of rendering an execution-ready artifact.
- Added ADR-083 for normalized Task Card runtime ownership and downstream renderer/passport separation.

### Validation Results

- Focused Task Card compiler run — passed; 1 file and 7 tests
- `npm run format:check` — passed
- `npm run typecheck` — passed
- `npm run lint` — passed with no warnings after removing unused test destructuring
- `npm run test` — passed; 17 files and 251 tests
- `npm run build` — passed outside the restricted sandbox; `/` and `/_not-found` prerendered as static routes
- `npm run review` — passed outside the restricted sandbox; captured typecheck, lint, build, and generated-output secret scan passed
- `git diff --check` — passed

The first restricted-sandbox Review Engine run failed only because its internal Turbopack build could not bind a required local IPC port (`Operation not permitted`). The approved unchanged rerun outside that restriction passed.

### Remaining Limits

- No Context Package compiler, prompt renderer, Execution Passport certification, connected delivery, persistence, provider calls, UI, repository parsing, or code-aware context selection was implemented.
- File boundaries are deterministic string/glob references from Slice scope. Repository-aware validation waits for Repository Parsing and Structural Intelligence.

### Next Smallest Unit

Implement Context Compiler Runtime v1 over canonical project artifacts and approved Task Cards. Keep code-aware context compilation, prompt rendering, Execution Passport certification, connected delivery, persistence, providers, and UI outside that unit.

## Roadmap and Documentation Reconciliation

Completed on 2026-07-23.

### Files Modified

- `CURRENT.md`
- `PROJECT.md`
- `OXZI.md`
- `DECISIONS.md`
- `context/06-progress-tracker.md`
- `specs/06-context-compiler.md`

### Completed Work

- Recorded that Technical Plan Runtime and Implementation Slice Runtime remain separate, independently testable implementation units.
- Locked the v1 implementation sequence from Technical Plan Runtime through Evaluation Lab, Benchmarks, and Launch Hardening.
- Clarified that Context Compiler Runtime v1 compiles canonical project artifacts first, while code-aware context compilation waits for Repository Parsing and Structural Intelligence.
- Recorded that Internal Product UI may begin after the core deterministic pipeline is stable, while authentication, billing, teams, and multiplayer remain later SaaS scope.
- Recorded post-v1 roadmap opportunities: multi-model orchestration, example optimization and fine-tuning workflows, Prompt Program / Skill marketplace, Plugin and MCP ecosystem, enterprise governance expansion, analytics, and cost optimization.
- Recorded Cloud SaaS and future self-hosted Enterprise deployment modes, near-term target markets, and closed-source core with selectively open-source ecosystem assets.
- Added ADR-079 through ADR-082 for the reconciled runtime separation, context compiler boundary, UI/SaaS sequencing, and deployment/source strategy.

### Authoritative V1 Implementation Sequence

1. Technical Plan Runtime
2. Implementation Slice Runtime
3. Task Card Compiler Runtime
4. Context Compiler Runtime — canonical artifacts first
5. Prompt Program Renderer
6. Deterministic Prompt Evaluation / Certification
7. Repository Parsing + Structural Intelligence
8. Code-aware Context Compiler Integration
9. Review + Spec-to-Code Convergence
10. Agent Control Plane + Execution Passport
11. Approval-gated Connected Agent Delivery
12. Internal Product UI + Basic Persistence + APIs
13. Authentication, Billing, Teams, and Multiplayer
14. Evaluation Lab, Benchmarks, and Launch Hardening

### Validation Results

- `npm run format:check` — passed
- `git diff --check` — passed

### Conflicts Corrected

- `PROJECT.md` previously grouped Technical Plan and Implementation Slice runtime as one Wave 2 statement; it now explicitly preserves them as separate runtime units.
- `OXZI.md` previously described controlled planning/slicing as later work; it now reflects the implemented Technical Plan and Implementation Slice runtimes.
- `specs/06-context-compiler.md` previously allowed Repository Intelligence as an input without distinguishing v1; it now marks repository-aware context as later than Repository Parsing and Structural Intelligence.

### Remaining Limits

- No runtime code, product UI, persistence, providers, auth, billing, teams, multiplayer, repository parsing, or context compiler implementation was added.

### Next Smallest Unit

Implement the Task Card Compiler Runtime Foundation over one healthy, approved, current Implementation Slice and its exact Plan/Specification/Constitution fingerprints. Keep context compilation, prompt rendering, Execution Passport certification, connected delivery, persistence, providers, and UI outside that unit.

## Unified Agentic Intelligence Architecture Lock and Foundation

Completed on 2026-07-23.

### Files Created

- `src/domain/knowledge-graph/temporal.ts`, `path.ts`, and `integrity.ts`
- `src/domain/governance/index.ts` and `schemas.ts`
- `src/domain/workflow/index.ts` and `schemas.ts`
- `src/domain/execution/index.ts` and `schemas.ts`
- `src/domain/contracts.test.ts`
- `specs/16-temporal-project-memory.md`
- `specs/17-repository-intelligence.md`
- `specs/18-agent-control-evidence-evaluation.md`

### Files Modified

- Knowledge Graph enums, identifiers, schemas, types, projector, fingerprints, indexes, traversal, impact, subgraph, exports, and tests
- `src/domain/project/schema.ts` (exports the existing timestamp validator for shared strict contracts)
- `PROJECT.md`, `OXZI.md`, `DECISIONS.md`, and `CURRENT.md`
- `context/00-context-map.md` through relevant architecture, UI, standards, workflow, and this tracker
- `specs/05-knowledge-graph-engine.md` through `specs/09-visual-master-architecture-generator.md`

### Implemented

- Upgraded graph schema/projector to `2.0.0` with effective and ingestion timelines, freshness, derivation, schema/projector metadata, and deterministic fingerprints.
- Projected canonical evidence into immutable Episode nodes and `evidenced_by` relationships.
- Added temporal/current/version/section indexes, confidence and historical traversal, deterministic path finding, historical/stale impact classes, expanded task subgraphs, and graph integrity auditing.
- Added strict governance schemas for Constitution rules, Specifications, acceptance criteria, plan references, slices, health results, and convergence findings.
- Added workflow/skill/activation/escalation and Task Card/Passport/profile/status/event/artifact/receipt/Token Ledger schemas.
- Added 20 new tests; the application suite increased from 72 to 92 tests.

### Contracts Only / Not Implemented

- Governance, health, planning, slicing, workflow selection, skills, Passport delivery, control plane, convergence, and Token Ledger computation are schemas only.
- Repository scanning/AST, Unified Evidence View, Context Compiler, prompt rendering, adapters, execution, sandbox, persistence, providers, UI, telemetry, and evaluation remain unimplemented.

### Validation Results

- `npm run ci` — passed: formatting, typecheck, lint with no warnings, 7 files/92 tests, 14 Review Engine tests, and production build
- `npm run review` — passed outside the restricted sandbox; captured typecheck, lint, build, and secret scan passed
- `git diff --check` — passed
- No UI, provider, database, external dependency, or canonical-state mutation was introduced

### Startup Measurement

Method: UTF-8 characters divided by four; estimates, not target-tokenizer measurements.

- Recorded legacy mandatory full-project startup: approximately 24,481 tokens
- Current `AGENTS.md`: 3,157 characters / approximately 789 tokens
- Current `CURRENT.md`: 1,813 characters / approximately 453 tokens
- Current context map: 2,627 characters / approximately 657 tokens
- New fixed startup: 7,597 characters / approximately 1,899 tokens
- Estimated reduction: approximately 22,582 tokens / 92.2%

Safety, source priority, no-guessing, dependencies, scope, validation, Review Engine use, approval, secret protection, and no automatic commit/push remain mandatory. No circular startup read or new mandatory large document was added.

### Remaining Risks

- Temporal history is snapshot/in-memory only; no cross-version persistence or incremental reconstruction exists.
- Integrity direction rules are intentionally minimal until repository/governance edges have runtime producers.
- Repository language/parser coverage, artifact storage trust, agent capability sources, and profile freshness remain design inputs for later units.
- Fingerprints are deterministic invalidation hints, not cryptographic security guarantees.

## Specification Governance and Agent Workflow Architecture Expansion

Completed on 2026-07-23.

### Files Created

- `specs/11-project-constitution.md`
- `specs/12-specification-health-engine.md`
- `specs/13-controlled-specifications-convergence.md`
- `specs/14-workflow-policy-skill-registry.md`
- `specs/15-execution-passport.md`

### Files Modified

- `PROJECT.md`
- `DECISIONS.md`
- `OXZI.md`
- `CURRENT.md`
- `context/00-context-map.md`
- `context/01-project-overview.md`
- `context/02-architecture.md`
- `context/04-code-standards.md`
- `context/05-ai-workflow-rules.md`
- `context/06-progress-tracker.md`
- `specs/05-knowledge-graph-engine.md`
- `specs/06-context-compiler.md`
- `specs/07-ai-task-card-prompt-compiler.md`
- `specs/08-review-audit-analyzer.md`
- `specs/10-efficiency-ledger.md`

### Completed Work

- Defined a versioned Project Constitution as an enforceable projection of future canonical constitutional rules, distinct from ADR rationale and detailed specifications.
- Defined deterministic Specification Health checks and visible requirement statuses that gate technical planning without arbitrary AI percentages.
- Separated normalized Specifications, Technical Plans, implementation slices, Task Cards, Context Packages, Execution Passports, and rendered prompts by ownership and version.
- Formalized vertical-first independent slices with justified foundation, migration, infrastructure, security, canonical-schema, and refactor exceptions.
- Defined Controlled Living Specification forward, reverse-proposal, and continuous-reconciliation flows with approval thresholds and immutable history.
- Defined evidence-based spec-to-code convergence and separated its cross-version responsibility from bounded Review/Audit analysis.
- Defined explainable Workflow Policy selection, selective skill activation, durable repair attempts, and configurable escalation.
- Defined Execution Passport certification, artifact-first handoff, target-agent adapters/capabilities, and a durable Task Execution Ledger.
- Added independent specification-compliance and engineering-quality review gates.
- Reserved future Knowledge Graph governance/execution nodes and edges without changing the implemented `1.0.0` graph runtime.
- Extended Token Ledger accounting for Constitution, workflow, skills, Passports, adapters, artifacts, dual review, convergence, and repair overhead.
- Added ADR-026 through ADR-034 and reconciled Phase 3–8 roadmap status as implemented, approved/spec, planned, or deferred.

### Verification Results

- `npm run format:check` — passed
- `npm run typecheck` — passed
- `npm run lint` — passed with no warnings
- `npm run test` — passed; 6 files and 72 tests
- `npm run test:review` — passed; 14 tests
- `npm run build` — passed outside the restricted sandbox; `/` and `/_not-found` prerendered as static routes
- `npm run review` — passed outside the restricted sandbox; captured typecheck, lint, build, and generated-output secret scan passed
- `git diff --check` — passed
- Source/UI/runtime changes for this unit — none

### Startup Context Measurement

Method: UTF-8 character count divided by four; character estimates, not tokenizer measurements.

- `AGENTS.md`: 3,157 characters, approximately 789 tokens
- `CURRENT.md`: 2,225 characters, approximately 556 tokens
- `context/00-context-map.md`: 2,340 characters, approximately 585 tokens
- Fixed startup total: 7,722 characters, approximately 1,931 tokens

`CURRENT.md` remains below its 1,200-token guidance and the fixed startup remains below 2,000 estimated tokens.

### Unresolved Design Questions

- Exact canonical-schema migration and backward compatibility for constitutional rules and normalized requirement records
- Exact visible check catalog and versioning for Specification Health
- Technical Plan and slice schema details, including parallel merge contracts
- Trust source and persistence model for skills, target capability profiles, artifacts, and execution ledgers
- Configurable approval thresholds for minor reverse synchronization and Passport expiration defaults
- Repository-evidence ingestion and migration from current generic graph `task` nodes to future `task_card` nodes

None blocks the documentation architecture. They require explicit implementation units.

## Agent Startup Context Optimization

Completed on 2026-07-23.

### Files Created

- `CURRENT.md`
- `context/00-context-map.md`

### Files Modified

- `AGENTS.md`
- `CODEX_LOCAL_SETUP.md`
- `OXZI.md`
- `README.md`
- `context/05-ai-workflow-rules.md`
- `context/06-progress-tracker.md`

### Completed Work

- Replaced the conflicting full-project startup flow with `AGENTS.md` → `CURRENT.md` → active task → `context/00-context-map.md` → relevant authoritative sections/source/tests → justified dependency closure.
- Created a compact derived current-state resume view with product identity, phase, implemented and deferred systems, blockers, boundaries, validations, version references, and authoritative pointers.
- Created a routing map for product, architecture, UI, standards, workflow, status, canonical schema, discovery, extraction, Knowledge Graph, context efficiency, Task Cards, audits, visual architecture, decisions, and fixtures.
- Preserved source-of-truth hierarchy, no-guessing, scope discipline, dependency reading, approval boundaries, secret protection, validation honesty, Review Engine use, completion reporting, and no automatic commit/push.
- Removed direct legacy startup contradictions from OXZI, README, local Codex handoff, and detailed workflow rules without deleting authoritative content.
- Moved detailed progress history out of normal startup while keeping it available for reconciliation and required post-unit maintenance.
- Defined full-read exceptions for cross-cutting audits/refactors, roadmap reconciliation, source migration, global policy changes, explicit user requests, and unresolved context sufficiency.

### Character-Estimated Startup Measurement

Method: UTF-8 character count divided by four. These are estimates, not target-tokenizer measurements. Variable task text and task-specific follow-up reads are excluded from both fixed-pack comparisons.

- Conflicting legacy full startup (`AGENTS.md`, `PROJECT.md`, `DECISIONS.md`, `OXZI.md`, and all six context files): approximately 24,481 tokens.
- Partial pre-unit fixed minimum (`AGENTS.md`, three root detail files, and the full progress tracker): approximately 16,658 tokens before task-specific reads.
- New fixed startup (`AGENTS.md`, `CURRENT.md`, and `context/00-context-map.md`): approximately 1,970 tokens before the active task.
- Estimated reduction from the effective legacy full pack: approximately 22,511 tokens, or 91.9%.

All detailed context, ADRs, specifications, examples, source files, tests, and progress history remain available on demand. Token efficiency does not outrank quality, safety, correctness, or mandatory coverage.

### Manual Acceptance Verification

- `AGENTS.md` points to `CURRENT.md` and `context/00-context-map.md` — passed
- `CURRENT.md` contains no full history, ADR text, or detailed roadmap — passed
- Context map routes to authoritative files and declares itself non-authoritative — passed
- No circular mandatory reading instructions remain — passed
- Detailed progress history is not part of default startup — passed
- Full-read exceptions and evidence-backed widening are explicit — passed
- Normal tasks no longer require all six context files — passed
- No application/runtime/UI file changed in this unit — passed

### Verification Results

- `npm run format:check` — passed
- `npm run typecheck` — passed
- `npm run lint` — passed with no warnings
- `npm run test` — passed; 6 files and 72 tests
- `npm run test:review` — passed; 14 tests
- `npm run build` — passed outside the restricted sandbox; `/` and `/_not-found` prerendered as static routes
- `npm run review` — passed outside the restricted sandbox; captured typecheck, lint, build, and generated-output secret scan passed
- `git diff --check` — passed

### Remaining Risks

- Counts are character estimates and may differ from a target model tokenizer.
- The active task and justified follow-up context remain variable by design; unsafe fixed caps are not imposed.
- `CURRENT.md` and the context map require the documented maintenance discipline to avoid stale navigation.

## Phase 3 — Knowledge Graph Foundation and Token-Efficiency Contract Hardening

Completed on 2026-07-23.

### Files Created

- `src/domain/knowledge-graph/enums.ts`
- `src/domain/knowledge-graph/fingerprints.ts`
- `src/domain/knowledge-graph/identifiers.ts`
- `src/domain/knowledge-graph/impact.ts`
- `src/domain/knowledge-graph/index.ts`
- `src/domain/knowledge-graph/indexes.ts`
- `src/domain/knowledge-graph/knowledge-graph.test.ts`
- `src/domain/knowledge-graph/projector.ts`
- `src/domain/knowledge-graph/schemas.ts`
- `src/domain/knowledge-graph/subgraph.ts`
- `src/domain/knowledge-graph/traversal.ts`
- `src/domain/knowledge-graph/types.ts`
- `specs/10-efficiency-ledger.md`

### Files Modified

- `AGENTS.md`
- `PROJECT.md`
- `DECISIONS.md`
- `OXZI.md`
- `context/02-architecture.md`
- `context/04-code-standards.md`
- `context/05-ai-workflow-rules.md`
- `context/06-progress-tracker.md`
- `specs/05-knowledge-graph-engine.md`
- `specs/06-context-compiler.md`
- `specs/07-ai-task-card-prompt-compiler.md`

### Completed Work

- Implemented strict, JSON-safe Knowledge Graph node, edge, metadata, lifecycle, identifier, fingerprint, traversal, truncation, impact, and task-subgraph contracts.
- Added deterministic canonical projection for project/version metadata, business and product structure, requirements, visual rules, architecture, integrations, data entities, security/privacy, testing, delivery, risks, decisions, assumptions, conflicts, feature acceptance criteria, and the six living documentation artifacts.
- Added stable semantic node/edge identity, canonical/graph/projector version metadata, byte-stable serialization, content fingerprints, and full graph fingerprints for later invalidation.
- Added deterministic indexes by node ID/type, edge type, incoming/outgoing relationship, source reference, and evidence reference.
- Added forward/reverse bounded traversal with type/relationship filters, depth/result limits, cycle safety, seed preservation, generic high-degree hub protection, uncertain-edge disclosure, and explicit truncation metadata.
- Added direct, transitive, uncertain, and blocking impact analysis grouped across every required target category without fabricating absent repository evidence.
- Added task-subgraph extraction that preserves seeds and mandatory dependencies, blockers, approved decisions, security invariants, tests, and documentation even when the requested cap is unsafe.
- Added eight accepted decisions, ADR-018 through ADR-025, covering optimization overhead, distinct savings metrics, query-first acquisition, lean root maps, adaptive sessions, bounded outputs, dynamic agent profiles, and quality-controlled measurement.
- Formalized session, tool/MCP, sub-agent, renderer, Token Ledger, safe compression, no-optimization, insufficiency, and honest measurement policies without implementing the future compiler or provider behavior.
- Kept every `AGENTS.md` operating and safety rule while replacing its blanket context load with task-relevant numerical context plus the always-required progress tracker.

### Test Coverage Added

- Deterministic projection and byte-stable serialization
- Stable node and edge IDs
- Evidence/source traceability and indexes
- Forward/reverse traversal and relationship/node filters
- Cycle safety, seed preservation, result-cap disclosure, and hub protection
- Direct/transitive and blocking impact
- Low-confidence relationship disclosure
- Mandatory task-subgraph coverage and minimum-safe estimate status
- Canonical non-mutation and relevant fingerprint invalidation
- Both canonical project fixtures
- Unknown, duplicate, and dangling graph-record rejection

### Verification Results

- Focused Knowledge Graph run — passed; 1 file and 20 tests
- `npm run format:check` — passed after Prettier corrected the newly edited projector formatting
- `npm run typecheck` — passed
- `npm run lint` — passed with no warnings
- `npm run test` — passed; 6 files and 72 tests
- `npm run test:review` — passed; 14 tests
- `npm run build` — passed outside the restricted sandbox; `/` and `/_not-found` prerendered as static routes
- `npm run review` — passed outside the restricted sandbox; captured typecheck, lint, build, and generated-output secret scan passed
- `git diff --check` — passed

The first restricted-sandbox production build failed because Turbopack could not bind its required local IPC port (`Operation not permitted`). The approved unchanged rerun outside that restriction compiled and prerendered successfully. This is the previously documented execution-environment limitation, not a product or graph failure.

### Deferred Limits and Decisions

- The foundation does not scan repository AST/code or create file, module, API, screen, or review-finding nodes without validated evidence.
- Full incremental projection is deferred; versioned fingerprints provide the invalidation boundary for that later unit.
- The deterministic fingerprint is a content-change key, not a cryptographic security primitive.
- Structural flow-to-goal and architecture-to-integration links use visible fixed confidence and remain inferred; future enrichment cannot silently upgrade them.
- The task subgraph provides graph selection evidence and a character-estimated minimum-safe size. It does not compress content or claim tokenizer-measured savings.
- Token Ledger storage, target tokenizers, provider billing, capability-profile administration, adaptive session automation, and LLM compression remain unimplemented.
- Repository evidence ingestion policy and Prisma-versus-Drizzle remain later decisions.

## Current Phase

Phase 3 — Core Deterministic Intelligence: In Progress

## Current Goal

Complete deterministic project intelligence through a derived Knowledge Graph foundation before context compilation, agent workflow, persistence, providers, or product UI.

## Completed

- Product purpose and target users defined
- Core user flow defined
- MVP and out-of-scope boundaries defined
- Canonical structured state selected as source of truth
- Six living-file model upgraded
- Minimal interview philosophy defined
- Master Prompt interview-skip behavior defined
- Field evidence, confidence, criticality, and approval model defined
- Question scoring and question budget defined
- Cloud/local provider-neutral architecture defined
- Security and engineering invariants defined
- Two validation projects selected
- Codex local-folder handoff guide created
- Phase 2 Unit 1: Next.js application bootstrap completed
- Next.js 16.2.11 App Router configured with strict TypeScript and `src/`
- Tailwind CSS 4 styling baseline configured
- Next.js ESLint flat configuration added
- Responsive OXZI placeholder homepage added
- npm development, build, start, lint, and typecheck scripts added
- Local installation and development commands documented
- Root project brief and formal decision register added
- Agent reading order aligned across repository guidance
- Phase 2 Unit 3: local review-engine foundation completed
- Phase 2 Unit 4: developer tooling and CI foundation completed
- Architecture Expansion and Extraction Hardening unit completed

## Phase 2 Unit 1 — Repository Bootstrap

Completed on 2026-07-22.

### Files Created

- `.gitignore`
- `eslint.config.mjs`
- `next-env.d.ts` (framework-generated and gitignored)
- `next.config.ts`
- `package.json`
- `package-lock.json`
- `postcss.config.mjs`
- `src/app/globals.css`
- `src/app/layout.tsx`
- `src/app/page.tsx`
- `tsconfig.json`

### Files Modified

- `README.md`
- `context/06-progress-tracker.md`

### Verification Results

- `npm install --prefer-offline` — passed; 359 packages audited
- `npm run typecheck` — passed
- `npm run lint` — passed
- `npm run build` — passed; `/` and `/_not-found` prerendered as static routes
- Development-server smoke check — passed; `HEAD /` returned HTTP 200
- `git diff --check` — passed

The first sandboxed production build could not bind Turbopack's internal local port. The same build passed outside the sandbox; this was an execution-environment restriction rather than an application failure.

### Warnings

- npm reports three transitive dependency advisories: one moderate PostCSS advisory and two high-severity paths involving Next.js/Sharp. npm does not currently offer a non-breaking upgrade for the pinned latest stable Next.js release.
- npm deferred install scripts for optional/transitive `sharp@0.34.5` and `unrs-resolver@1.12.2`. Type checking, linting, production build, and the development smoke check still completed successfully.

## Documentation Alignment Unit

Completed on 2026-07-22.

### Files Created

- `PROJECT.md`
- `DECISIONS.md`

### Files Modified

- `AGENTS.md`
- `OXZI.md`
- `README.md`
- `CODEX_LOCAL_SETUP.md`
- `context/05-ai-workflow-rules.md`
- `context/06-progress-tracker.md`

### Alignment Results

- Established one repository reading order: `AGENTS.md`, `PROJECT.md`, `DECISIONS.md`, `OXZI.md`, numbered context files, relevant specs, then relevant examples.
- Moved the concise product/phase/stack briefing into `PROJECT.md`.
- Consolidated formal accepted decisions in `DECISIONS.md` and replaced the duplicate tracker register with a reference.
- Replaced the stale Phase 2 Unit 1 setup prompt with a tracker-based current handoff.
- Kept `AGENTS.md` focused on navigation, operating rules, scope, and completion behavior.

### Verification Results

- `git diff --check` — passed
- `npm run typecheck` — passed
- `npm run lint` — passed
- `npm run build` — passed; `/` and `/_not-found` prerendered as static routes

## Locked Architecture Decisions

The formal accepted-decision register is maintained in root `DECISIONS.md`. Decisions cannot be changed silently.

## Phase 2 Unit 3 — Review Engine Foundation

Completed on 2026-07-22. This user-directed unit was executed before the still-deferred Unit 2 tooling unit.

### Files Created

- `.review/.gitkeep`
- `scripts/generate-review.mjs`
- `scripts/generate-review.test.mjs`

### Files Modified

- `.gitignore`
- `package.json`
- `README.md`
- `AGENTS.md`
- `PROJECT.md`
- `context/06-progress-tracker.md`

### Completed Work

- Added `npm run review` to generate a local six-file review package plus a sanitized full Git diff.
- Added branch, latest-commit, `HEAD~1`, changed-file, diff-stat, and safe untracked-file collection.
- Added sensitive-path exclusion, recognized credential redaction, and symlink-safe generated-file writes.
- Added structured architecture-impact and Codex handoff reports.
- Added focused tests using the Node.js built-in test runner without a new dependency.
- Ignored generated `.review/` outputs while retaining `.review/.gitkeep`.

### Generated Review Outputs

- `.review/summary.md`
- `.review/changed-files.md`
- `.review/validation-results.md`
- `.review/architecture-impact.md`
- `.review/codex-report.md`
- `.review/git.diff`

### Verification Results

- `npm run test:review` — passed; 4 tests
- `npm run review` — passed; generated all required outputs and captured 3 passing checks
- `npm run typecheck` — passed
- `npm run lint` — passed with no warnings
- `npm run build` — passed; `/` and `/_not-found` prerendered as static routes
- `git diff --check` — passed

### Limitations

- Architecture and semantic-impact classification is path-based and requires human review.
- The required `HEAD~1` comparison includes the latest commit plus current working-tree changes, not only the current uncommitted unit.

## Review Engine Safety Hardening

Completed on 2026-07-22 following the Review Engine audit.

### Files Modified

- `scripts/generate-review.mjs`
- `scripts/generate-review.test.mjs`
- `README.md`
- `context/06-progress-tracker.md`

### Completed Work

- Added Cookie, Set-Cookie, all Authorization-scheme, Docker auth, credential-field, and credential-scoped high-entropy redaction.
- Preserved ordinary SHAs, UUIDs, dependency integrity hashes, and harmless identifiers.
- Replaced raw lockfile diffs with filename, added/removed line counts, and dependency-change summaries.
- Added environment and sentinel recursion guards with cleanup after success, failure, timeout, or handled interruption.
- Added spawn-error, timeout, signal, command-not-found, and exit-code details to validation reporting.
- Preserved sequential validation so later checks still run after a safe failure.
- Added complete review generation for unborn repositories while preserving root-commit empty-tree comparison.
- Expanded focused coverage from 4 to 14 tests.

### Verification Results

- `npm run test:review` — passed; 14 tests
- `npm run review` — passed; generated the complete package and captured 3 passing validations
- `npm run typecheck` — passed
- `npm run lint` — passed with no warnings
- `npm run build` — passed; `/` and `/_not-found` prerendered as static routes
- `git diff --check` — passed

The first hardened self-scan correctly exited nonzero after detecting a non-idempotent redaction marker in the generator's own test diff. The marker handling was corrected, an idempotence assertion was added, and the final review run passed.

### Remaining Security and Portability Limits

- Secret detection is heuristic and cannot guarantee recognition of every novel secret format; secrets remain prohibited in tracked files.
- An uncatchable termination such as `SIGKILL` can leave `.review/.active-run`; a later run blocks rather than overwriting it.
- Lockfile dependency impact is conservatively reported as changed whenever the lockfile changes; semantic package-level interpretation is intentionally omitted.
- macOS execution is supported; Windows-specific `npm.cmd` and `NUL` handling is implemented but not yet verified in CI.

## Phase 2 Unit 4 — Developer Tooling and CI Foundation

Completed on 2026-07-22.

### Files Created

- `.env.example`
- `.github/workflows/ci.yml`
- `.prettierignore`
- `.prettierrc.json`
- `vitest.config.ts`
- `src/app/page.test.tsx`
- `src/lib/env.ts`
- `src/lib/env.test.ts`

### Files Modified

- `package.json`
- `package-lock.json`
- `next.config.ts`
- `README.md`
- `AGENTS.md`
- `PROJECT.md`
- `context/06-progress-tracker.md`
- `scripts/generate-review.mjs` (Prettier only)
- `scripts/generate-review.test.mjs` (Prettier only)
- `src/app/globals.css` (Prettier only)
- `src/app/layout.tsx` (Prettier only)
- `src/app/page.tsx` (Prettier only)

### Dependencies Added

- `zod@4.4.3`
- `prettier@3.9.6`
- `vitest@4.1.10`

### Completed Work

- Added Prettier write/check commands with generated, dependency, lockfile, and Phase 1 Markdown exclusions.
- Added Vitest as the general application test runner.
- Added a server-rendered homepage smoke test and focused environment-validation tests.
- Added minimal Zod validation for `NODE_ENV` and optional `NEXT_PUBLIC_APP_URL` without production secrets.
- Added `.env.example` with the optional public URL name and no credential value.
- Added GitHub Actions CI using a clean npm install, formatting, type checking, linting, application tests, Review Engine tests, and production build.
- Added `npm run ci` as the equivalent local validation sequence after installation.

### Verification Results

- `npm install --prefer-offline` — passed after a registry idle-timeout retry; 33 packages added
- `npm ci --prefer-offline` — passed; clean install of 392 packages and 393 packages audited
- `npm run format:check` — passed
- `npm run typecheck` — passed
- `npm run lint` — passed with no warnings
- `npm run test` — passed; 2 files and 3 tests
- `npm run test:review` — passed; 14 tests
- `npm run build` — passed; `/` and `/_not-found` prerendered as static routes
- `npm run ci` — passed; complete local CI sequence
- `npm run review` — passed; generated the review package with 3 captured passing validations
- `git diff --check` — passed

### Limitations

- CI workflow execution is defined but cannot be observed until GitHub runs it after a push or pull request.
- The smoke test verifies server-rendered homepage content, not browser interaction or end-to-end navigation.
- Environment validation intentionally covers only the current optional public URL and runtime mode.
- npm continues to report the existing three transitive advisories and deferred install scripts for `fsevents`, `sharp`, and `unrs-resolver`.

## Phase 3 Unit 1 — Canonical Project Schema Implementation

Completed on 2026-07-22.

### Files Created

- `src/domain/project/enums.ts`
- `src/domain/project/fixtures.ts`
- `src/domain/project/identifiers.ts`
- `src/domain/project/index.ts`
- `src/domain/project/schema.test.ts`
- `src/domain/project/schema.ts`

### Files Modified

- `README.md`
- `PROJECT.md`
- `DECISIONS.md`
- `context/02-architecture.md`
- `context/06-progress-tracker.md`
- `examples/oxzire-3d-website-fixture.md`
- `examples/news-automation-2026-fixture.md`

### Completed Work

- Added branded project, workspace, field, evidence, assumption, decision, conflict, and version identifiers.
- Added strict enums and Zod schemas for field state, provenance, criticality, approvals, assumptions, conflicts, lifecycle, metadata records, and the complete canonical project shape.
- Added generic `ProjectField<T>` metadata for values, status, confidence, criticality, source precedence, evidence, timestamps, assumptions, approvals, and conflicts.
- Enforced evidence and metadata references, unique identifiers, approval/conflict rules, accepted-assumption rationale, readiness blockers, approved-version placeholder rejection, lifecycle transitions, chronological lifecycle events, and public-environment secret boundaries.
- Added validated parse and deterministic recursively key-sorted JSON serialization APIs.
- Added realistic, executable canonical fixtures for Oxzire 3D Website and News Website Automation Systems 2026.
- Formalized `architecture_ready` between `understanding_review` and `bible_generated` in ADR-009 and the architecture lifecycle.
- Added 12 focused canonical-domain tests, bringing the application suite to 15 tests across 3 files.

### Verification Results

- `npm run format:check` — passed
- `npm run typecheck` — passed
- `npm run lint` — passed with no warnings
- `npm run test` — passed; 3 files and 15 tests
- `npm run test:review` — passed; 14 tests
- `npm run build` — passed; `/` and `/_not-found` prerendered as static routes
- `npm run review` — passed with typecheck, lint, and build captured as passing after rerunning outside the restricted sandbox
- `git diff --check` — passed

The first sandboxed `npm run review` generated its package but exited nonzero because Turbopack could not bind the local IPC port while creating its CSS worker. The directly requested build had already passed. Rerunning the same Review Engine command with the required sandbox permission passed all three captured validations; no project or Review Engine change was needed.

### Deferred Work and Open Schema Questions

- Completeness metrics are validated for shape and bounds but are not yet derived from fields; deterministic scoring belongs to the next unit.
- Source precedence is represented and ranked, but merge and mutation behavior is not implemented in this unit.
- Persistence mappings, schema migrations, and version-storage policy remain deferred.
- Reopening maintained projects and other backward lifecycle transitions need an explicit product decision before mutation APIs are introduced.

## Phase 3 Unit 2 — Deterministic Completeness and Critical Question Ranking

Completed on 2026-07-22.

### Files Created

- `src/domain/discovery/engine.ts`
- `src/domain/discovery/engine.test.ts`
- `src/domain/discovery/index.ts`
- `src/domain/discovery/rules.ts`
- `src/domain/discovery/types.ts`

### Files Modified

- `README.md`
- `PROJECT.md`
- `DECISIONS.md`
- `context/02-architecture.md`
- `context/06-progress-tracker.md`
- `specs/02-discovery-engine.md`

### Completed Work

- Added deterministic field relevance using project type, lifecycle stage, criticality, explicit dependencies and activation rules, and safe-default availability.
- Added blocking/high/medium/low completeness weights of `100`/`70`/`35`/`10` with explicit resolution ratios for approvals, confirmations, accepted assumptions, safe defaults, inference, unsafe defaults, missing fields, and conflicts.
- Added critical, overall, and per-section completeness plus blocking gaps, open conflicts, accepted assumptions, required approvals, and visible safe-default reporting.
- Added the exact auditable question-rank formula and per-candidate factor breakdown for criticality, lifecycle, architecture impact, downstream dependencies, uncertainty, default safety, typing cost, and answerability.
- Added deterministic interview skipping at the locked `90%` threshold with zero blocking gaps, zero blocking conflicts, and zero required approvals.
- Added selectable answer metadata, free-text necessity, typing effort, stable tie ordering, the typical two-to-five target, and the hard eight-question cap.
- Kept the engine pure, provider-neutral, AI-free, and non-mutating.
- Recorded the runtime contract in ADR-010 and aligned the discovery specification and architecture boundary.

### Test Coverage

- Complete Master Prompt with zero questions
- Simple project with three critical questions
- Complex unclear project capped at eight questions
- Blocking conflict preventing interview skip
- Safe defaults avoiding questions
- Critical field outranking a cosmetic field
- Selectable low-typing-cost question preference
- Lifecycle-dependent relevance
- Accepted assumption resolution
- Unresolved inference and required approval handling
- Deterministic output ordering
- Oxzire 3D Website fixture
- News Website Automation Systems 2026 fixture

### Verification Results

- `npm run format:check` — passed
- `npm run typecheck` — passed
- `npm run lint` — passed with no warnings
- `npm run test` — passed; 4 files and 28 tests
- `npm run test:review` — passed; 14 tests
- `npm run build` — passed; `/` and `/_not-found` prerendered as static routes
- `npm run review` — passed; typecheck, lint, build, and generated-output secret scan passed
- `git diff --check` — passed

### Deferred Work and Open Questions

- The engine reports safe defaults but intentionally does not mutate canonical state; validated mutations belong to the next unit.
- Related questions are not merged without a field-specific answer-to-mutation contract proving that one answer resolves every field safely.
- Natural-language extraction, dynamic phrasing, answer application, persistence, and interview UI remain deferred.
- New canonical fields must receive reviewed relevance and question policy; generic deterministic fallbacks prevent runtime failure but do not replace policy review.

## Phase 3 Unit 3 — Deterministic Natural-Language Extraction Engine

Completed on 2026-07-22.

### Files Created

- `src/domain/extraction/engine.ts`
- `src/domain/extraction/engine.test.ts`
- `src/domain/extraction/index.ts`
- `src/domain/extraction/lexicon.ts`
- `src/domain/extraction/parser.ts`
- `src/domain/extraction/types.ts`
- `specs/04-deterministic-extraction-engine.md`

### Files Modified

- `AGENTS.md`
- `OXZI.md`
- `README.md`
- `PROJECT.md`
- `DECISIONS.md`
- `context/02-architecture.md`
- `context/06-progress-tracker.md`

### Completed Work

- Added validated input contracts for plain text, Master Prompts, uploaded notes, and previous AI conversations.
- Added deterministic Unicode normalization, Markdown/inline heading parsing, list and sentence segmentation, and conversation-speaker tracking.
- Added English and Bahasa Indonesia section aliases plus reviewed project-type, stack, platform, language, visual, integration, deployment, security, and privacy dictionaries.
- Added canonical normalization for goals, target users, prioritized features, constraints, assumptions, integrations, visual direction, stack, risks, localization, deployment, and security/privacy requirements.
- Added confidence, evidence, source, speaker, rule explanation, and explicit/inferred metadata to every extracted update.
- Added exact duplicate merging with unique evidence, compatible list merging, stable identifiers, and deterministic output ordering.
- Added scalar, exclusive-stack, and feature-versus-out-of-scope contradiction detection without silent confidence selection.
- Added mandatory approved-field protection; proposals are marked blocked and canonical state is never mutated.
- Added common credential redaction in retained evidence excerpts.
- Recorded the proposal-only extraction boundary in ADR-011 and the dedicated extraction specification.

### Test Coverage

- Simple plain-text prompt
- Large structured Master Prompt
- Duplicate facts across multiple sources
- Conflicting deployment and stack information
- Missing information without fabricated updates
- Multilingual English and Bahasa Indonesia input
- Oxzire 3D Website scenario
- News Automation scenario
- Approved-field overwrite protection
- Imported AI conversation speaker precedence
- Deterministic repeated output

### Verification Results

- `npm run format:check` — passed
- `npm run typecheck` — passed
- `npm run lint` — passed with no warnings
- `npm run test` — passed; 5 files and 39 tests
- `npm run test:review` — passed; 14 tests
- `npm run build` — passed; `/` and `/_not-found` prerendered as static routes
- `npm run review` — passed; typecheck, lint, build, and generated-output secret scan passed
- `git diff --check` — passed

`npm run ci` passed formatting, type checking, linting, application tests, and Review Engine tests, then its nested sandboxed build hit the known Turbopack local-port restriction. The separately approved `npm run build` command passed immediately afterward. This was an execution-environment restriction, not an application failure.

### Limitations and Deferred Work

- Deterministic extraction is vocabulary-bound; unmatched phrasing remains unmatched rather than being guessed.
- Complex negation, long-distance references, sarcasm, and intentional multi-framework or multi-database architectures can require human review.
- Required nested canonical properties may use clearly marked inference when a source names an entity without enough detail.
- Extracted safe proposals are not applied; source precedence, validated mutations, versioning, and merge behavior remain the next domain boundary.
- LLM-assisted extraction, persistence, interview generation, and UI remain deferred.

## Architecture Expansion and Extraction Hardening

Completed on 2026-07-23.

### Files Created

- `specs/05-knowledge-graph-engine.md`
- `specs/06-context-compiler.md`
- `specs/07-ai-task-card-prompt-compiler.md`
- `specs/08-review-audit-analyzer.md`
- `specs/09-visual-master-architecture-generator.md`

### Files Modified

- `AGENTS.md`
- `PROJECT.md`
- `DECISIONS.md`
- `OXZI.md`
- `README.md`
- `context/01-project-overview.md`
- `context/02-architecture.md`
- `context/03-ui-visual-context.md`
- `context/04-code-standards.md`
- `context/05-ai-workflow-rules.md`
- `context/06-progress-tracker.md`
- `specs/04-deterministic-extraction-engine.md`
- `examples/oxzire-3d-website-fixture.md`
- `examples/news-automation-2026-fixture.md`
- `src/domain/extraction/engine.ts`
- `src/domain/extraction/engine.test.ts`
- `src/domain/extraction/lexicon.ts`
- `src/domain/extraction/parser.ts`

### Implemented Work

- Hardened deterministic extraction with reviewed Roman Urdu, mixed Roman Urdu/English, and spelling-variation matching.
- Added conservative sectionless problem, solution, goal, audience, feature, and risk patterns with lower confidence than explicit sections.
- Improved deterministic segmentation for lowercase-following sentences, semicolons, bullets, numbered lists, mixed prose, and Roman Urdu `aur` lists.
- Added negative-constraint handling before dictionaries so prohibited choices do not become current stack, integration, platform, or feature proposals.
- Added current-MVP, deferred/future, explicit out-of-scope, and undecided classification. Deferred and undecided items remain outside current features with visible markers.
- Added obvious canonical normalization for NextJS, Postgres, contextual Bahasa/Bhasa Indonesia, mobile-first, dark/light themes, SaaS variants, Codex, Cursor, Claude Code, and Gemini CLI.
- Extended current-versus-noncurrent capability conflict detection without weakening approved-field protection.
- Expanded candidate/evidence security redaction for common credential fields, recognized provider tokens, URL credentials, headers, and private-key blocks without broad entropy redaction.
- Added 13 extraction tests, increasing the extraction suite from 11 to 24 and the full application suite from 39 to 52 tests.

### Accepted and Specified, Not Implemented

- ADR-012: quality-first token efficiency and smallest sufficient context
- ADR-013: Knowledge Graph as a derived typed projection
- ADR-014: normalized AI Task Card with style renderers
- ADR-015: one selected prompt style generated by default
- ADR-016: audit-gated next-task recommendations
- ADR-017: visual architecture derived from the Knowledge Graph
- Knowledge Graph Engine
- Token-Saving Context Compiler
- AI Task Card Prompt Compiler
- Review/Audit Analyzer
- Visual Master Architecture Generator
- Private-by-default Prompt Performance Dataset direction

### Verification Results

- Focused extraction run — passed; 24 tests
- `npm run format:check` — passed
- `npm run typecheck` — passed
- `npm run lint` — passed with no warnings
- `npm run test` — passed; 5 files and 52 tests
- `npm run test:review` — passed; 14 tests
- `npm run build` — passed; `/` and `/_not-found` prerendered as static routes
- `npm run review` — passed outside the restricted sandbox; typecheck, lint, build, and generated-output secret scan passed
- `git diff --check` — passed

The first sandboxed Review Engine run recorded typecheck and lint as passing but its nested Turbopack build could not bind the required local IPC port. The required rerun with sandbox permission passed all captured checks. The direct production build also passed. No Review Engine or application change was required.

### Remaining Deterministic Limits

- Roman Urdu remains a reviewed vocabulary and phrase set, not general language understanding.
- Complex/long-distance negation, pronouns, sarcasm, and novel transliterations remain unmatched or require human review.
- The canonical schema has no dedicated temporal-scope field. Extraction therefore proposes reviewable `Deferred:` and `Undecided:` markers under current-MVP out-of-scope state until a later mutation/schema decision provides a richer model.
- Bare `Bahasa` normalizes only in explicit language context to avoid false positives.
- Private-key redaction is pattern-based and cannot guarantee recognition of every novel credential format; raw secrets remain prohibited.
- Graph identifier derivation details, repository-evidence ingestion, and confidence thresholds belong to the next implementation unit.

## Current Phase

Wave 1 — Unified Contracts and Temporal Graph Foundation complete

### Implemented

1. Canonical schema and fixtures
2. Deterministic completeness and critical-question ranking
3. Deterministic natural-language extraction proposals
4. Deterministic extraction hardening
5. Deterministic Knowledge Graph projection, traversal, impact, task-subgraph, and fingerprint foundation
6. Binding token-efficiency and future Token Ledger contracts
7. Temporal graph, Episodes, path finding, integrity auditing, and shared governance/workflow/execution contract schemas

### Approved and Specified, Not Implemented

1. Phase 3: Project Constitution Foundation and Specification Health Foundation
2. Phase 4: six-file renderer, Controlled Living Specification model, Technical Plan schema, Implementation Slice Planner, Context Compiler, context version/diff packs, and Visual Architecture Generator
3. Phase 5: Workflow Policy Engine, selective Skill Registry, normalized Task Card, Execution Passport, prompt renderers, Review/Audit Analyzer, dual review, convergence, repair escalation, execution ledger, and handoff exports
4. Phase 6: intake, minimal interview, Specification Health review, Constitution/plan/slice/graph workspaces, Task Card/Passport review, audit/convergence dashboard, settings, and exports

### Deferred

1. Phase 5: optional connected-agent delivery after explicit approval
2. Phase 7: authentication/workspaces, persistence, artifact/version storage, capability registry, provider gateway, jobs, permissions, connected adapters, and execution monitoring
3. Phase 8: benchmark/regression evaluation, both validation projects, token/quality A/B evaluation, security/performance/accessibility validation, deployment, and launch readiness
4. Prompt Performance Dataset telemetry and any consented optimization pipeline

## Open Decisions for Later

- Prisma versus Drizzle
- Exact cloud model providers available at launch
- Billing provider and pricing plans
- Final OXZI brand identity
- Deployment domain
- Dedicated canonical temporal-scope representation versus the current visible out-of-scope markers
- Exact repository-evidence ingestion policy for graph file/module/API/screen/review-finding nodes
- Target-agent tokenizer and dynamic capability/cost profile sources
- Canonical Constitution migration and deterministic Specification Health check catalog
- Artifact/capability trust, storage, freshness, and adapter compatibility contracts

These decisions do not block the implemented deterministic domains or the next scoped foundation unit.

## Session Resume Context

The next smallest unit is Specification Governance Runtime Foundation: integrate constitutional-rule records into canonical state and implement deterministic Constitution projection/querying plus Specification Health evaluation. Do not include planning automation, Repository Intelligence, context compilation, agent delivery, persistence, providers, or UI.

## Prompt Evaluation and Divergent Reasoning Architecture Expansion

### Completed Work

- Added provider-neutral, JSON-safe Zod contracts for evaluation assertions, suites, scenarios, prompt certification, execution certification, renderer candidates, performance datasets, optimization hypotheses, and release decisions.
- Added deterministic hard-gate validation, risk-based minimum-suite selection, trust-boundary enforcement, meaning-preservation checks, dataset partition checks, and deterministic serialization helpers.
- Added provider-neutral contracts for cognitive-frame metadata, isolated candidate ideas, critic results, clusters, trap findings, deepened candidates, cost estimates, activation decisions, and divergence reports.
- Added cross-record checks for candidate references, hard-constraint failures, generator/critic separation, repeated branch-context cost accounting, shortlist safety, deterministic ordering, and proposal-only approval state.
- Added binding specifications for Prompt Evaluation, Certification, and Optimization and for the Divergent Reasoning Engine.
- Added ADR-044 through ADR-058 for versioned prompt evaluation, renderer meaning preservation, deterministic-first evaluation, separate prompt/execution certification, dataset and release gates, content trust, risk-based red teams, isolated divergence, generator/critic separation, cognitive frames, traps, cost gating, artifact-first branches, proposal status, and evidence-gated promotion.
- Updated the relevant graph, Task Card, efficiency ledger, workflow/skill, agent-control, architecture, workflow, project, product, startup, and navigation contracts without changing application UI or adding runtime AI/provider behavior.

### Files Created

- `specs/19-prompt-evaluation-certification-optimization.md`
- `specs/20-divergent-reasoning-engine.md`
- `src/domain/evaluation/schemas.ts`
- `src/domain/evaluation/index.ts`
- `src/domain/evaluation/evaluation.test.ts`
- `src/domain/divergence/schemas.ts`
- `src/domain/divergence/index.ts`
- `src/domain/divergence/divergence.test.ts`

### Files Modified

- `CURRENT.md`
- `DECISIONS.md`
- `OXZI.md`
- `PROJECT.md`
- `context/00-context-map.md`
- `context/01-project-overview.md`
- `context/02-architecture.md`
- `context/04-code-standards.md`
- `context/05-ai-workflow-rules.md`
- `context/06-progress-tracker.md`
- `specs/05-knowledge-graph-engine.md`
- `specs/07-ai-task-card-prompt-compiler.md`
- `specs/10-efficiency-ledger.md`
- `specs/14-workflow-policy-skill-registry.md`
- `specs/18-agent-control-evidence-evaluation.md`

### Verification Results

- Focused evaluation/divergence run — passed; 2 files and 23 tests
- `npm run format:check` — passed
- `npm run typecheck` — passed
- `npm run lint` — passed with no warnings
- `npm run test` — passed; 9 files and 115 tests
- `npm run test:review` — passed; 14 tests
- `npm run build` — passed outside the restricted sandbox; `/` and `/_not-found` prerendered as static routes
- `npm run review` — passed outside the restricted sandbox; captured typecheck, lint, build, and generated-output secret scan all passed
- `git diff --check` — passed
- Startup context — `AGENTS.md` 3,157 characters (~789 estimated tokens), `CURRENT.md` 1,915 (~479), and `context/00-context-map.md` 2,770 (~693); combined 7,842 characters (~1,961)

The complete sandboxed `npm run ci` sequence passed formatting, type checking, linting, application tests, and Review Engine tests. Its final Turbopack build could not bind a required local IPC port (`Operation not permitted`); the approved out-of-sandbox `npm run build` rerun passed. The required Review Engine rerun also passed outside the restricted sandbox.

### Deferred Limits

- No model judge, evaluator runtime, red-team runtime, optimizer, provider call, parallel branch orchestration, or connected execution exists in this unit.
- Meaning fingerprints are validated as contract inputs; a future compiler must calculate them from normalized Task Cards and rendered prompts.
- Minimum-suite selection is deterministic and deliberately narrow. Runtime risk classification and overhead-aware execution remain deferred.
- Generator/critic isolation and imported-content trust are enforceable record boundaries, not proof of process isolation or automatic injection detection.
- Divergence cost contracts account for token components but do not integrate provider prices, billing, cache telemetry, or actual Token Ledger measurements.
- Cross-reference checks are local to the supplied report or dataset because no persistence registry exists.

### Next Smallest Unit

Specification Governance Runtime Foundation remains the next smallest unit: integrate constitutional-rule records into canonical state and implement deterministic Constitution projection/querying plus Specification Health evaluation. Prompt-evaluation execution, divergent branch orchestration, providers, persistence, UI, and connected agents remain outside that unit.

## Prompt Intelligence, Typed AI, Observability, Skills, and Repository Intelligence Expansion

### Completed Work

- Implemented strict provider-neutral Prompt Program, immutable version, Example Registry/selection, optimization candidate/experiment, promotion, rollback-reference, deterministic serialization, and used-version update contracts.
- Implemented Typed AI definition/invocation, parse/error, bounded repair, partial completion, typed result, escalation, deterministic known-alias normalization, and serialization contracts.
- Implemented privacy-aware trace/span/generation/observation/evaluation-link, exact execution-version lineage, retention, dataset/item, experiment/run, hierarchy, partition, and serialization contracts.
- Extended Workflow with repository-evidence-backed DAILY/LIBRARY skill surfaces, activation plans, failure capture, diagnostic hypotheses, contained recovery, repeated-action escalation, and introspection contracts.
- Implemented parser-neutral adapter/snapshot/parsed-file/range/error/symbol/relationship/query/match/rule/finding/transformation-preview/update contracts plus deterministic parsed-file fingerprints and cache-freshness checks.
- Added focused specifications `21` through `25`, ADR-059 through ADR-077, and reconciled affected project, graph, context, Task Card, review, ledger, convergence, workflow, Passport, evaluation, divergence, and repository contracts.
- Added 38 focused tests, increasing the application suite from 115 to 153 tests.

### Roadmap Reconciliation

- Prompt Program Registry, Example Registry, Promotion Decision, and Renderer Rollback — `implemented contracts only`; registries/managers `planned`.
- Optimization Candidate Generator and Training/Validation Evaluator — `planned`; candidate/experiment schemas `implemented contracts only`.
- Typed AI Contract Registry, Structured Parser, Repair Pipeline, Partial/Streaming handling — `implemented contracts only`; Deterministic Normalizer for known aliases — `implemented foundation only`; provider adapters `deferred`.
- Trace/Span Runtime, version tracking, token/cost/latency capture, Dataset Registry, Evaluation Links, and Privacy Controls — `implemented contracts only`; capture/storage runtime `planned`; Experiment Runner and Trace Viewer `planned`.
- DAILY/LIBRARY Skill Surface Auditor, Skill Router, Agent Self-Diagnostic Runtime, Loop Detection, and Preventive Insight Proposal — `planned`; evidence, overhead, activation, failure, recovery, and report contracts `implemented contracts only`.
- Language Detection, Parser Adapter Registry, initial compatible adapter, incremental parsing, symbol/import/export/call extraction, repository graph, structural query/policy scanners, refresh, and lines-of-interest extraction — `planned`; adapter metadata, parsed records, rules, previews, invalidation, and deterministic cache helpers `implemented foundation only`.
- Automatic structural rewriting, production trace persistence/upload, model-assisted repair, prompt optimization, provider SDKs, databases, and UI — `deferred`.
- Prompt-program regression, typed-output reliability, parser/rule fixtures, context-selection quality, and token-versus-quality benchmark runtimes — `planned`; contract fixtures in this unit are `implemented`.

### Files Created

- `specs/21-prompt-programs-optimization.md`
- `specs/22-typed-ai-contracts-repair.md`
- `specs/23-observability-datasets-experiments.md`
- `specs/24-selective-skills-agent-diagnostics.md`
- `specs/25-repository-parsing-structural-intelligence.md`
- `src/domain/prompt-programs/` — schemas, exports, and tests
- `src/domain/ai-contracts/` — schemas, exports, and tests
- `src/domain/observability/` — schemas, exports, and tests
- `src/domain/repository-intelligence/` — schemas, exports, and tests
- `src/domain/workflow/intelligence.ts`
- `src/domain/workflow/workflow-intelligence.test.ts`

### Files Modified

- `CURRENT.md`, `DECISIONS.md`, `OXZI.md`, and `PROJECT.md`
- `context/00-context-map.md`, `context/01-project-overview.md`, `context/02-architecture.md`, `context/04-code-standards.md`, `context/05-ai-workflow-rules.md`, and this tracker
- `specs/05-knowledge-graph-engine.md`, `06-context-compiler.md`, `07-ai-task-card-prompt-compiler.md`, `08-review-audit-analyzer.md`, `10-efficiency-ledger.md`, `13-controlled-specifications-convergence.md`, `14-workflow-policy-skill-registry.md`, `15-execution-passport.md`, `17-repository-intelligence.md`, `18-agent-control-evidence-evaluation.md`, `19-prompt-evaluation-certification-optimization.md`, and `20-divergent-reasoning-engine.md`
- `src/domain/workflow/index.ts` and `src/domain/workflow/schemas.ts`

### Verification Results

- Focused new-domain run — passed; 5 files and 38 tests
- `npm run format:check` — passed
- `npm run typecheck` — passed
- `npm run lint` — passed with no warnings
- `npm run test` — passed; 14 files and 153 tests
- `npm run test:review` — passed; 14 tests
- `npm run build` — passed outside the restricted sandbox; `/` and `/_not-found` prerendered as static routes
- `npm run review` — passed outside the restricted sandbox; captured typecheck, lint, build, and generated-output secret scan passed
- `git diff --check` — passed
- Startup context — `AGENTS.md` 3,157 characters (~789 estimated tokens), `CURRENT.md` 1,971 (~493), and `context/00-context-map.md` 2,603 (~651); combined 7,731 characters (~1,933)
- No dependency or lockfile change; no UI, canonical-state, provider, parser-runtime, persistence, or external telemetry change

### Remaining Risks and Limits

- Schema references are versioned strings; a future registry must resolve them, prove compatibility, and prevent identifier reuse.
- Known normalization is intentionally shallow and alias-based. It does not parse arbitrary malformed model output or perform model-assisted repair.
- Trace hierarchy validates references but no runtime captures, persists, deletes, or enforces organization retention.
- Prompt meaning fingerprints and raw-content redaction are caller-supplied contract evidence until the compiler/security runtimes calculate and verify them.
- DAILY classification contracts require evidence but no auditor currently discovers or refreshes that evidence.
- Parser metadata and structural records do not parse code. Parser isolation, grammar security, error recovery quality, graph projection, and structural rule precision require runtime fixtures.
- Transformation previews cannot apply changes; overlap analysis, isolated workspaces, approvals, validation, and rollback execution remain future work.

### Next Smallest Unit

Specification Governance Runtime Foundation remains next: integrate constitutional-rule records into canonical state and implement deterministic Constitution projection/querying plus Specification Health evaluation. Do not add the deferred Prompt Program, provider/repair, trace, parser, structural transformation, persistence, or UI runtimes to that unit.

## Specification Governance Runtime Foundation

### Completed Work

- Added strict governance runtime records for normalized requirements, versioned Constitution snapshots and exceptions, compliance evidence, revision/lifecycle metadata, traceability links, deterministic findings, clarification needs, categorical health, readiness recommendations, and versioned reports.
- Implemented the deterministic pipeline: normalization, Constitution resolution, structural validation, clarification analysis, rule compliance, consistency analysis, traceability analysis, health calculation, readiness recommendation, and report compilation.
- Kept Constitution input as an explicit versioned snapshot beside canonical state. The runtime never mutates canonical state, approves Specifications, or treats the snapshot as a second project source of truth; canonical Constitution storage remains deferred.
- Implemented authority-conflict detection, version-specific approved exceptions, mandatory-evidence unknown states, lifecycle-aware traceability, dependency-cycle and contradiction checks, immutable approved-version validation, amendment ancestry, and stale-report detection.
- Added eight unweighted categorical health dimensions: structural completeness, clarification completeness, constitutional compliance, internal consistency, traceability, testability, approval completeness, and freshness.
- Added deterministic semantic report fingerprints that exclude the evaluation timestamp while retaining timestamped provenance in the report.
- Added 12 concrete governance fixtures and 41 focused tests covering ready, incomplete, ambiguous, violating, unknown-evidence, contradictory, broken-traceability, stale, unauthorized-exception, amendment, unverifiable, and nonblocking-warning states.
- Reconciled the Constitution, Specification Health, controlled-living, architecture, workflow, project, decision, startup, and progress documents with the implemented boundary.

### Files Created

- `src/domain/governance/clarification.ts`
- `src/domain/governance/consistency.ts`
- `src/domain/governance/constitution.ts`
- `src/domain/governance/controlled-living.ts`
- `src/domain/governance/evaluate.ts`
- `src/domain/governance/fixtures.ts`
- `src/domain/governance/governance-runtime.test.ts`
- `src/domain/governance/health.ts`
- `src/domain/governance/normalizer.ts`
- `src/domain/governance/runtime-schemas.ts`
- `src/domain/governance/runtime-utils.ts`
- `src/domain/governance/structure.ts`
- `src/domain/governance/traceability.ts`

### Files Modified for This Unit

- `src/domain/governance/index.ts`
- `CURRENT.md`, `DECISIONS.md`, `OXZI.md`, and `PROJECT.md`
- `context/02-architecture.md`, `context/05-ai-workflow-rules.md`, and this tracker
- `specs/11-project-constitution.md`, `specs/12-specification-health-engine.md`, and `specs/13-controlled-specifications-convergence.md`

### Verification Results

- Focused governance run — passed; 1 file and 41 tests
- `npm run format:check` — passed after formatting the new governance sources
- `npm run typecheck` — passed
- `npm run lint` — passed with no warnings after removing two unused test imports
- `npm run test` — passed; 15 files and 194 tests
- `npm run test:review` — passed; 14 tests
- `npm run build` — passed; `/` and `/_not-found` prerendered as static routes
- `npm run review` — passed outside the restricted sandbox; captured typecheck, lint, build, and generated-output secret scan passed
- `git diff --check` — passed

The first sandboxed Review Engine run correctly recorded its nested Turbopack build failure (`Operation not permitted` while binding a local IPC port). The approved out-of-sandbox rerun passed all captured checks. The direct production build passed in the sandbox. No application or Review Engine change was required.

### Deferred Limits

- Constitution rules are supplied as an explicit versioned governance snapshot; canonical schema storage, authoring, persistence, and registry lookup remain deferred.
- The requirement envelope adds runtime governance metadata around the existing Specification contract; migrating those records into canonical state remains a separate explicit decision.
- Readiness is a deterministic recommendation. Human/workflow approval, Technical Plan generation, slice planning, Task Card compilation, and execution authorization remain deferred.
- Traceability checks operate on supplied durable references; repository parser/runtime evidence, database resolution, and convergence execution remain deferred.
- No provider, LLM, database, persistence, UI, parser runtime, or application feature was added.

### Next Smallest Unit

Implement the Technical Plan and Independent Implementation Slice Runtime Foundation over healthy, approved Specification Governance reports. Keep planning deterministic and read-only, preserve parent Constitution/Specification/report fingerprints, and defer Task Card compilation, provider calls, persistence, repository parsers, convergence, and UI.

## Specification Governance Runtime Contract Hardening

### Completed Work

- Added standalone deterministic testability and temporal freshness analyzers and integrated them into health, readiness, and Governance Report compilation.
- Extended Governance Reports with the complete normalization result, testability findings, freshness result, and exact semantic inputs while keeping execution timestamps outside semantic identity.
- Extended readiness output with readiness class, recommendations, Constitution version, and all evaluator versions; the runtime still recommends rather than approves.
- Added evaluator versions to every health dimension and retained categorical, unweighted evaluation.
- Made Constitution exceptions explicitly rule-, Specification-version-, and scope-specific; added unknown-applicability blocking and verified exceptions do not carry into amendments.
- Expanded stale-report detection to Constitution fingerprints plus source and dependency fingerprints, while preserving historical reports as immutable values.
- Added lifecycle-aware stale/superseded trace findings and deterministic subjective, restatement, observable-result, evidence, verification-method, and protected-data testability rules.
- Expanded the governance fixture set to 15 and the focused suite from 41 to 65 tests.

### Files Created

- `src/domain/governance/testability.ts`
- `src/domain/governance/freshness.ts`

### Files Modified

- `src/domain/governance/runtime-schemas.ts`, `runtime-utils.ts`, `evaluate.ts`, `health.ts`, `constitution.ts`, `controlled-living.ts`, `traceability.ts`, `fixtures.ts`, `governance-runtime.test.ts`, and `index.ts`
- `CURRENT.md`, `DECISIONS.md`, `context/02-architecture.md`, `context/05-ai-workflow-rules.md`, and this tracker
- `specs/11-project-constitution.md`, `specs/12-specification-health-engine.md`, and `specs/13-controlled-specifications-convergence.md`

### Validation Results

- Focused governance run — passed; 1 file and 65 tests
- `npm run format:check` — passed
- `npm run typecheck` — passed
- `npm run lint` — passed with no warnings
- `npm run test` — passed; 15 files and 218 tests
- `npm run test:review` — passed; 14 tests
- `npm run build` — passed
- `npm run review` — passed outside the restricted sandbox; all captured checks and generated-output secret scan passed
- `git diff --check` — passed

### Remaining Limits

- Testability is intentionally deterministic and vocabulary/rule based; it does not generate tests or use semantic similarity.
- Freshness validates supplied exact versions and fingerprints but does not resolve them from a database or repository registry.
- Constitution snapshots remain explicit runtime inputs until the planned canonical storage migration.
- Technical planning, slices, Task Cards, persistence, providers, parsers, UI, convergence runtime, and automatic approval remain deferred.

### Next Smallest Unit

Implement the Technical Plan and Independent Implementation Slice Runtime Foundation over a healthy, approved, current Governance Report. Preserve exact parent fingerprints and keep Task Card compilation, execution, persistence, providers, parsers, convergence, and UI outside that unit.

## Technical Plan and Implementation Slice Runtime Foundation

### Completed Work

- Added strict Technical Plan, Plan version, Slice version, normalization, categorical health/readiness, and Plan/Slice Governance Report schemas while upgrading the authoritative existing Implementation Slice contract in place.
- Implemented pure Plan and Slice normalization with deterministic collection handling, content-derived fingerprints, stable serialization, explicit normalization actions, and fingerprint mismatch blockers.
- Implemented deterministic one-Slice-per-included-requirement derivation with stable IDs, dependency-safe ordering, acceptance/validation traceability, rollback, evidence, protected/editable scope, and explicit foundation justification.
- Implemented Plan/Slice structural validation, no-broadening consistency checks, exact-parent traceability, broken-reference detection, categorical six-dimension health, and readiness recommendations that never approve artifacts.
- Implemented approved/used Plan and Slice immutability plus exact parent linkage for amendments.
- Added normalized semantic Plan and Slice Governance Reports whose semantic fingerprints exclude evaluation timestamps.
- Added ADR-078 for deterministic requirement-backed Slice derivation and conservative parallelism.
- Added eight fixture scenarios and 26 focused tests covering happy paths, every requested blocker class, immutability, stable fingerprints/serialization, deterministic order, and input immutability.

### Files Created

- `src/domain/planning/schemas.ts`
- `src/domain/planning/utils.ts`
- `src/domain/planning/normalization.ts`
- `src/domain/planning/derivation.ts`
- `src/domain/planning/validation.ts`
- `src/domain/planning/analysis.ts`
- `src/domain/planning/health.ts`
- `src/domain/planning/evaluate.ts`
- `src/domain/planning/fixtures.ts`
- `src/domain/planning/planning.test.ts`
- `src/domain/planning/index.ts`

### Files Modified

- `src/domain/governance/schemas.ts`
- `CURRENT.md`, `PROJECT.md`, and `DECISIONS.md`
- `context/00-context-map.md`, `context/02-architecture.md`, and this tracker
- `specs/13-controlled-specifications-convergence.md`

### Validation Results

- Focused planning run — passed; 1 file and 26 tests
- `npm run format:check` — passed
- `npm run typecheck` — passed
- `npm run lint` — passed with no warnings
- `npm run test` — passed; 16 files and 244 tests
- `npm run test:review` — passed; 14 tests
- `npm run build` — passed
- `npm run ci` — passed outside the restricted sandbox
- `npm run review` — passed outside the restricted sandbox; captured checks and generated-output secret scan passed
- `git diff --check` — passed

### Remaining Limits

- Slice derivation is deliberately one included requirement per Slice; future aggregation requires a versioned, evidence-backed policy change.
- Parallel groups remain unset unless safe disjointness is explicit; this runtime does not infer repository mutation boundaries.
- Technical architecture references, components, commands, risks, and evidence are supplied normalized inputs; no parser, database, or provider resolves them.
- Task Card compilation, Context Compilation, Execution Passports, persistence, UI, convergence, providers, and execution remain deferred.

### Next Smallest Unit

Implement the Task Card Compiler Runtime Foundation over one healthy, approved, current Implementation Slice and its exact Plan/Specification/Constitution fingerprints. Keep context compilation, prompt rendering, Execution Passport certification, connected delivery, persistence, providers, and UI outside that unit.

## Core Intelligence Wave — Final Integration Tasks (Tasks 5–6)

### Completed Work

- Created API routes for divergence trigger (`POST /api/divergence`), project restore/version increment (`POST /api/projects/[id]/restore`), Task Card compilation (`POST /api/projects/[id]/taskcard`), and trace listing/retrieval (`GET /api/traces`, `GET /api/traces/[id]`)
- Created trace detail page (`/traces/[id]`) with hierarchical span tree, duration/token displays, and status indicators
- Rewrote project detail page (`/projects/[id]`) with divergence reasoning button/modal, history timeline slider with restore, visual map generate/refresh, loading skeleton, error banners, loading overlays, generate ZIP, and delete
- Enhanced visual architecture diagram generation with legend and clickable nodes
- **Task 5 — End-to-End Integration Tests**: Extended integration test coverage with 9 new tests in `src/__tests__/integration/new-features.test.ts` covering:
  - Divergence report generation with full `runDivergence` flow (candidates, clusters, traps, scores)
  - `activateDivergence` recommendation for well-budgeted requests
  - Visual Mermaid diagram generation from parsed repositories
  - History API version retrieval
  - Trace capture via `withTrace` wrapper with span hierarchy
  - Trace failure recording
  - AST parser export and import extraction
- **Task 6 — Polish**: Fixed production code mismatches between runtime implementations and Zod schemas in the capture, divergence, and observability modules (span fields, trap fields, cluster fields, cost calculation alignment, canonicalProjectVersionId pattern, specificationVersionRefs minimum)
- Updated `CURRENT.md` with Core Intelligence Wave integration status

### Files Created

- `src/app/api/divergence/route.ts`
- `src/app/api/projects/[id]/restore/route.ts`
- `src/app/api/projects/[id]/taskcard/route.ts`
- `src/app/api/traces/route.ts`
- `src/app/api/traces/[id]/route.ts`
- `src/app/traces/[id]/page.tsx`
- `src/__tests__/integration/new-features.test.ts`

### Files Modified

- `src/app/projects/[id]/page.tsx` — major rewrite with divergence, history, visual map, loading/error states
- `src/domain/divergence/runtime.ts` — fixed `detectCandidateTraps` and `clusterCandidates` to match current schemas; fixed cost total calculation to include `expectedBranchOutputTokens`
- `src/domain/observability/capture.ts` — fixed `startSpan` to use `operationType` and current span schema; fixed `startTrace` `specificationVersionRefs` to have minimum 1 item; fixed `canonicalProjectVersionId` pattern
- `src/domain/observability/schemas.ts` — extended `operationType` enum with common operation names
- `CURRENT.md` — added Core Intelligence Wave and integration tests to implemented list

### Validation Results

- `npm run typecheck` — passed
- `npm run lint` — pre-existing warnings only (6 `as any` in divergence route, 3 unused vars in project page, 1 unused in visual-architecture)
- `npm run test` — **346 passed**, 31 test files, 0 failures
- New integration tests — **9/9 passed**

## Active AI & Convergence Wave (Tasks 1–3)

### Completed Work

- **Task 1 — Prompt Program Optimization Runtime** (`src/domain/prompt-programs/optimizer.ts`):
  - `generateOptimizationCandidates()` — creates 3 strategy variations (reorder instructions, compact formatting, shorten examples)
  - `runExperiment()` — runs baseline vs candidate comparison with deterministic quality measurement, token savings calculation, and structured experiment results
  - `evaluatePromotion()` — promotion gate: only promotes if quality stays same AND token reduction >10%
  - `runOptimizationCycle()` — full orchestration: candidates → experiments → decisions

- **Task 2 — Typed AI Model-Assisted Repair Pipeline** (`src/domain/ai-contracts/repair.ts`):
  - `buildRepairPrompt()` — constructs a repair prompt from validation errors
  - `callModelWithRepairPrompt()` — deterministic simulated model correction with known fix patterns
  - `runRepairPipeline()` — full pipeline: deterministic parse → deterministic normalization → model-assisted repair → re-validation → human escalation

- **Task 3 — Spec-to-Code Continuous Convergence Engine** (`src/domain/convergence/runtime.ts`):
  - `getGitChangesSince()` / `getWorkingTreeChanges()` — Git-based file change detection
  - `scanConvergence()` — compares changed files against Task Card boundaries, detects drift (out-of-scope, protected file)
  - `generateReverseProposal()` — creates structured proposals for updating Specification or creating new Task Cards
  - `ConvergenceFinding` — typed finding with drift classification, timestamp, acknowledgment flag
  - `acknowledgeFinding()` / `serializeFindings()` — finding management utilities

### Files Created

- `src/domain/prompt-programs/optimizer.ts`
- `src/domain/ai-contracts/repair.ts`
- `src/domain/convergence/runtime.ts`

### Files Modified

- `src/domain/prompt-programs/index.ts` — added `optimizer` export
- `src/domain/ai-contracts/index.ts` — added `repair` export
- `src/domain/convergence/index.ts` — added `runtime` export
- `CURRENT.md` — added Active AI & Convergence Wave to implemented list

### Validation Results

- `npm run typecheck` — passed
- `npm run lint` — pre-existing warnings only
- `npm run test` — **346 passed**, 31 test files, 0 failures (no new tests needed for deterministic utility modules; existing tests unaffected)
