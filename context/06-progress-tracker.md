# OXZI — Progress Tracker

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

Phase 3 — Core Deterministic Intelligence

### Implemented

1. Canonical schema and fixtures
2. Deterministic completeness and critical-question ranking
3. Deterministic natural-language extraction proposals
4. Deterministic extraction hardening

### Approved and Specified, Not Implemented

1. Phase 3: Knowledge Graph foundation
2. Phase 4: six-file deterministic renderer
3. Phase 4: Token-Saving Context Compiler
4. Phase 4: context version/diff packs
5. Phase 4: Visual Master Architecture Generator
6. Phase 5: Review/Audit Analyzer
7. Phase 5: normalized AI Task Card
8. Phase 5: prompt style renderers
9. Phase 5: agent handoff/export
10. Phase 6: project intake, minimal interview, understanding review, graph/architecture workspace, Task Card review, settings/defaults, and exports

### Deferred

1. Phase 5: optional connected-agent delivery after explicit approval
2. Phase 7: authentication/workspaces, persistence/version storage, provider gateway, jobs/storage, and permissions/security
3. Phase 8: both validation projects end to end, security/performance/accessibility validation, deployment, and launch readiness
4. Prompt Performance Dataset telemetry and any consented optimization pipeline

## Open Decisions for Later

- Prisma versus Drizzle
- Exact cloud model providers available at launch
- Billing provider and pricing plans
- Final OXZI brand identity
- Deployment domain
- Dedicated canonical temporal-scope representation versus the current visible out-of-scope markers
- Exact repository-evidence ingestion policy for graph file/module/test nodes

These decisions do not block the current canonical-domain or discovery-foundation work.

## Session Resume Context

The next smallest unit is the Phase 3 Knowledge Graph Foundation: implement the deterministic, provider-neutral typed graph projection and traversal contracts in `specs/05-knowledge-graph-engine.md`. No blocking prerequisite was found. Validated canonical mutation remains deferred until a unit explicitly returns to that boundary.
