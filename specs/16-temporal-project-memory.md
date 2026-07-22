# OXZI — Temporal Project Memory Specification

## Status

**Foundation implemented:** temporal graph metadata, Episode projection from canonical evidence, current/historical filtering, path support, indexes, fingerprints, and integrity checks. Persistence, cross-version history assembly, and Project Time Machine UI are planned.

## Bitemporal Model

Event/effective time records when a fact applied to the project. System/ingestion time records when OXZI learned it. Records distinguish `observedAt`, `sourceCreatedAt`, `ingestedAt`, `effectiveFrom`, `effectiveTo`, `invalidatedAt`, `supersededAt`, `supersededBy`, and current status. Old facts are superseded or invalidated, not erased.

## Episodes

An Episode is an immutable ingestion record for a user message, Master Prompt, upload, imported conversation, answer, canonical edit, ADR, repository scan, commit/diff, completion report, Review package, test, correction, or integration event. It carries stable/project IDs, type, source/actor, content reference/hash, effective and ingestion time, privacy/redaction, version, execution links, and derived graph references.

Every graph fact traces to Episodes or deterministic canonical records. Summaries never replace provenance; sensitive raw content may remain separate from safe metadata.

## Project Time Machine

The future view answers what was approved at a version, what changed and why, which work used old decisions, what became stale, and where code/specifications diverge. Authentication moving from one provider to another and then leaving MVP remains three traceable states with affected work and migration impact.

## Invariants

- Project and repository graphs are immutable derived projections.
- Historical queries use effective time; ingestion audits use system time.
- Impossible ranges and broken supersession fail integrity validation.
- A semantic parent change marks dependent artifacts stale until rebuilt or certified.
