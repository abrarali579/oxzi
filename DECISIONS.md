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

**Status:** Accepted — Specification Governance Expansion

**Decision:** A future canonical-schema version stores approved constitutional rules with stable IDs, evidence, applicability, severity, approval, version, and supersession metadata. The Project Constitution is a deterministic projection of those rules, not a competing source of truth.

**Consequences:** ADRs continue to explain rationale while the Constitution supplies queryable execution constraints. Downstream specifications, plans, Task Cards, Passports, and reviews cite its version/fingerprint. Runtime enforcement requires a later explicit canonical migration.

## ADR-027 — Specification, Technical Plan, and Task Separation

**Status:** Accepted — Specification Governance Expansion

**Decision:** Specifications own approved behavior and acceptance criteria, Technical Plans own implementation design and slice structure, and Task Cards own one bounded execution unit. Each is a separately versioned normalized artifact with explicit parent references.

**Consequences:** A Task Card may narrow but cannot broaden its parents. Prompt rendering cannot recompute planning or requirement meaning. Health and approval gates precede downstream compilation.

## ADR-028 — Controlled Living Specifications and Reverse Proposals

**Status:** Accepted — Specification Governance Expansion

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
