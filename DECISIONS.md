# OXZI — Decision Register

This file records accepted product and architecture decisions. Accepted decisions cannot be changed silently; a change requires explicit approval and corresponding updates to the relevant context, specification, implementation, and progress records.

## ADR-001 — Canonical Structured State

**Status:** Accepted — Phase 1

**Decision:** The canonical structured project state is the source of truth. User input, imports, interview answers, evidence, assumptions, conflicts, approvals, and execution state are normalized into this schema.

**Consequences:** State changes must use validated mutations. Generated Markdown and UI views cannot directly or silently replace canonical values. Critical values retain evidence, confidence, and approval metadata.

## ADR-002 — Six Generated Living Files

**Status:** Accepted — Phase 1

**Decision:** OXZI generates six living Markdown files from the same canonical state: project overview, architecture, UI/visual context, code standards, AI workflow rules, and progress tracker.

**Consequences:** Renderers share normalized data, duplicated facts remain consistent, and Markdown is a generated view rather than the database. Approved exports cannot contain unresolved placeholders.

## ADR-003 — Minimal Adaptive Discovery

**Status:** Accepted — Phase 1

**Decision:** Discovery is adaptive rather than a fixed questionnaire. OXZI asks only about missing, relevant information whose answer could materially affect scope, architecture, cost, security, timeline, or foundational visual direction.

**Consequences:** Known information is never requested again. Safe, reversible defaults may replace low-impact questions. Typical projects should require no more than five questions, with a hard review boundary after eight.

## ADR-004 — Master Prompt Interview Skipping

**Status:** Accepted — Phase 1

**Decision:** OXZI skips the interview when critical completeness reaches the approved threshold, no blocking gaps or conflicts remain, and all required output can be generated without vague filler.

**Consequences:** A sufficiently complete master prompt can proceed directly to understanding review and generation with zero discovery questions.

## ADR-005 — Cloud and Local Provider Abstraction

**Status:** Accepted — Phase 1

**Decision:** Cloud AI providers and local OpenAI-compatible endpoints connect through one provider-neutral gateway.

**Consequences:** Provider-specific behavior cannot leak into product workflows. Every provider response remains untrusted until validated, and local mode must support generation without sending project content to a cloud provider.

## ADR-006 — Next.js and Strict TypeScript

**Status:** Accepted — Phase 2

**Decision:** The OXZI web application uses the latest stable Next.js release with the App Router, application code under `src/`, and strict TypeScript.

**Consequences:** Server Components are the default, browser-only interaction uses explicit Client Components, and all untrusted boundaries require runtime validation before domain use.

## ADR-007 — npm Package Management

**Status:** Accepted — Phase 2

**Decision:** npm is the repository package manager and `package-lock.json` is the dependency lockfile.

**Consequences:** Development and CI commands use npm scripts, dependency changes update the lockfile, and other package-manager lockfiles are not introduced.

## ADR-008 — Markdown and ZIP Portability

**Status:** Accepted — Phase 1

**Decision:** Users can export readable Markdown folders and ZIP packages that remain useful independently of OXZI.

**Consequences:** Exported project context cannot depend on continued SaaS access. The six-file package remains suitable for coding agents, local folders, and Obsidian-compatible workflows.

## ADR-009 — Canonical Project Runtime Contract

**Status:** Accepted — Phase 3

**Decision:** Canonical project state is validated at runtime with strict Zod schemas and represented with strict TypeScript types under `src/domain/project/`. Stored values are JSON-safe data with branded, prefixed identifiers, ISO timestamp strings, field-level provenance and approval metadata, and stable recursively key-sorted serialization. The `architecture_ready` lifecycle state is formally placed between `understanding_review` and `bible_generated` so the existing readiness invariant has an enforceable transition boundary.

**Consequences:** Untrusted project input must pass `canonicalProjectSchema` or `parseCanonicalProject()` before domain use. Architecture-ready and later states reject unresolved critical fields, blocking conflicts, and high-impact proposed assumptions. Approved versions reject placeholders. Persistence, discovery scoring, mutation APIs, and Markdown rendering remain separate later boundaries.

## ADR-010 — Deterministic Completeness and Question Ranking

**Status:** Accepted — Phase 3

**Decision:** Completeness and discovery-question selection are provider-neutral deterministic domain operations under `src/domain/discovery/`. Relevance is evaluated from project type, lifecycle, field criticality, explicit dependency/activation rules, and safe-default availability. Weight and rule tables are exported and reviewable; AI output cannot set or alter them at runtime.

Completeness field weights are blocking `100`, high `70`, medium `35`, and low `10`. Approved and confirmed fields receive resolution ratio `1.0`. An accepted assumption receives `1.0` only where assumptions are permitted. A permitted safe default receives `1.0` and is reported visibly without mutating canonical state. Unapproved inference receives at most `0.5`, an unsafe default receives `0.75`, and missing or conflicted state receives `0`. Section, critical, and overall completeness are weighted averages rounded to one decimal place.

Question rank is:

```text
criticality weight
× architecture-impact multiplier
× uncertainty multiplier
× lifecycle multiplier
× answerability multiplier
+ downstream dependency bonus
− typing-cost penalty
− conditional-default penalty
```

Architecture multipliers are foundational `1.30`, structural `1.20`, local `1.08`, and cosmetic `1.00`. Missing and conflicted uncertainty multipliers are `1.25` and `1.35`; inference scales from `1.05` to `1.25` as confidence falls, and unsafe defaults use `1.05`. First-relevant-phase questions use `1.15`, later phases `1.05`. Selectable or boolean answers use `1.08`–`1.10`, short text `1.03`, and long text `1.00`. Each relevant downstream dependency adds `5`, capped at `25`. Typing penalties are none `0`, low `4`, medium `10`, and high `18`; an inapplicable conditional default subtracts `12`.

The interview is skipped only when critical completeness is at least `90`, blocking gaps and blocking conflicts are both zero, and no required approval remains. Typical interviews target two to five questions, urgent complex cases are capped at eight, known or safely defaulted values are never asked, and low-criticality details are deferred. Candidates remain one decision per question; related fields are not merged unless a future explicit answer-to-field contract proves that one answer can safely resolve every merged field.

**Consequences:** The same validated canonical state always produces the same scores, ordering, and interview decision. Every candidate exposes its score factors, answer mode, options, and typing effort for auditability. Extraction, natural-language question generation, answer merging, UI, and persistence remain separate later boundaries.

## ADR-011 — Deterministic Extraction Produces Proposals

**Status:** Accepted — Phase 3

**Decision:** The initial natural-language extraction engine is an AI-free deterministic rules boundary under `src/domain/extraction/`. It accepts timestamped plain text, Master Prompts, uploaded notes, and previous AI conversations and emits Zod-validated canonical field-update proposals. It never mutates canonical state directly.

Every proposal carries bounded confidence, canonical evidence, source identity and type, conversation speaker when available, short rule explanations, and explicit or inferred status. User statements are explicit; imported assistant statements are inferred. Identical normalized values merge with unique evidence. Competing scalar or explicitly exclusive values become conflicts. Proposals targeting approved fields are always blocked, including duplicates that require no write.

The extractor uses fixed English, Bahasa Indonesia, Roman Urdu, and mixed-language section aliases, patterns, and reviewed dictionaries. Unmatched or ambiguous language remains unmatched. Source-provided capture timestamps and stable content-derived identifiers preserve deterministic output. Common credential-shaped values are redacted from evidence excerpts without broad entropy-based destruction of harmless identifiers.

**Consequences:** Rule extraction is auditable and usable offline but cannot claim general semantic understanding. The update application/mutation boundary must separately enforce source precedence, approval, versioning, and canonical consistency. LLM-assisted extraction may be added later only behind the same validated proposal contract; it cannot bypass evidence, conflicts, or approved-value protection.

## ADR-012 — Quality-First Token Efficiency

**Status:** Accepted — Architecture Expansion

**Decision:** OXZI optimizes for the smallest sufficient, evidence-backed context, not the smallest possible context. Quality, safety, and correctness outrank token reduction. Critical constraints, security and privacy rules, blocking conflicts, accepted decisions, direct dependencies, required tests, relevant acceptance criteria, and ambiguity warnings cannot be removed merely to meet a token target.

**Consequences:** All context modes share mandatory sufficiency gates. If coverage or relationship confidence is inadequate, the context package widens and reports why. Token counts expose their measurement status, and unsafe custom budgets produce explicit insufficiency with a minimum-safe estimate instead of silent meaning loss.

## ADR-013 — Knowledge Graph as a Derived Typed Projection

**Status:** Accepted — Architecture Expansion

**Decision:** The Knowledge Graph is a deterministic, typed, evidence-backed directed projection derived from canonical project state. It is not a second database or source of truth. Later repository evidence may add file, module, test, documentation, task, and review-finding nodes through explicit validated boundaries.

**Consequences:** Nodes and relationships carry stable identity, provenance, confidence, lifecycle/version metadata, deterministic order, and optional approval state. Low-confidence relationships remain visible and cannot silently drive destructive actions. Graph traversal supports impact analysis, context selection, task compilation, and visual views without authorizing canonical mutation.

## ADR-014 — Normalized AI Task Card with Style Renderers

**Status:** Accepted — Architecture Expansion

**Decision:** AI work instructions are represented first as one normalized, validated Task Card. Plain English, Agent Optimized, YAML, JSON, eligible Compact Command, and agent-specific XML outputs are deterministic renderers over the same meaning; Custom Template support is deferred. XML is an agent renderer option rather than a universal prompt format. Prompt preferences remain outside canonical project state.

**Consequences:** Style changes do not recompute unrelated project analysis or invent requirements. Every renderer preserves task goal, boundaries, invariants, dependencies, acceptance criteria, validation, risks, expected outputs, documentation updates, and context sufficiency metadata.

## ADR-015 — One Prompt Style Generated by Default

**Status:** Accepted — Architecture Expansion

**Decision:** OXZI initially generates only the user's selected prompt style. The default is Agent Optimized with Balanced Quality context and manual review required. Alternate styles are generated only on request; Compact Command is disabled for complex, ambiguous, destructive, security-sensitive, or otherwise ineligible tasks.

**Consequences:** OXZI avoids spending its own tokens on unused formats. Users may review, regenerate in another style, edit the underlying requirements through validated proposals, copy, or explicitly approve future connected-agent delivery. OXZI itself does not execute project code.

## ADR-016 — Audit-Gated Next-Task Recommendations

**Status:** Accepted — Architecture Expansion

**Decision:** A Review/Audit Analyzer verifies available review evidence before recommending the next task. Failed required checks, security findings, blockers, out-of-scope changes, and incomplete acceptance criteria take precedence over roadmap progression. Its normalized classifications are accept, repair, clarify, focused re-audit, proceed, or stop.

**Consequences:** Agent narrative is never sufficient evidence by itself. Audit failures default to repair or clarification rather than unrelated feature work. The analyzer recommends and the user approves; approved findings may be compiled into a Task Card.

## ADR-017 — Visual Architecture Derived from the Knowledge Graph

**Status:** Accepted — Architecture Expansion

**Decision:** Visual Master Architecture views are deterministic, audience-filtered projections over the same canonical state and Knowledge Graph used by other outputs. OXZI will not maintain a separate manually drifting diagram dataset.

**Consequences:** Visual nodes remain traceable to canonical or repository evidence. Future SVG, PNG, PDF, Mermaid, and graph-JSON exports represent one versioned graph. Visual edits create validated canonical or graph-change proposals and cannot silently alter the source of truth.

## ADR-018 — Optimization Overhead and No-Optimization Path

**Status:** Accepted — Token-Efficiency Contract Hardening

**Decision:** A token optimization is eligible only when its expected input, output, cache, latency, and rework benefit exceeds the cost of its instructions, graph queries, compression, summaries, tool calls, handoffs, and reintegration. Small or already concise tasks may use an explicit no-optimization path.

**Consequences:** OXZI optimizes for the smallest sufficient context, not compression for its own sake. A compiler must record why optimization was selected or skipped and cannot claim savings without subtracting optimization overhead.

## ADR-019 — Distinct Token Metrics and Net Savings

**Status:** Accepted — Token-Efficiency Contract Hardening

**Decision:** Input-context savings, output savings, cache reads and writes, gross savings, optimization overhead, and net total savings are separate metrics. Character or word estimates are labeled estimates; only the selected target tokenizer may produce tokenizer-measured counts.

**Consequences:** Output reduction cannot be marketed as total-session reduction. The future Token Ledger uses `measured`, `tokenizer-estimated`, `character-estimated`, or `unavailable` for every value and reports no positive success claim when measurement confidence is inadequate.

## ADR-020 — Query-First Context Acquisition

**Status:** Accepted — Token-Efficiency Contract Hardening

**Decision:** Task context acquisition starts from explicit task seeds and a Knowledge Graph query. It traverses justified dependency, blocker, decision, security, test, and documentation closure before reading raw files. Raw sources are read when graph evidence or task execution requires them; scope expansion records its reason.

**Consequences:** OXZI does not load an entire Project Bible or repository by default and never imposes an unsafe blanket prohibition against reading additional files. Every seed is preserved, generic high-degree hubs are protected, uncertain sufficiency widens context, and truncation discloses omissions and minimum-safe capacity.

## ADR-021 — Lean Root Agent Navigation Maps

**Status:** Accepted — Token-Efficiency Contract Hardening

**Decision:** Root `AGENTS.md`, `CLAUDE.md`, and `GEMINI.md` files are navigation and safety maps. Detailed product and implementation requirements live in versioned context and specification files. The target root-instruction size is 500–1,000 estimated tokens, with a warning above 1,500 estimated tokens.

**Consequences:** Root instructions point agents to task-specific context instead of duplicating the architecture. Size guidance never authorizes removal of required safety, source-of-truth, validation, or handoff rules, and material reductions require semantic review before application.

## ADR-022 — Adaptive Session Hygiene

**Status:** Accepted — Token-Efficiency Contract Hardening

**Decision:** Session guidance adapts to topic cohesion, risk, target-agent capabilities, and context pressure. One coherent implementation unit maps to one Task Card; unrelated work is not batched merely to reduce messages. Compaction thresholds and cache behavior come from configurable capability profiles rather than universal time or usage assumptions.

**Consequences:** High-risk and cross-cutting work prefers plan-first execution; low-risk mechanical work may execute directly. A compacted handoff preserves current state, strict boundaries, open blockers, the active decision, next action, and stable references. No universal five-minute cache or off-peak-hour rule is a product invariant.

## ADR-023 — Bounded Output Contracts

**Status:** Accepted — Token-Efficiency Contract Hardening

**Decision:** Investigation, implementation, and review Task Cards use explicit, task-specific output contracts. Concision removes narration and repetition but preserves exact decisive errors, identifiers, paths, commands, API names, URLs, security findings, destructive operations, and ordered steps whose ambiguity would be unsafe.

**Consequences:** Agents do not reproduce edited files or long logs by default. When a safe result cannot fit its bound, the response provides a continuation or artifact reference instead of deleting findings. Limits cannot reduce technical meaning.

## ADR-024 — Dynamic Agent Capability and Cost Profiles

**Status:** Accepted — Token-Efficiency Contract Hardening

**Decision:** Agent, model, renderer, cache, MCP, and sub-agent routing use configurable capability and cost profiles rather than permanent branded-model assumptions. Profiles cover planning and coding quality, context window, tokenizer, input/output cost, cache behavior, structured output, plan mode, session reset/compaction, sub-agent support, and MCP support.

**Consequences:** Sub-agent choices account for fresh-context, static-instruction, handoff, and reintegration overhead; no universal cost multiplier is encoded. Bounded investigator, surgical-builder, and reviewer contracts are used only when isolation, specialization, safe parallelism, or a cheaper capable model provides net value. Surgical builders are not used for broad multi-file work.

## ADR-025 — Quality-Controlled Token Measurement

**Status:** Accepted — Token-Efficiency Contract Hardening

**Decision:** Token-efficiency evaluation combines token and cost metrics with execution quality, acceptance coverage, rework, scope violations, latency, and user rating. Baseline behavior, concise-output-only behavior, graph/context optimization, and the full OXZI Task Card workflow are evaluated separately.

**Consequences:** OXZI cannot claim optimization success after a quality regression, omission-caused repair, failed mandatory coverage, or measurement with inadequate confidence. Provider billing integration is not required for the deterministic foundation and remains deferred.

## ADR-026 — Project Constitution as Derived Enforceable Governance

**Status:** Accepted — Specification Governance runtime foundation implemented

**Decision:** A future canonical-schema version stores approved constitutional rules with stable IDs, evidence, applicability, severity, approval, version, and supersession metadata. Until that migration, the deterministic runtime resolves an explicit, versioned snapshot of those records beside canonical state. The Project Constitution remains a read-only projection, not a competing source of truth.

**Consequences:** ADRs continue to explain rationale while the Constitution supplies queryable execution constraints. Downstream artifacts cite its exact version/fingerprint. Approved exceptions require exact rule, Specification version, and scope identity and never transfer automatically. Unknown applicability or mandatory evidence blocks readiness. The runtime cannot persist rules, mutate canonical truth, approve a Specification, or authorize implementation; canonical storage migration remains deferred.

## ADR-027 — Specification, Technical Plan, and Task Separation

**Status:** Accepted — Specification Governance runtime foundation implemented

**Decision:** Specifications own approved behavior and acceptance criteria, Technical Plans own implementation design and slice structure, and Task Cards own one bounded execution unit. Each is a separately versioned normalized artifact with explicit parent references.

**Consequences:** A Task Card may narrow but cannot broaden its parents. Prompt rendering cannot recompute planning or requirement meaning. The implemented categorical health gate exposes structural, clarification, constitutional, consistency, traceability, testability, approval, and freshness results without hidden weighting. Standalone deterministic testability and freshness analyzers feed the normalized Governance Report; planning and Task Card compilation remain deferred.

## ADR-028 — Controlled Living Specifications and Reverse Proposals

**Status:** Accepted — controlled-living validation foundation implemented

**Decision:** Approved requirement changes, implementation discoveries, and progress-only updates use distinct versioned flows. Implementation discoveries produce evidence-backed reverse proposals; code or agent narration never silently becomes requirement truth.

**Consequences:** Historical versions remain immutable. Approved semantic changes invalidate or re-evaluate affected plans, slices, Task Cards, Passports, context packages, and reviews through graph impact evidence.

## ADR-029 — Independent Compliance and Quality Review Gates

**Status:** Accepted — Specification Governance Expansion

**Decision:** Execution acceptance requires both compliance review against approved scope, Constitution, specifications, plans, security, and criteria, and quality review of correctness, maintainability, tests, accessibility, performance, and design.

**Consequences:** Passing one dimension cannot waive a blocking failure in the other. Findings remain evidence-backed and deterministic, and the Review/Audit Analyzer still recommends while the user approves.

## ADR-030 — Selective Workflow and Skill Activation

**Status:** Accepted — Agent Workflow Expansion

**Decision:** A deterministic Workflow Policy Engine selects an explainable method from task, risk, health, evidence, and target-capability inputs. Only required, compatible skill metadata and instructions are loaded; a no-skill path remains valid.

**Consequences:** Workflow and skill overhead is measured. Policies cannot waive constitutional or Passport gates, irrelevant tool catalogs are excluded, and unsafe user-selected policies are rejected with reasons.

## ADR-031 — Execution Passport as Portable Certification Wrapper

**Status:** Accepted — Agent Workflow Expansion

**Decision:** An Execution Passport wraps exactly one normalized Task Card with parent versions, sufficient context, workflow policy, skills, target capabilities, artifacts, validation, review gates, approvals, freshness, and certification state.

**Consequences:** The Passport does not replace the Task Card or prompt renderer. Only certified, fresh Passports are execution-deliverable, and changed semantic dependencies require re-certification.

## ADR-032 — Artifact-First Agent Handoffs

**Status:** Accepted — Agent Workflow Expansion

**Decision:** Large context, plans, diffs, logs, and results move through versioned, hashed artifacts with concise referenced summaries. Inline reproduction is used only when access, readability, sensitivity, or target capability makes references unsafe.

**Consequences:** Artifact integrity, freshness, authorization, and target readability are certification gates. Exact decisive errors remain visible. Production, retrieval, and reintegration overhead counts toward efficiency measurement.

## ADR-033 — Bounded Repair Attempts and Escalation

**Status:** Accepted — Agent Workflow Expansion

**Decision:** Repair attempts are durable evidence records. Three failures for the same failure class is the configurable default escalation threshold, with earlier escalation for security regressions, destructive uncertainty, expanding scope, loops, or inadequate evidence.

**Consequences:** Cosmetic retries cannot reset counts. Terminal outcomes are repaired, focused re-audit, user clarification, specialist escalation, or blocked, and failed attempts remain part of quality and token/rework measurement.

## ADR-034 — Evidence-Based Spec-to-Code Convergence

**Status:** Accepted — Specification Governance Expansion

**Decision:** A future deterministic Convergence Engine compares versioned Specifications, Technical Plans, Task Cards, Constitution rules, repository evidence, execution artifacts, and reviews. It emits traceable findings and proposals rather than mutating authoritative state.

**Consequences:** Review/Audit remains the bounded execution gate; convergence owns cross-version alignment. Unsupported agent claims remain unverified, implementation discoveries require reverse approval, and repository ingestion remains a separate future boundary.

## ADR-035 — Bitemporal Project Facts with Preserved History

**Status:** Accepted — Unified Intelligence Foundation

**Decision:** Project graph facts distinguish effective/event time from ingestion/system time. Superseded or invalidated facts remain historically queryable with reasons, successors, versions, and affected artifacts.

**Consequences:** One ambiguous timestamp is prohibited. Current views filter history; Project Time Machine and freshness analysis use preserved versions without turning the graph into product truth.

## ADR-036 — Episodes as Immutable Provenance

**Status:** Accepted — Unified Intelligence Foundation

**Decision:** Source ingestion is represented by immutable Episodes. Every derived fact traces to Episodes or deterministic canonical records; summaries are not provenance substitutes.

**Consequences:** Sensitive raw content may be separated from safe metadata. Canonical evidence projects to Episode nodes now; persistence and broader source ingestion remain later work.

## ADR-037 — Separate Project and Repository Graphs

**Status:** Accepted — Unified Intelligence Foundation

**Decision:** Project intent and repository implementation are separate derived graphs joined only through a query-time Unified Evidence View.

**Consequences:** Code is evidence, not automatic requirement truth. Repository scans cannot silently mutate canonical state, and each projection has independent freshness and versioning.

## ADR-038 — Deterministic Static Evidence Before AI Enrichment

**Status:** Accepted — Unified Intelligence Foundation

**Decision:** Repository structure, symbols, dependencies, tests, and exact retrieval operate deterministically before optional semantic or AI enrichment.

**Consequences:** Initial retrieval works without embeddings. Optional reranking remains provider-neutral, explainable, configurable, and subordinate to exact evidence and task seeds.

## ADR-039 — Risk-Gated Architect and Executor Separation

**Status:** Accepted — Unified Intelligence Foundation

**Decision:** High-impact work separates a reviewable Architect stage from an approved Executor stage; safe mechanical work may execute directly.

**Consequences:** Architecture claims require repository evidence, approval controls transition, and Passports avoid duplicate context across stages.

## ADR-040 — Versioned Agent Capability Profiles

**Status:** Accepted — Unified Intelligence Foundation

**Decision:** Every execution references an exact versioned agent capability profile which itself references separate model, tool, MCP, workflow, prompt, quality, and approval profiles.

**Consequences:** Current branded agents are not permanent logic. Unsupported delivery, edit, monitoring, pause, or sandbox capabilities are disclosed rather than simulated.

## ADR-041 — Adapter-Based Agent Integration

**Status:** Accepted — Unified Intelligence Foundation

**Decision:** Instruction-file, CLI, API, plugin, hook, protocol, artifact, and manual copy/export integrations implement capability-aware adapters.

**Consequences:** Manual export remains first-class. Connected delivery is optional and requires explicit approval; adapters cannot change Task Card or Passport meaning.

## ADR-042 — Event and Artifact Evidence with Separate Runtime States

**Status:** Accepted — Unified Intelligence Foundation

**Decision:** Append-oriented events, verified artifacts, and durable execution records—not conversation memory—prove execution. Conversation, execution, and runtime/sandbox states remain independent.

**Consequences:** Git diffs and validation evidence outrank narrative. Events are ordered and redacted, artifacts are hashed/readable, and control-plane state cannot collapse into one vague status.

## ADR-043 — Privacy-Controlled Performance Learning

**Status:** Accepted — Unified Intelligence Foundation

**Decision:** Prompt/workflow improvements require versioned evaluation, meaning preservation, regression evidence, and approval. Private project data never trains a global system without explicit consent.

**Consequences:** Derived metrics are preferred; private/local performance memory is supported. Token wins cannot override failed quality, security, scope, or rework outcomes.

## ADR-044 — Prompts as Versioned Evaluated Artifacts

**Status:** Accepted — Prompt Evaluation Expansion

**Decision:** Rendered prompts are versioned artifacts connected to Task Card meaning, context, renderer, target profile, scenarios, executions, and outcomes.

**Consequences:** Prompt prose is never the source of task meaning, and optimization claims require traceable evidence.

## ADR-045 — Normalized Meaning Separate from Renderer Wording

**Status:** Accepted — Prompt Evaluation Expansion

**Decision:** Renderer candidates preserve a normalized Task Card meaning fingerprint while changing presentation only.

**Consequences:** Goal, scope, boundaries, criteria, security, and decisions cannot change through style optimization; mismatch blocks certification.

## ADR-046 — Deterministic Evaluation Before Model Judging

**Status:** Accepted — Prompt Evaluation Expansion

**Decision:** Deterministic assertions run first. Approved qualitative judging is optional only where deterministic evidence cannot decide.

**Consequences:** Model grades cannot override hard deterministic failures and remain visibly identified evidence.

## ADR-047 — Prompt and Execution Certification Are Separate

**Status:** Accepted — Prompt Evaluation Expansion

**Decision:** Prompt Certification gates pre-execution packages; Execution Certification evaluates actual repository, trajectory, validation, security, and scope evidence afterward.

**Consequences:** A good prompt does not prove execution, and correct-looking output reached unsafely cannot pass overall certification.

## ADR-048 — Dataset-Driven Optimization with Validation Promotion Gates

**Status:** Accepted — Prompt Evaluation Expansion

**Decision:** Renderer changes require measurable hypotheses, separated training/unseen validation, security and meaning regression, approval, and rollback.

**Consequences:** Training-only wins do not ship; evaluation partitions prevent leakage and global data use requires consent.

## ADR-049 — Explicit Trust Boundaries for Imported Content

**Status:** Accepted — Prompt Evaluation Expansion

**Decision:** Repository text, uploads, comments, tool descriptions, conversations, proposals, and agent claims retain explicit trust levels and remain delimited data.

**Consequences:** Untrusted content cannot override Constitution, canonical state, Task Cards, or approval rules; suspicious instructions are reported.

## ADR-050 — Risk-Based Task Red-Team Evaluation

**Status:** Accepted — Prompt Evaluation Expansion

**Decision:** Red-team suites are selected by risk, security, ambiguity, scope, and expected value rather than run universally.

**Consequences:** High-risk Passports test injection, poisoning, exfiltration, destructive actions, scope, structured formats, audits, and evaluator manipulation without taxing mechanical work.

## ADR-051 — Isolated Divergence for Selected Decisions

**Status:** Accepted — Divergent Reasoning Expansion

**Decision:** Open-ended high-impact decisions may use mechanically isolated branches with identical normalized problems, minimal shared context, and distinct selected frames.

**Consequences:** One conversation listing alternatives is not treated as isolation; low-risk or net-negative tasks use direct reasoning.

## ADR-052 — Mechanical Generator and Critic Separation

**Status:** Accepted — Divergent Reasoning Expansion

**Decision:** Generation, criticism, clustering, trap detection, deepening, and decision support have separate contracts and phases.

**Consequences:** Generators cannot see sibling output or scores. Different profiles may reduce correlation but do not guarantee independence.

## ADR-053 — Cognitive Frames as Vantage Operators

**Status:** Accepted — Divergent Reasoning Expansion

**Decision:** Versioned cognitive frames are task-selected vantage operators, not fictional personas; concise discovery metadata remains separate from full instructions.

**Consequences:** Every frame is not loaded. Selection uses domain, risk, desired diversity, evaluation history, benefit, and overhead.

## ADR-054 — Trap Detection as a First-Class Result

**Status:** Accepted — Divergent Reasoning Expansion

**Decision:** Attractive but unsafe, costly, premature, irreversible, non-scalable, or irrelevant options produce explicit evidence-backed Trap Findings.

**Consequences:** Hard traps cannot be averaged away by novelty or preference scores.

## ADR-055 — Cost-Gated Adaptive Divergence

**Status:** Accepted — Divergent Reasoning Expansion

**Decision:** Divergence activation accounts for repeated per-branch context, output, critic, clustering, deepening, orchestration, model cost, latency, and decision value.

**Consequences:** Branch counts are adaptive; insufficient or net-negative budgets block activation, and Deep mode normally requires approval.

## ADR-056 — Artifact-First Branch Results

**Status:** Accepted — Divergent Reasoning Expansion

**Decision:** Branches, candidates, scores, clusters, traps, and reports are versioned artifacts with bounded receipts rather than repeated conversation transcripts.

**Consequences:** The Token Ledger includes every branch and reintegration cost, while the main context stays bounded.

## ADR-057 — Generated Ideas Remain Proposals

**Status:** Accepted — Divergent Reasoning Expansion

**Decision:** Divergence outputs cannot become canonical or specification truth until configured review and approval.

**Consequences:** Novelty never bypasses source priority, safety gates, or controlled living specification flows.

## ADR-058 — Evidence-Gated Divergence Promotion

**Status:** Accepted — Divergent Reasoning Expansion

**Decision:** Baseline single-answer, shared-prompt alternatives, isolated divergence, and divergence-plus-critic are compared on unseen suites before workflow promotion.

**Consequences:** OXZI learns which task classes, frames, branch counts, and budgets benefit; divergence is not presumed universally superior.

## ADR-059 — Prompt Programs as Versioned Executable Artifacts

**Status:** Accepted — Prompt Intelligence Expansion

**Decision:** A Prompt Program version binds typed inputs/outputs, Task Card schema, context policy, renderer, examples, workflow, compatibility, evaluation, approval, and release state.

**Consequences:** Used versions are immutable; aliases point to versions, and a prompt string alone is not an executable contract.

## ADR-060 — Meaning Separate from Program Optimization

**Status:** Accepted — Prompt Intelligence Expansion

**Decision:** Task Card meaning remains separate from Prompt Program configuration, rendering, examples, target profiles, optimization, and evaluation.

**Consequences:** Optimization candidates must preserve the normalized meaning fingerprint and cannot change scope, rules, security, criteria, or validation.

## ADR-061 — Typed AI Boundaries Before Trust Elevation

**Status:** Accepted — Typed AI Contracts Expansion

**Decision:** Important AI interactions cross versioned input/output schemas and validation before entering a trusted workflow.

**Consequences:** Malformed prose is not success, raw provider payloads stay in adapters/artifacts, and typed results remain proposals unless separately approved.

## ADR-062 — Bounded Structured-Output Repair

**Status:** Accepted — Typed AI Contracts Expansion

**Decision:** Repair is versioned, bounded, revalidated, and forbidden from inventing required meaning, approvals, evidence, criteria, conflicts, or IDs.

**Consequences:** Exhausted or repeated invalid output escalates; partial output cannot certify.

## ADR-063 — Deterministic Validation Before Model-Assisted Repair

**Status:** Accepted — Typed AI Contracts Expansion

**Decision:** Exact parsing, schema validation, known normalization, and unambiguous deterministic repair precede any optional model-assisted repair.

**Consequences:** Provider quirks remain adapter-local and model repair cannot override deterministic failure evidence.

## ADR-064 — Traces and Experiments as Derived Evidence

**Status:** Accepted — Observability Expansion

**Decision:** Traces, spans, generations, observations, datasets, and experiments are versioned operational evidence, not canonical project truth.

**Consequences:** Every claim remains tied to artifacts and versions; conversation or telemetry cannot silently mutate requirements.

## ADR-065 — Privacy-First Observability

**Status:** Accepted — Observability Expansion

**Decision:** Metadata-only, redacted, private, local, organization, and explicitly consented modes govern capture and retention; raw project content is not globally collected by default.

**Consequences:** Metadata-only traces reject raw content, secrets are redacted before storage, and global use requires provenance, consent, and anonymization.

## ADR-066 — Immutable Prompt and Evaluation Versions

**Status:** Accepted — Observability Expansion

**Decision:** Executions record exact immutable Prompt Program, renderer, example, context, profile, suite, parser, and contract versions.

**Consequences:** Mutable release aliases resolve to immutable versions and reproducibility never depends on a moving label.

## ADR-067 — Training and Validation Separation for Optimization

**Status:** Accepted — Prompt Intelligence Expansion

**Decision:** Prompt experiments separate training, unseen validation, regression, red-team, benchmark, private, organization, and consented-global partitions.

**Consequences:** Leakage and success-only reporting are prohibited; training improvement alone cannot promote a default.

## ADR-068 — Selective DAILY and LIBRARY Skill Surfaces

**Status:** Accepted — Agent Reliability Expansion

**Decision:** Frequently relevant, low-overhead skills may be DAILY; other discoverable capabilities remain LIBRARY and load only after activation.

**Consequences:** Full catalogs are not always loaded, LIBRARY does not mean deleted, and simple tasks retain a no-skill path.

## ADR-069 — Repository-Evidence-Backed Skill Activation

**Status:** Accepted — Agent Reliability Expansion

**Decision:** DAILY classification and activation use current repository stack/workflow evidence, compatibility, task relevance, results, and overhead rather than model preference.

**Consequences:** Off-stack skills cannot become DAILY without evidence, and classifications are invalidated when repository evidence changes.

## ADR-070 — Agent Self-Diagnostics Before Blind Retry

**Status:** Accepted — Agent Reliability Expansion

**Decision:** Repeated failures trigger captured evidence, root-cause classification, one discriminating check, contained recovery, verification, and escalation.

**Consequences:** Unchanged retries and unsupported auto-healing claims are prohibited; preventive insights remain proposals until reviewed.

## ADR-071 — Parser-Neutral Repository Intelligence

**Status:** Accepted — Repository Intelligence Expansion

**Decision:** Multi-language repository parsing uses versioned adapters; domain contracts do not depend directly on one parser or grammar library.

**Consequences:** Parser capabilities, errors, versions, evidence, and fallbacks remain explicit and replaceable.

## ADR-072 — Incremental Parsing and Changed-Range Updates

**Status:** Accepted — Repository Intelligence Expansion

**Decision:** Repository refresh reuses valid unchanged parses and updates affected files/subgraphs from content, parser, grammar, extraction, rule, and graph fingerprints.

**Consequences:** Deletions prune evidence, stale caches fail closed, and full rescans occur only for justified invalidation.

## ADR-073 — Structural Search Is a Distinct Signal

**Status:** Accepted — Repository Intelligence Expansion

**Decision:** Exact text, structural patterns, symbols, repository-graph traversal, and optional semantic retrieval remain separate evidence signals.

**Consequences:** Structural search neither replaces graph traversal nor pretends a textual fallback is parsed evidence.

## ADR-074 — Detection Separate from Transformation Permission

**Status:** Accepted — Repository Intelligence Expansion

**Decision:** A structural match or rule finding authorizes detection only; rewriting requires a separate scoped permission and risk gate.

**Consequences:** Matches are evidence, not confirmed defects or automatic edits.

## ADR-075 — Syntax-Aware Transformation with Preview and Validation

**Status:** Accepted — Repository Intelligence Expansion

**Decision:** Future transformations must be syntax-aware, previewed, overlap-checked, scope-controlled, isolated, reparsed, validated, evidence-backed, and reversible.

**Consequences:** Restricted/generated files remain protected and uncertain semantic changes require review.

## ADR-076 — Layered Repository Evidence Strength

**Status:** Accepted — Repository Intelligence Expansion

**Decision:** Evidence strength progresses from text to parsed structure, symbol relationship, repository graph, validated runtime/tests, and human-approved project truth.

**Consequences:** Agents cite the strongest available level; no lower level silently becomes approved truth.

## ADR-077 — Structural Evidence Feeds Task Context Selection

**Status:** Accepted — Repository Intelligence Expansion

**Decision:** Context compilation uses explicit seeds, structural definitions, direct relationships, interfaces, tests, rules, and relevant changes before whole files.

**Consequences:** Every structural inclusion exposes reason/freshness and cannot displace mandatory project context or safety rules.

## ADR-078 — Deterministic Requirement-Backed Implementation Slices

**Status:** Accepted — Technical Plan and Implementation Slice runtime foundation

**Decision:** The initial deterministic planner derives one stable Implementation Slice for each included Specification requirement, orders Slices by explicit requirement dependencies and stable IDs, and carries exact Specification, Constitution, Governance Report, and Technical Plan fingerprints. An implementation constraint may become a foundation Slice only with explicit justification. Parallel grouping remains unset unless disjoint boundaries or an explicit merge contract prove safe independence.

**Consequences:** Slice derivation is reproducible and cannot invent product scope, silently broaden a parent artifact, or infer unsafe parallelism. Approved or used Plan and Slice versions are immutable; changes create a new version with exact parent linkage. Readiness remains a recommendation requiring external approval, and future planners may refine grouping only through a versioned policy change with regression tests.

## ADR-079 — Separate Technical Plan and Slice Runtime Units

**Status:** Accepted — Roadmap reconciliation

**Decision:** Technical Plan Runtime and Implementation Slice Runtime remain separate, independently testable implementation units. A Technical Plan owns implementation design; Implementation Slice Runtime owns bounded slice derivation, validation, traceability, readiness, and immutability.

**Consequences:** Future work cannot merge these runtimes merely for convenience. Each runtime keeps its own fixtures, tests, health decisions, fingerprints, and reports, while retaining exact parent references across Specification, Constitution, Governance Report, Plan, and Slice versions.

## ADR-080 — Canonical-first Context Compiler v1

**Status:** Accepted — Roadmap reconciliation

**Decision:** Context Compiler Runtime v1 compiles canonical project artifacts only. Code-aware context compilation is introduced later, after Repository Parsing and Structural Intelligence are implemented and can provide validated structural evidence.

**Consequences:** The first Context Compiler cannot claim repository-aware selection, file/symbol intelligence, or AST-backed code context. It may reference existing authoritative documents and canonical project-derived artifacts, but code-aware selection waits for repository evidence contracts and tests.

## ADR-081 — Product UI Before SaaS Expansion

**Status:** Accepted — Roadmap reconciliation

**Decision:** Internal Product UI may begin once the core deterministic pipeline is stable. Authentication, billing, teams, multiplayer collaboration, and broader SaaS administration remain deferred to a later SaaS phase.

**Consequences:** Early UI work should focus on operating and inspecting deterministic OXZI workflows, basic persistence, and APIs. It must not pull forward commercial-account systems or real-time collaboration before the approved sequence reaches that phase.

## ADR-082 — Deployment, Market, and Source Strategy

**Status:** Accepted — Roadmap reconciliation

**Decision:** OXZI targets Cloud SaaS first for vibe coders, AI-assisted developers, agencies, and startup engineering teams. Self-hosted Enterprise is a future product mode for customers that need source code and company data to remain inside their own infrastructure, with customer-controlled models/providers, compliance, auditability, approval workflows, and governance. Core OXZI SaaS and orchestration engine remain closed-source by default.

**Consequences:** Enterprise deployment requirements inform governance architecture but are not immediate runtime scope. Selected SDKs, schemas, integrations, templates, CLI utilities, community tools, public documentation, and educational content may later be open-sourced without publishing the core product IP.
