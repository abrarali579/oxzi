# OXZI — Current State

Compact resume only. Route details through `context/00-context-map.md`.

## Product and Phase

- Phase: v1.0.0 — release-ready. All deterministic engines, internal UI, auth, organizations, database, evaluation lab, benchmarks, and hardening complete.
- Active unit: none
- Last completed: Steps 1–14 — full deterministic pipeline + UI + auth + orgs + evaluation lab + benchmarks + launch hardening
- Next: await further instruction

## Implemented

- Next.js/tooling/CI and hardened Review Engine
- Canonical state, discovery/ranking, extraction, and Temporal Knowledge Graph `2.0.0`
- Deterministic Constitution resolution/compliance, Specification normalization, structural/clarification/consistency/traceability/testability/freshness analysis, categorical health, readiness recommendations, controlled-living validation, and normalized Governance Reports
- Deterministic Technical Plan normalization/governance, dependency-safe Implementation Slice derivation, plan/slice validation, traceability, categorical health, readiness recommendations, immutable version checks, and normalized reports
- Deterministic Task Card compilation from approved Implementation Slices with strict file boundaries, constraints, acceptance criteria, validations, risk classification, and validation reports
- Canonical-only Context Compiler v1 with sufficient-context metadata, inclusion reasons, limitation disclosure, and stable context fingerprints
- Prompt Program Renderer for immutable agent-targeted prompt artifacts over Task Cards and compiled canonical context
- Deterministic Prompt Evaluation and Certification runtime with assertion resolution, section/token/contract evaluation, and certification gate
- Repository Parsing & Structural Intelligence V1 with static AST/regex file traversal, import/export extraction, dependency graph resolution, and strict exclusion patterns
- Code-aware Context Compiler V2 with RepositoryManifest integration, file-content extraction from TaskCard boundaries, first-degree import resolution, and protected-file isolation
- Spec-to-Code Convergence Review runtime with deterministic boundary compliance gates (protected file and out-of-scope detection), approval/rejection certification
- Agent Control Plane with deterministic Execution Passport issuance (CERTIFIED-only gate, tamper-evident signatures, integrity verification)
- Approval-gated Connected Agent Delivery with passport verification, human/system approval gate, and DeliveryTicket generation
- Internal UI & Persistence with file-based JSON project store, CRUD API routes, project list/detail/new pages, six-file ZIP generation, and deterministic serialization
- Authentication & Organizations with JWT-based login/signup, session management, Prisma/SQLite database, organization membership (owner/member roles), protected API middleware, and dashboard UI
- Evaluation Lab & Benchmarks with deterministic metric collection, threshold-based regression detection, baseline comparison, and performance tests for all core engines
- Launch Hardening with rate-limited API middleware, comprehensive env validation, integration tests covering full pipeline, .env.example documentation, and version bump to 1.0.0
- Workflow/execution/evaluation/divergence contract schemas
- Prompt Program/version/example/optimization/promotion contracts
- Typed AI parse/validation/repair/partial-result contracts and known normalization
- Privacy-aware trace/dataset/experiment contracts
- DAILY/LIBRARY skill evidence and self-diagnostic contracts
- Parser/snapshot/file/symbol/query/rule/preview/update contracts and cache helpers
- **Core Intelligence Wave** — AST parsing V2 (oxc-parser), Time Machine (version history API), Visual Architecture (Mermaid diagrams), Divergent Reasoning engine, Observability trace/span capture runtime
- Integration tests for divergence, visual map, history, trace capture, and AST parser features
- **Active AI & Convergence Wave** — Prompt Program Optimization Runtime (candidate generation, deterministic test suite, experiment runner, promotion gate, `npm run optimize` CLI), Typed AI Model-Assisted Repair Pipeline (provider gateway with temperature=0, 2 model-assisted retries, BLOCKED escalation), Spec-to-Code Continuous Convergence Engine (AST-enabled drift detection: overbuilt/missing/architecture drift, Git-based change detection, reverse proposals, UI Drift tab with auto-fix buttons)
- **Production Hardening** — Multi-tenant authorization guards (`requireProjectAccess`, `requireOrganizationAccess`), standardized API response schemas (`{ success, data/error }`), Prisma indexes for frequently queried fields, Zod validation wrappers for DB JSON fields, `SizeBoundaryExceeded` OOM protection on repository parser (5K files / 50MB limits), concurrency stress benchmarks (500 Task Cards / 1,000 AST traversals), tenant isolation tests
- **Step 8 — Code-aware Context Compiler** — Upgraded `codeContextItemSchema` with structural metadata (exports, imports, reason enum), `CompiledContext.sufficiency` refine extended for `codeContext`, `fileNodeMap` integration in code compiler for export/import signatures per code context item
- **Step 9 — Review + Spec-to-Code Convergence Runtime** — Deterministic pipeline: `runSpecToCodeConvergence()` with spec requirement extraction, structural divergence audit (protected file CRITICAL, missing writable/unauthorised WARNING), acceptance criteria verification via export matching, convergence matrix scoring, and CONVERGED/DIVERGED status. New schemas: `divergenceItemSchema`, `convergenceItemSchema`, `convergenceMatrixSchema`, `specToCodeConvergenceReportSchema`. 8 comprehensive tests covering protected file rejection, full convergence, missing files, unauthorised files, scoring, and missing exports.
## Specified, Runtime Deferred

- Constitution canonical storage
- Prompt registries/optimization, AI/provider repair, traces/experiments
- Skill auditor/router/diagnostics; divergence, review/convergence; billing (stripe integration placeholder), real-time multiplayer (deferred to next iteration)

## Boundaries

- Canonical state alone is approved truth; graphs, prompts, traces, AI results, structural matches, and ideas are derived evidence/proposals.
- Task meaning is separate from Prompt Programs/rendering; typed validation precedes trust.
- Repository evidence is adapter-based and structural detection never grants rewrite permission.
- Technical Plan Runtime and Implementation Slice Runtime stay separate implementation units.
- Internal Product UI may begin after the core deterministic pipeline is stable; auth, billing, teams, and multiplayer are later SaaS scope.
- Quality/safety/correctness/coverage/evidence outrank efficiency.
- Never commit/push or expose secrets/generated review evidence without authorization.

Full checks: `npm run ci`, `npm run review`, `git diff --check`.
History: `context/06-progress-tracker.md`; decisions: `DECISIONS.md`; contracts: `specs/`.
