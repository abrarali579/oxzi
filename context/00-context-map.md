# OXZI — Context Map

Route from the task; follow dependencies and record widening.

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
| Specs/plans/slices/convergence | `specs/13-controlled-specifications-convergence.md`; `src/domain/planning/` |
| Workflow/skills/repair | `specs/14-workflow-policy-skill-registry.md` |
| Passport/artifacts/ledger/adapters | `specs/15-execution-passport.md` |
| Temporal memory/Episodes | `specs/16-temporal-project-memory.md`; `src/domain/knowledge-graph/` |
| Repository parse/search/rules | `specs/17-*`, `specs/25-*`; `src/domain/repository-intelligence/` |
| Agent control/traces/experiments | `specs/18-*`, `specs/23-*`; `src/domain/execution/`, `observability/` |
| Prompt evaluation/programs/typed AI | `specs/19-*`, `specs/21-*`, `specs/22-*`; corresponding domains |
| Divergent decisions/frames/cost | `specs/20-*`; `src/domain/divergence/` |
| Skill surfaces/diagnostics | `specs/14-*`, `specs/24-*`; `src/domain/workflow/` |
| Decisions | Search `DECISIONS.md` for the relevant ADR |
| Fixtures | Relevant `examples/` file and domain fixture/test |

Search relevant headings/ADRs/symbols first, then read affected code/tests and justified closure. Widen when uncertain; full reads are for cross-cutting audits, migrations, global policy, explicit requests, or unresolved sufficiency. Update this index when routes change.
