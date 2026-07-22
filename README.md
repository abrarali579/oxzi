# OXZI

OXZI turns a plain-language project idea, existing brief, or complete master prompt into a structured, AI-ready project operating system.

Phase 1 established the locked product and architecture contracts. Phase 2 application implementation uses Next.js, strict TypeScript, and Tailwind CSS.

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
```

## Agent Start

1. Read `AGENTS.md`.
2. Follow `CODEX_LOCAL_SETUP.md`.
3. Keep the six living files inside `context/`.
4. Use `specs/` as the implementation contract.
5. Update `context/06-progress-tracker.md` after each completed unit.

## Package Contents

- `AGENTS.md` — universal agent entry point and repository operating rules
- `OXZI.md` — concise product manifesto
- `context/` — six living project context files
- `specs/01-canonical-project-schema.md` — structured source-of-truth model
- `specs/02-discovery-engine.md` — minimal interview and skip logic
- `specs/03-six-file-rendering-contract.md` — deterministic generation rules
- `examples/` — Oxzire 3D Website and News Automation validation fixtures
- `CODEX_LOCAL_SETUP.md` — local VS Code and Codex instructions

## Project Status

Phase 1 is complete. Phase 2 application bootstrap is complete; see `context/06-progress-tracker.md` for the current implementation state.
