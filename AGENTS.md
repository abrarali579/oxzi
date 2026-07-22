# AGENTS.md — OXZI Operating Map

Read before planning, editing, or running work.

## Default Startup

1. Read `AGENTS.md`.
2. Read `CURRENT.md` for the concise implementation state.
3. Read the active Task Card or explicit user request.
4. Read `context/00-context-map.md` to route the task.
5. Read relevant authoritative sections, source files, and tests.
6. Follow justified dependencies and consumers.

Do not load the repository or Project Bible by default. Read task scope and justified dependency closure. Never skip a relevant dependency to save tokens. Record why scope widened; when context is uncertain, widen rather than guess.

Full reads require cross-cutting audit/refactor, roadmap reconciliation, source migration, global policy change, user request, or unresolved sufficiency.

## Source-of-Truth Priority

1. Latest explicit user instruction
2. Canonical state for product facts
3. Accepted `DECISIONS.md` ADRs
4. Relevant specifications, then context files
5. `CURRENT.md` resume view
6. `context/00-context-map.md` index
7. Existing implementation, then labeled assumptions

Generated Markdown, graphs, context packs, Task Cards, prompts, and diagrams are derived; they cannot mutate canonical state. Report material conflicts and recommend the smallest safe resolution.

## Operating Rules

- Never ask for information already available in task context.
- Never guess critical product, architecture, security, or approval behavior.
- Preserve minimal discovery and Master Prompt interview skipping.
- Quality, safety, correctness, and mandatory coverage outrank token reduction.
- Work in one verifiable unit; do not enter later phases without authorization.
- Before editing, state the unit, files, boundaries, and conflicts.
- Do not silently change approved scope, architecture, security, or visual direction.
- Keep code, documentation, `CURRENT.md`, and progress synchronized.
- Record decisions or changed assumptions authoritatively.
- Never expose or commit secrets, private data, local databases, or generated review evidence.
- Keep output concise while preserving exact errors and security findings.

## Validation, Approval, and Handoff

- Run relevant checks and report actual results; never claim an unrun check passed.
- For code/tooling, use `npm run ci` when available and `npm run review` at completion.
- Never commit or push unless the user explicitly requests it.
- External delivery, destructive actions, and protected architecture changes require authorization.
- Keep `main` buildable; preserve unrelated worktree changes.
- After every completed unit, update `CURRENT.md` and `context/06-progress-tracker.md`.
- Commit only `.review/.gitkeep` by default; `.review/` reports are local generated evidence.

Completion reporting must include changed files, actual validation results, warnings or unresolved risks, deferred work, the next smallest unit, and a recommended commit message.

## Current Boundary

Use `CURRENT.md` for implemented versus specified work. Do not implement later compilers, product UI, persistence, providers, or SaaS infrastructure unless the active user-approved unit requires them.
