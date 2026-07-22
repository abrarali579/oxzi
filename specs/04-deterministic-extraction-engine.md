# OXZI — Deterministic Extraction Engine Specification

## Purpose

The Phase 3 extraction engine converts supported natural-language statements into validated canonical field-update proposals without calling an LLM or mutating canonical project state.

Deterministic extraction is intentionally conservative. Unmatched language remains unmatched rather than becoming an invented fact.

## Accepted Sources

Each extraction request contains one or more timestamped sources:

- `plain_text`
- `master_prompt`
- `uploaded_notes`
- `ai_conversation`

Source IDs and capture timestamps are supplied by the caller. They are included in evidence so identical source metadata and content always produce identical output.

User statements in imported conversations are treated as explicit. Assistant statements are treated as inferred until a user confirms them.

## Output Boundary

The engine returns:

- Validated `CanonicalFieldUpdate` proposals
- Field-level confidence from `0` to `100`
- Canonical evidence records and evidence references
- Source kind, source ID, and conversation speaker
- Short rule explanations suitable for audit
- Explicit or inferred classification
- Contradictions that block ambiguous updates
- Approved-field protection records
- Segment and unmatched-segment counts

Updates have one of three dispositions:

- `proposed` — safe for a later validated mutation workflow to consider
- `blocked_conflict` — incompatible extracted candidates require resolution
- `blocked_approved` — the target canonical field is approved and cannot be overwritten

The extractor never applies these updates itself.

## Supported Canonical Targets

Phase 3 rules normalize into approved canonical shapes for:

- Project name, summary, and type
- Problem, solution, goals, and target users
- In-scope, out-of-scope, constraints, and assumption summaries
- Platforms and prioritized features
- Visual personality, keywords, exclusions, themes, and colors
- Preferred stack, integrations, security, privacy, and deployment
- Localization languages
- Risks with impact and mitigation metadata

Priorities are normalized into canonical goal and feature priority values. No separate unversioned priority object is introduced.

## Rule Layers

Extraction runs in a fixed order:

1. Unicode and line-ending normalization
2. Source and conversation-speaker segmentation
3. Markdown heading and inline section recognition
4. English and Bahasa Indonesia section aliases
5. Explicit section value conversion
6. Project-type, technology, platform, language, visual, integration, deployment, security, and privacy dictionaries
7. Mandatory-language, audience, and goal patterns
8. Exact normalized deduplication
9. Source-conflict and cross-field contradiction detection
10. Approved-value protection
11. Zod validation and stable ordering

Common credential-shaped text is redacted from stored evidence excerpts. Full raw source retention is outside this domain boundary.

## Confidence Rules

Base confidence is deterministic by source:

- Master Prompt user statement: `96`
- Plain-text user statement: `92`
- Imported conversation user statement: `90`
- Uploaded note: `86`
- Unattributed conversation text: `72`
- Imported assistant statement: `62`

Explicit section matches add `2`. Inference subtracts `12`; individual rules may add a documented fixed adjustment. Independent matching evidence can add up to `4`. Confidence is always capped at `99`.

## Merge and Conflict Rules

- Identical normalized values merge and retain unique evidence and sources.
- Explicit section statements suppress weaker implicit candidates for the same project type or target-user field.
- Compatible list values merge by normalized string or object name.
- Competing scalar values create a conflict rather than selecting the highest confidence.
- Competing primary frameworks or databases create a stack conflict.
- A capability appearing in both features and out-of-scope creates a blocking cross-field conflict.
- New extracted data never replaces an approved field; even a duplicate is recorded as protected with no write required.

## Current Limitations

- Rule coverage is vocabulary-bound and cannot provide general semantic understanding.
- Synonyms outside the reviewed lexicons may remain unmatched.
- Target-user needs, integration purpose, risk mitigation, and similar required nested canonical properties may be marked inferred when the source names an entity without the required detail.
- Complex negation, sarcasm, references across distant paragraphs, and multi-database or multi-deployment architectures can require manual review.
- Answer application, canonical mutation, persistence, interview generation, and AI extraction remain separate later units.
