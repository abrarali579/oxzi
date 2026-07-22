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
├── OXZI.md
├── README.md
├── CODEX_LOCAL_SETUP.md
├── context/
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

Open Codex in this workspace. Because `AGENTS.md` is at the repository root, any compatible coding agent can discover the operating instructions and then follow the linked context files.

## 4. Initialize Git Before Coding

```bash
git init
git add .
git commit -m "docs: establish OXZI phase 1 foundation"
```

## 5. First Prompt for Codex

Paste this once after opening the folder:

```text
Read the root AGENTS.md and follow it exactly. Then read all required context and specs in the stated order.

Do not modify files yet. First:
1. Summarize the locked OXZI Phase 1 decisions.
2. Confirm the current repository boundary.
3. Identify conflicts, missing files, or unclear instructions.
4. Propose the smallest Phase 2 implementation unit.
5. List the files and checks that unit would involve.
```

Compare its summary with the package before allowing implementation.

## 6. Phase 2 Unit 1 Prompt

After the summary is correct, paste:

```text
Execute Phase 2, Unit 1 only: bootstrap a production-quality Next.js TypeScript application in this repository.

Requirements:
- Follow AGENTS.md and all context/spec files.
- Preserve every existing documentation file.
- Use Next.js App Router and strict TypeScript.
- Configure linting, formatting, environment validation, and a test runner.
- Create the agreed source-folder structure without fake business logic.
- Do not add authentication, database, billing, or real AI providers yet.
- Add or update local development commands in README.md.
- Run all available checks.
- Update context/06-progress-tracker.md with changed files, check results, unresolved issues, and the next smallest unit.
```

## 7. Normal Daily Workflow

For every new task, give Codex one bounded unit, for example:

```text
Follow AGENTS.md. Implement only the project-input parsing domain described in the specs. Do not build the interview UI yet. Run relevant tests and update the progress tracker.
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
5. Ask Codex to re-read `AGENTS.md` and the changed files before continuing.

Do not paste all six files into Codex chat repeatedly. Keep the approved versions inside the repository.

## 9. Recommended Responsibility Split

- ChatGPT: product leadership, architecture, UX direction, major decisions, and context-package revisions.
- Codex in VS Code: repository edits, implementation, terminal commands, tests, debugging, and progress updates.
