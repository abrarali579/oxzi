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
