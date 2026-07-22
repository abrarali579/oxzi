# OXZI Local Setup — VS Code + Codex

## 1. Create a Local Folder

macOS/Linux:

```bash
mkdir -p ~/Projects/oxzi
cd ~/Projects/oxzi
```

Windows PowerShell:

```powershell
mkdir $HOME\Projects\oxzi
cd $HOME\Projects\oxzi
```

## 2. Extract the ZIP Directly Here

After extraction, the local root must look like:

```text
oxzi/
├── AGENTS.md
├── CURRENT.md
├── PROJECT.md
├── DECISIONS.md
├── OXZI.md
├── README.md
├── CODEX_LOCAL_SETUP.md
├── context/
│   ├── 00-context-map.md
│   ├── 01-project-overview.md
│   ├── 02-architecture.md
│   ├── 03-ui-visual-context.md
│   ├── 04-code-standards.md
│   ├── 05-ai-workflow-rules.md
│   └── 06-progress-tracker.md
├── specs/
└── examples/
```

Avoid an accidental structure such as `oxzi/OXZI_Phase_1_AGENTS/...`. Move the inner files to the actual repository root if necessary.

## 3. Open the Repository in VS Code

```bash
code ~/Projects/oxzi
```

Open Codex in this workspace. Because `AGENTS.md` is at the repository root, any compatible coding agent can discover the operating instructions and route to task-relevant context.

Use this reading order in every session:

1. `AGENTS.md`
2. `CURRENT.md`
3. Active task or Task Card
4. `context/00-context-map.md`
5. Relevant authoritative sections, source files, tests, and justified dependencies

## 4. Initialize Git Before Coding

```bash
git init
git add .
git commit -m "docs: establish OXZI phase 1 foundation"
```

## 5. First Prompt for Codex

Paste this once after opening the folder:

```text
Read AGENTS.md and CURRENT.md, then use context/00-context-map.md to select the authoritative context, source files, tests, and dependency closure relevant to this task. Follow AGENTS.md exactly and widen context rather than guess when sufficiency is uncertain.

Do not modify files yet. First:
1. Summarize the current implementation state relevant to the task.
2. Confirm the requested unit and strict boundaries.
3. Identify material conflicts or missing context.
4. List the files and checks the unit would involve.
```

Compare its summary with the package before allowing implementation.

## 6. Current Implementation Handoff

Read `CURRENT.md` for the latest implementation handoff and next approved unit. Use `context/06-progress-tracker.md` only when detailed history or roadmap reconciliation is required. Do not reuse a completed-unit prompt.

## 7. Normal Daily Workflow

For every new task, give Codex one bounded unit, for example:

```text
Follow the required reading order in AGENTS.md. Implement only the requested unit. Run relevant checks and update the progress tracker.
```

Avoid asking it to “build the whole app.” Small units reduce architecture drift and make Git review easier.

## 8. Adding Updated Context Later

When ChatGPT produces an updated context package:

1. Back up or commit the current repository.
2. Extract the new package into a temporary folder.
3. Compare changes using VS Code Source Control or:

```bash
git diff --no-index ./context /path/to/new/context
```

4. Merge approved context/spec changes.
5. Ask Codex to repeat the required reading order from `AGENTS.md` before continuing.

Do not paste all six files into Codex chat repeatedly. Keep the approved versions inside the repository.

## 9. Recommended Responsibility Split

- ChatGPT: product leadership, architecture, UX direction, major decisions, and context-package revisions.
- Codex in VS Code: repository edits, implementation, terminal commands, tests, debugging, and progress updates.
