# OXZI — Project Constitution Specification

## Status and Purpose

**Status:** Deterministic runtime foundation implemented; canonical storage migration and persistence deferred.

The Project Constitution is the compact, enforceable governance layer for one project. It is derived from approved canonical constitutional rules and constrains specifications, plans, Task Cards, Execution Passports, reviews, and implementation. It does not replace canonical project state, ADRs, or detailed specifications.

## Authority and Storage

- Canonical structured state remains the source of truth.
- The current runtime accepts an explicit, versioned snapshot of approved constitutional-rule records beside canonical state. It resolves and enforces that snapshot without mutating canonical state or treating the snapshot as a second source of project truth.
- A future canonical-schema migration will store those rule records in canonical state. Persistence and canonical mutation remain outside the runtime foundation.
- The compiled Constitution is a deterministic, read-only projection over one canonical project version.
- ADRs record why a rule exists; the Constitution records the normalized rule an executor must obey.
- Detailed requirements stay in specifications and are referenced, not copied wholesale.

## Constitutional Rule Contract

Each rule contains:

- stable `ruleId`
- title, description, and concise normative statement
- category
- severity: `blocking`, `required`, or `advisory`
- applicability expression and affected lifecycle phases
- source and evidence references
- approval status and approver metadata
- effective canonical version
- status: `proposed`, `active`, `superseded`, or `retired`
- optional `supersededByRuleId`
- verification method and failure consequence
- content fingerprint

Categories include product, architecture, security, privacy, quality, accessibility, data, AI workflow, agent permissions, token efficiency, compliance, and deployment. IDs remain stable across wording-only regeneration; a semantic rule change creates a new version or successor rule.

## Compilation and Query Contract

Given a canonical project version, compilation must:

1. select active, applicable, approved rules;
2. preserve all blocking rules and their evidence;
3. order rules by category, severity, and stable ID;
4. disclose unresolved conflicts and missing approvals;
5. emit canonical version, compiler version, and projection fingerprint; and
6. reject an execution-ready result if a blocking rule is conflicted or unverifiable.

The implemented resolver additionally detects same-policy authority conflicts, preserves unknown applicability, validates rule-, scope-, and version-specific approved exceptions, exposes unknown mandatory evidence, and fingerprints the exact canonical version, Constitution version, applicable rules, and exceptions used. Exceptions never transfer automatically to an amendment. Its readiness output is a recommendation for an authorized workflow or human; it is never automatic approval.

Consumers query by rule ID, category, severity, lifecycle phase, graph node, specification, plan, task, or artifact. Query results preserve source, evidence, approval, and freshness metadata.

## Invariants

- Derived artifacts cannot edit or silently weaken rules.
- Superseded rules remain historically readable but are not active.
- A lower-authority artifact cannot override a blocking rule.
- Missing applicability data widens review; it never silently excludes a rule.
- Constitution references in downstream artifacts include version and fingerprint.
- Security, privacy, approval, and destructive-operation rules cannot be compressed into ambiguous language.

## Knowledge Graph Direction

Future projection adds `constitutional_rule` nodes and relationships to specifications, acceptance criteria, decisions, security invariants, plans, Task Cards, Passports, artifacts, and reviews. This unit reserves that vocabulary only; it does not change the implemented graph schema.

## Implemented Runtime Boundary

`src/domain/governance/` now provides strict governance input/output schemas, deterministic Constitution resolution, rule-by-rule compliance evidence, stable findings, fingerprints, fixtures, and orchestration into Specification Health. Identical semantic inputs produce stable semantic results; evaluation timestamps remain explicit provenance and are excluded from semantic fingerprints.

## Non-Goals

- Canonical-schema migration, persistence, or rule-authoring UI
- A general policy language
- Provider calls or automatic approval
- Replacing ADRs, specifications, or approval records

## Acceptance Criteria for Implementation

- Strict schemas reject unstable IDs, invalid status transitions, and missing evidence for blocking rules.
- Compilation is byte-stable for identical versioned input.
- Active-rule selection, supersession, applicability, and blocking behavior are tested.
- Existing approved canonical values remain protected.
- Downstream artifacts can prove the exact Constitution version used.
