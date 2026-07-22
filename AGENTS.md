# AGENTS.md — OXZI Agent Operating Guide

Start here before planning, editing, or running implementation work.

## Required Reading Order

Before making changes, read:

1. `AGENTS.md`
2. `PROJECT.md`
3. `DECISIONS.md`
4. `OXZI.md`
5. All files under `context/` in numerical order
6. Relevant files under `specs/`
7. Relevant files under `examples/`

## Source-of-Truth Priority

When information conflicts, use this order:

1. Latest explicit user instruction
2. Accepted decision recorded in `DECISIONS.md` or the project context/specs
3. Canonical project schema and architecture contracts
4. Six living context files
5. Existing implementation
6. Agent assumptions

Do not silently resolve a material conflict. Report it and recommend the smallest safe resolution.

## Working Rules

- Never ask for information already present in the prompt, imported files, context, or specs.
- Preserve the minimal-interview and Master Prompt skip behavior.
- Do not silently change approved product scope, architecture, security boundaries, or visual direction.
- Work in small, verifiable implementation units.
- Before editing, state the intended unit and affected files.
- After editing, run relevant checks and report actual results.
- Do not claim a test passed unless it was run successfully.
- Keep code, documentation, and progress state synchronized.
- Update `context/06-progress-tracker.md` after every completed unit.
- Record significant architectural decisions or changed assumptions in the appropriate context/spec file.
- Never place secrets, API keys, credentials, or private user data in committed files.
- Do not remove or overwrite context/spec files during framework initialization.

## Git and Handoff Rules

- Never commit or push unless the user explicitly requests it.
- After every implementation unit:
  - update `context/06-progress-tracker.md`
  - report changed files
  - report actual validation results
  - run `npm run review` when the review generator is available
  - provide a recommended commit message
- Treat `.review/` outputs as local generated evidence; commit only `.review/.gitkeep` by default.
- Never commit `.env`, API keys, credentials, tokens, generated secrets, or local database files.
- Keep `main` stable and buildable.

## Current Boundary

Phase 1 is complete and Phase 2 implementation is in progress. Follow `PROJECT.md` for scope and `context/06-progress-tracker.md` for the current unit. Do not jump to later SaaS features unless the user explicitly requests them.

## Completion Standard

A task is complete only when:

- Requested behavior is implemented within scope
- Relevant checks/tests have been run
- Failures or limitations are documented honestly
- Context and progress files are updated
- The next smallest implementation unit is identified

## Session Start

At the beginning of a new agent session:

1. Follow the required reading order above.
2. Inspect repository status and existing implementation.
3. Summarize the current state briefly.
4. State the single requested implementation unit and affected files.
5. Execute only that unit or propose the smallest next unit.
