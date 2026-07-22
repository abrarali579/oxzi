# OXZI — Token Efficiency and Token Ledger Specification

## Status and Scope

**Status:** Binding policy approved; Token Ledger, compression, provider billing, and adaptive session automation are not implemented.

This specification records the cross-cutting efficiency contract used by the future Context Compiler, Task Card compiler, agent routing, tools, sessions, and evaluation. It incorporates the approved lessons independently; external utilities are neither runtime dependencies nor sources of truth.

## Quality-First Principles

1. Product quality, safety, correctness, and required context coverage always outrank token reduction.
2. OXZI optimizes for the smallest sufficient context, never the smallest possible context.
3. Optimization accounts for its own instructions, tooling, calls, summaries, handoffs, latency, and rework. It is skipped when likely net-negative.
4. Input-context savings, output savings, cache savings, and net total savings are distinct metrics.
5. Output reduction is never presented as total-session reduction.
6. Character and word estimates are labeled estimates. Exact counts require the selected target tokenizer.
7. Small or already concise tasks may follow a recorded no-optimization path.
8. Compression removes redundancy, filler, irrelevant history, and repeated explanation—not unique meaning.
9. Critical decisions, security invariants, blocking conflicts, direct dependencies, acceptance criteria, and required tests are mandatory context.
10. Uncertain sufficiency automatically widens context.
11. A budget below the minimum safe package returns an explicit insufficiency result, never silent truncation.
12. Evaluation combines token/cost measures with completion quality and rework measures.

## Query-First Context Acquisition

The future compiler must:

1. Select explicit task seeds without loading the full Project Bible or repository.
2. Query the validated Knowledge Graph.
3. Traverse task-relevant dependencies, blockers, accepted decisions, security invariants, tests, and documentation.
4. Read raw files only when graph evidence, missing traceability, or task execution justifies them.
5. Preserve every task seed under every result cap.
6. Suppress generic high-degree hubs unless expansion is explicitly justified.
7. Record each scope expansion reason.
8. Use the rule “Read only task scope and justified dependency closure,” never “Do not read any other file.”

Every bounded acquisition result exposes:

- `truncated`
- `reason` or ordered `reasons`
- `omitted_node_count`
- `omitted_categories`
- `mandatory_coverage_status`
- `minimum_safe_token_estimate` with measurement status

## Root Agent Instruction Maps

Root agent files are concise navigation and safety maps; detailed product architecture belongs in context and specifications. Their target is 500–1,000 estimated tokens. Tooling should warn above 1,500 estimated tokens. These thresholds are guidance and never permission to remove required safety, source-of-truth, validation, or handoff semantics. A material reduction must be previewed and checked for semantic preservation.

Agent maps point to task-specific context. Repository-wide reading may still be explicitly required for architecture audits or cross-cutting units.

## Adaptive Session Hygiene Direction

This policy is specified but not automated in the current unit:

- Start a new task or session when the project or topic changes materially.
- Put one coherent implementation unit in one Task Card.
- Do not combine unrelated work merely to reduce message count.
- Prefer prompt revision or version regeneration to repeated corrective messages when supported.
- Prefer plan-first for high-risk or cross-cutting work; allow direct execution for low-risk mechanical work.
- Monitor context use only where the target agent exposes it.
- Recommend compaction before critical context pressure using configurable thresholds.
- Compact to current state, strict boundaries, open blockers, active decision, next action, and stable references.
- Read cache behavior from dynamic provider/agent profiles.
- Do not hardcode a universal five-minute cache rule or off-peak-hour assumption.

## Tool and MCP Efficiency

- Include or activate only task-relevant tools and MCP servers.
- Do not assume every MCP is inefficient.
- Prefer a CLI when it provides equivalent behavior at lower catalog and invocation overhead.
- Prefer MCP when structured semantics, authorization, or integration value justifies its catalog overhead.
- Track tool/MCP schema tokens separately from task context.
- Cap, filter, paginate, or summarize verbose outputs.
- Preserve exact decisive errors, paths, identifiers, commands, and security findings.
- Do not compress structured tool payloads or results unless a transformation contract proves semantic safety.
- Store large raw logs as artifacts and provide a concise referenced summary.
- Stop or ask when repeated tool calls indicate a loop.

## Agent and Sub-Agent Routing Profiles

No fixed sub-agent cost multiplier or permanent branded-model rule is valid. Routing estimates fresh-context, static-instruction, handoff, and reintegration overhead. Sub-agents are appropriate when context isolation, safe parallelism, specialization, or a cheaper capable model creates net value; trivial answers remain single-agent work.

Supported bounded specialist contracts are:

- `investigator` — read-only evidence with a bounded finding receipt
- `surgical_builder` — narrow implementation with explicit file boundaries; never broad multi-file work
- `reviewer` — evidence-backed findings without mutation

Configurable capability/cost profiles cover planning quality, coding quality, context window, tokenizer, input/output cost, cache behavior, sub-agent support, structured-output support, plan mode, session reset/compaction, and MCP support.

## Future Token Ledger

The ledger tracks each category independently:

- static agent instructions
- task prompt
- retrieved project context
- conversation history
- tool/MCP schemas
- tool outputs
- sub-agent inputs
- sub-agent outputs
- main-agent output
- cache writes
- cache reads
- retries
- repair/rework turns
- task-filtered Constitution context
- workflow-policy selection and skill-registry lookup
- activated skill instructions
- Execution Passport input
- Execution Passport certification and adapter translation
- compliance-review, quality-review, and validation-pass overhead
- convergence-analysis overhead and artifact retrieval
- prompt assertion, certification, red-team, and benchmark overhead
- divergent branch repeated context and output
- critic, clustering, trap-detection, and deepening overhead
- Prompt Program selection, example retrieval, candidate generation, and experiment overhead
- typed-output parsing, normalization, repair, retry, and escalation overhead
- trace/tool/repository observability schemas and captured outputs
- repository parsing, structural query/rule evaluation, and incremental refresh overhead
- skill-surface auditing and self-diagnostic recovery overhead

Every value has one status:

- `measured`
- `tokenizer-estimated`
- `character-estimated`
- `unavailable`

Formulas:

```text
gross_savings = baseline estimated tokens - optimized tokens
optimization_overhead = extra rules + graph queries + compression calls + summaries + agent handoffs
net_savings = gross_savings - optimization_overhead
```

The ledger keeps input, output, cache, and total values separate. A mixed-status total inherits the least-confident contributing status and cannot be presented as measured.

## Honest Evaluation

Future evaluation compares:

1. Baseline agent behavior
2. Concise-output-only behavior
3. Graph/context optimization
4. Full OXZI Task Card workflow

It measures total, input, output, cache reads/writes, successful completion, acceptance-criteria coverage, rework, scope violations, latency, and user rating. It reports no positive success claim when quality regressed, omitted context caused repair, mandatory coverage failed, or measurement confidence is too low.

Workflow, skill, Passport, dual-review, convergence, repair, and adapter overhead is part of total execution cost. It cannot be excluded merely because it occurs outside the main model prompt. Artifact-first handoff may claim input savings only when artifact production, retrieval, access checks, and reintegration costs are included.

Provider billing integration is outside this unit.

## Safe Compression Contract

Future deterministic or provider-assisted compression protects these regions verbatim:

- fenced code and inline code
- commands
- URLs and file paths
- identifiers and API names
- environment variables
- exact errors and versions
- numeric limits
- security invariants
- acceptance-criteria identifiers
- canonical field IDs
- decision IDs and evidence references

Compression must preserve heading/hierarchy where structural meaning depends on it, the canonical fact set, and the mandatory node set. It rejects empty output, rejects a no-op when compression was expected, and rejects output missing a protected region. It never overwrites source-of-truth files, produces only derived artifacts, and retains source/version/hash references.

A narrow preservation failure receives targeted repair only; it does not trigger broad recompression. Cloud compression must obey sensitive-data policy, and a future local-only mode remains required.

No LLM compression is implemented by this specification.

## Acceptance Criteria for Future Implementations

- Mandatory coverage is proven before optimization.
- Optimization overhead is included in net savings.
- All token values expose measurement status.
- Unsafe budgets return explicit insufficiency with a minimum-safe estimate.
- No-optimization behavior is deterministic and testable.
- Protected regions and fact sets survive compression validation.
- Quality failure prevents a positive efficiency claim.
