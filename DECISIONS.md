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

The extractor uses fixed English and Bahasa Indonesia section aliases, patterns, and reviewed dictionaries. Unmatched language remains unmatched. Source-provided capture timestamps and stable content-derived identifiers preserve deterministic output. Common credential-shaped values are redacted from evidence excerpts.

**Consequences:** Rule extraction is auditable and usable offline but cannot claim general semantic understanding. The update application/mutation boundary must separately enforce source precedence, approval, versioning, and canonical consistency. LLM-assisted extraction may be added later only behind the same validated proposal contract; it cannot bypass evidence, conflicts, or approved-value protection.
