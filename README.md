# OXZI

OXZI turns a plain-language project idea, existing brief, or complete master prompt into a structured, AI-ready project operating system.

Phase 1 established the locked product and architecture contracts. Phase 2 established the application and developer-tooling foundation. Phase 3 implements the canonical project domain in strict TypeScript and Zod.

## Local Development

Requirements:

- Node.js 20.9 or newer
- npm

Install dependencies and start the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Available commands:

```bash
npm run dev        # Start the development server
npm run build      # Create a production build
npm run start      # Serve the production build
npm run lint       # Run ESLint
npm run typecheck  # Check TypeScript without emitting files
npm run format     # Format supported project files with Prettier
npm run format:check # Verify formatting without changing files
npm run test       # Run application tests once with Vitest
npm run test:watch # Run application tests in watch mode
npm run test:review # Run focused Review Engine tests
npm run ci         # Run the complete local CI validation sequence
```

### Environment variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Required variables:

- `DATABASE_URL` — SQLite database path (default: `file:./prisma/oxzi.db`)
- `JWT_SECRET` — secret key for JWT token signing (change in production)
- `NEXT_PUBLIC_APP_URL` — canonical public application URL (optional)

### Authentication

OXZI uses JWT-based authentication with bcrypt password hashing. Users sign up and log in via `/auth/signup` and `/auth/login`. After authentication, users belong to organizations with owner/member roles. Projects are scoped to organizations. Session tokens expire after 7 days.

### Database

The Prisma ORM manages a SQLite database at `prisma/oxzi.db`. To reset or reinitialize:

```bash
npx prisma db push --accept-data-loss
```

## Continuous Integration

`.github/workflows/ci.yml` runs on pushes and pull requests using Node.js 24. It performs:

1. `npm ci`
2. `npm run format:check`
3. `npm run typecheck`
4. `npm run lint`
5. `npm run test`
6. `npm run test:review`
7. `npm run build`

Run `npm run ci` for the same validation sequence locally after dependencies are installed.

## Canonical Project Domain

The public project-domain API is exported from `src/domain/project`. It includes branded identifiers, Zod schemas, canonical project types, deterministic serialization, and the two approved validation fixtures.

```ts
import {
  parseCanonicalProject,
  serializeCanonicalProject,
  type CanonicalProject,
} from "@/domain/project";
```

`parseCanonicalProject()` validates untrusted input and returns JSON-safe canonical state. `serializeCanonicalProject()` validates first and then emits stable, recursively key-sorted JSON. Stored state uses strings for ISO timestamps and contains no functions, `Date` instances, or classes.

## Discovery Decision Engine

The provider-neutral decision engine is exported from `src/domain/discovery`:

```ts
import { analyzeDiscovery } from "@/domain/discovery";

const analysis = analyzeDiscovery(canonicalProject);
```

The result contains field relevance and resolution assessments, critical/overall/section completeness, blocker and conflict counts, visible safe defaults, the interview-skip decision, all ranked candidates, and the budgeted question list. Every ranking candidate includes its complete score-factor breakdown. The engine performs no LLM calls, prompts, persistence, or state mutation.

Completeness uses explicit field weights: blocking `100`, high `70`, medium `35`, and low `10`. Approved, confirmed, permitted accepted-assumption, and permitted safe-default values receive full credit. Unapproved inference receives at most half credit, unsafe defaults receive `0.75`, and missing or conflicted fields receive none. ADR-010 records the full deterministic ranking formula and interview limits.

## Deterministic Extraction Engine

Rule-based extraction is exported from `src/domain/extraction`:

```ts
import { extractCanonicalUpdates } from "@/domain/extraction";

const result = extractCanonicalUpdates({
  sources: [
    {
      sourceId: "source_brief",
      kind: "master_prompt",
      content: projectBrief,
      capturedAt: "2026-07-22T12:00:00.000Z",
    },
  ],
  existingProject,
});
```

The engine accepts plain text, Master Prompts, uploaded notes, and previous AI conversations. It emits only Zod-validated canonical update proposals with confidence, evidence, source metadata, rule explanations, and explicit/inferred status. Reviewed rules cover English, Bahasa Indonesia, Roman Urdu, mixed-language and sectionless descriptions, common aliases, negative constraints, and current/deferred/out-of-scope/undecided scope markers. It merges exact duplicates, reports contradictions, redacts credential-shaped retained content, and marks every proposal targeting an approved field as blocked. It does not mutate state or call an LLM.

See `specs/04-deterministic-extraction-engine.md` for supported fields, confidence rules, and current vocabulary limitations.

## Local Review Package

Generate an auditable handoff for another reviewer:

```bash
npm run review
```

The command records the current branch and latest commit, captures working-tree changes and a sanitized diff, and runs type checking, linting, and the production build. It writes:

- `.review/summary.md`
- `.review/changed-files.md`
- `.review/validation-results.md`
- `.review/architecture-impact.md`
- `.review/codex-report.md`
- `.review/git.diff`

Generated review outputs are local and ignored by Git. Commit only `.review/.gitkeep`.

### Comparison behavior

- Normal repositories compare the latest commit plus staged, unstaged, and safe untracked changes against `HEAD~1`.
- A root-commit repository compares against Git's empty tree and labels that base explicitly.
- An unborn repository generates a package from safe working-tree files, states that no commit exists, and does not fail merely because the repository has no commit.

### Exclusions and redaction

- `.env` files, local credentials, private keys, local databases, `node_modules`, `.next`, and generated `.review` outputs are excluded.
- Cookie, Set-Cookie, Authorization, common credential fields, recognized provider tokens, private keys, and credential-key high-entropy values are redacted from diffs, metadata, and validation output.
- Lockfiles are never copied into the raw diff. Reports include only the filename, added/removed line counts, and whether the lockfile changed.
- Ordinary commit SHAs, UUIDs, integrity hashes, and harmless identifiers are preserved.

Redaction is defense in depth, not permission to commit secrets. Novel secret formats can evade heuristic detection, so repository policy must remain the primary protection.

### Exit behavior

All three validation commands are attempted when safe. Their exit codes, signals, spawn errors, and timeout details are written to `validation-results.md`.

`npm run review` exits nonzero when any validation fails, recursion is detected, a recognized secret remains after sanitization, or package generation is incomplete. Validation failures still produce the safest complete review package possible. Fatal Git or filesystem failures can prevent package completion and also exit nonzero.

An environment guard and `.review/.active-run` sentinel block indirect recursion. The sentinel is removed after success, failure, timeout, and handled interruption. An uncatchable termination such as `SIGKILL` can leave a stale sentinel; after confirming no review is running, remove `.review/.active-run` manually.

### Platform requirements

- Node.js 20.9 or newer, npm, and Git are required.
- macOS is supported without GNU-only shell utilities.
- Windows path handling uses `npm.cmd` and `NUL`, but Windows execution is not yet verified in CI.
- Validation commands have a ten-minute timeout and captured output is bounded.

Run the focused generator tests with:

```bash
npm run test:review
```

## Agent Start

1. Read `AGENTS.md`.
2. Read `CURRENT.md`.
3. Read the active Task Card or explicit user task.
4. Use `context/00-context-map.md` to select relevant authoritative context.
5. Read affected source files, tests, and justified dependency closure.

Do not load the full Project Bible by default, and do not skip relevant dependencies to save tokens. Follow `CODEX_LOCAL_SETUP.md` for local handoff guidance. Update `CURRENT.md` and `context/06-progress-tracker.md` after each completed unit.

## Package Contents

- `AGENTS.md` — universal agent entry point and repository operating rules
- `CURRENT.md` — compact current-state resume view
- `PROJECT.md` — concise product, phase, stack, and scope briefing
- `DECISIONS.md` — formal accepted-decision register
- `OXZI.md` — concise product manifesto
- `context/00-context-map.md` — task-oriented navigation index
- `context/` — six living project context files plus the navigation map
- `specs/01-canonical-project-schema.md` — structured source-of-truth model
- `specs/02-discovery-engine.md` — minimal interview and skip logic
- `specs/03-six-file-rendering-contract.md` — deterministic generation rules
- `specs/04-deterministic-extraction-engine.md` — rule-based intake normalization and conflict policy
- `specs/05-knowledge-graph-engine.md` — future derived graph and traversal contract
- `specs/06-context-compiler.md` — future Token-Saving Context Compiler contract
- `specs/07-ai-task-card-prompt-compiler.md` — future normalized Task Card and style-renderer contract
- `specs/08-review-audit-analyzer.md` — future evidence-backed next-action classification
- `specs/09-visual-master-architecture-generator.md` — future graph-derived visual view contract
- `examples/` — Oxzire 3D Website and News Automation validation fixtures
- `CODEX_LOCAL_SETUP.md` — local VS Code and Codex instructions

## Project Status

Version `1.0.0`. Steps 1–13 of the authoritative V1 implementation sequence are complete. The core deterministic pipeline (extraction, discovery, governance, planning, Task Card compilation, context compilation, prompt rendering, evaluation, certification, repository parsing, convergence review, agent control plane, delivery) is fully implemented. Auth, organizations, database persistence, internal UI, and API routes are operational.

Step 14 (current) adds launch hardening: rate limiting, environment validation, performance benchmarks, evaluation lab, and integration tests.

Deferred: Stripe billing, real-time multiplayer, Prompt Program optimization, AI provider repair, full observability/experiments UI.

See `CURRENT.md` for the complete implementation status.

Phases 1 and 2 are complete. Phase 3 deterministic intelligence is in progress; future architecture capabilities are specified but not implemented. See `context/06-progress-tracker.md` for the current implementation state.
