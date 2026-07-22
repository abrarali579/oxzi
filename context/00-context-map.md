# OXZI — Context Map

Navigation only. Start from the task, follow direct dependencies, and record why context widens.

| Task area | Read next |
|---|---|
| Scope/roadmap | `PROJECT.md`; relevant `context/01-project-overview.md` |
| Architecture/security/data | `context/02-architecture.md`; relevant ADR |
| UI/accessibility/visuals | `context/03-ui-visual-context.md` |
| Engineering/tests | `context/04-code-standards.md`; affected code/tests |
| Agent workflow/handoff | `context/05-ai-workflow-rules.md`; relevant specs |
| Current status | `CURRENT.md`; history in `context/06-progress-tracker.md` |
| Canonical state | `specs/01-canonical-project-schema.md`; `src/domain/project/` |
| Discovery/ranking | `specs/02-discovery-engine.md`; `src/domain/discovery/` |
| Six files | `specs/03-six-file-rendering-contract.md` |
| Extraction | `specs/04-deterministic-extraction-engine.md`; `src/domain/extraction/` |
| Knowledge Graph | `specs/05-knowledge-graph-engine.md`; `src/domain/knowledge-graph/` |
| Context/efficiency | `specs/06-context-compiler.md`; `specs/10-efficiency-ledger.md` |
| Task Cards/renderers | `specs/07-ai-task-card-prompt-compiler.md` |
| Review/audit | `specs/08-review-audit-analyzer.md`; `.review/` contract |
| Visual architecture | `specs/09-visual-master-architecture-generator.md` |
| Constitution/health | `specs/11-project-constitution.md`; `specs/12-specification-health-engine.md` |
| Specs/plans/slices/convergence | `specs/13-controlled-specifications-convergence.md` |
| Workflow/skills/repair | `specs/14-workflow-policy-skill-registry.md` |
| Passport/artifacts/ledger/adapters | `specs/15-execution-passport.md` |
| Temporal memory/Episodes | `specs/16-temporal-project-memory.md`; `src/domain/knowledge-graph/` |
| Repository evidence/retrieval | `specs/17-repository-intelligence.md` |
| Agent control/evidence/evaluation | `specs/18-agent-control-evidence-evaluation.md`; `src/domain/execution/` |
| Decisions | Search `DECISIONS.md` for the relevant ADR |
| Fixtures | Relevant `examples/` file and domain fixture/test |

## Reading Rules

- Read the task, then search headings, ADRs, symbols, paths, and tests.
- Read affected code/tests and justified dependency/consumer closure.
- Do not load the whole repository or Project Bible by default.
- Never skip relevant context to save tokens; widen when uncertain and record why.
- Full reads are justified for cross-cutting audits/refactors, roadmap reconciliation, source migration, global policy changes, explicit requests, or unresolved sufficiency.

Update when an authoritative domain, specification, or route changes.
