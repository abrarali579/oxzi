# OXZI — Progress Tracker

## Current Phase

Phase 2 — Repository Bootstrap and UX Prototype: In Progress

## Current Goal

Establish a production-quality application foundation before implementing the canonical project schema and product workflows.

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

## Next Phase

Phase 2 — Repository Bootstrap and UX Prototype

Recommended first implementation units:

1. Initialize Next.js TypeScript project. — Complete
2. Add formatting, test runner, and environment validation.
3. Add the local review-engine foundation. — Complete
4. Implement canonical Zod schemas and fixtures.
5. Implement deterministic completeness scoring and question ranking.
6. Build static New Project and Understanding Review flows.
7. Add mocked zero-question and minimal-question scenarios.

## Open Decisions for Later

- Prisma versus Drizzle
- Exact cloud model providers available at launch
- Billing provider and pricing plans
- Final OXZI brand identity
- Deployment domain

These decisions do not block Phase 2 bootstrap.

## Session Resume Context

The next smallest unit is the deferred Phase 2 Unit 2: add formatting, a project-wide test command, and environment validation without implementing product-domain logic. After that, read `specs/01-canonical-project-schema.md` and implement runtime Zod schemas as Unit 4 before connecting a real AI provider. Use fixtures for the Oxzire 3D Website and News Automation validation projects.
