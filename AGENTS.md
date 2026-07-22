# AGENTS.md — OXZI Agent Operating Guide

This repository contains the source of truth for OXZI. Any coding agent working in this repository must follow this file before planning, editing, or running implementation work.

## 1. Required Reading Order

Before making changes, read:

1. `context/01-project-overview.md`
2. `specs/01-canonical-project-schema.md`
3. `specs/02-discovery-engine.md`
4. `context/02-architecture.md`
5. `context/03-ui-visual-context.md`
6. `context/04-code-standards.md`
7. `context/05-ai-workflow-rules.md`
8. `context/06-progress-tracker.md`
9. Any task-specific file in `specs/` or `examples/`

`OXZI.md` is the concise product manifesto. The six files under `context/` are the living project context. The structured schema and contracts under `specs/` define implementation behavior.

## 2. Source-of-Truth Priority

When information conflicts, use this order:

1. Latest explicit user instruction
2. Approved decision recorded in the project context/specs
3. Canonical project schema and architecture contracts
4. Six living context files
5. Existing implementation
6. Agent assumptions

Do not silently resolve a material conflict. Report it and recommend the smallest safe resolution.

## 3. Mandatory Working Rules

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

## 4. Current Project Boundary

Phase 1 is complete and defines:

- OXZI product purpose and operating principles
- Canonical Project Schema
- Minimal Discovery Engine
- Master Prompt interview-skip logic
- Six-file rendering contract
- Initial architecture and code standards
- Two validation fixtures

Application implementation begins in Phase 2. Do not jump to later SaaS features unless the user explicitly requests them.

## 5. Completion Standard

A task is complete only when:

- Requested behavior is implemented within scope
- Relevant checks/tests have been run
- Failures or limitations are documented honestly
- Context and progress files are updated
- The next smallest implementation unit is identified

## 6. Standard Session Start

At the beginning of a new agent session:

1. Read this file and the required files above.
2. Read the latest entries in `context/06-progress-tracker.md`.
3. Inspect repository status and existing implementation.
4. Summarize current state briefly.
5. Execute only the requested task or propose the smallest next unit.
