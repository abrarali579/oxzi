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
4. English, Bahasa Indonesia, Roman Urdu, and mixed-language section aliases and patterns
5. Explicit section value conversion
6. Project-type, technology, platform, language, visual, integration, deployment, security, and privacy dictionaries
7. Sectionless problem, solution, goal, audience, feature, risk, and constraint patterns
8. Negative and temporal-scope classification before current-capability extraction
9. Exact normalized deduplication
10. Source-conflict and cross-field contradiction detection
11. Approved-value protection
12. Zod validation and stable ordering

Common credential-shaped text, provider tokens, authorization/cookie headers, URL credentials, and private-key blocks are redacted from retained candidate values and stored evidence excerpts. Redaction is key/pattern scoped; the extractor does not broadly redact high-entropy text or harmless project identifiers. Full raw source retention is outside this domain boundary.

## Reviewed Language Coverage

The deterministic matching layer supports:

- Roman Urdu construction phrases such as `project banana hai` and `project bnana hai`
- Goal aliases including `mera/mery/hamara/humara goal` and `maqsad`
- Audience aliases including users, customers, clients, and `kis ke liye`
- Feature aliases including features, functionality, `isme hona chahiye`, and `isme hona chahye`
- Mandatory and negative forms including must, required, zaroori, lazmi, do not, must not, `nahi hona chahiye`, and `abhi ... nahi chahiye`
- Visual, stack, language/zaban, deployment/host, security, privacy, integration, risk, issue, and problem terms
- Spelling normalization for `chahye/chahiye`, `bnana/banana`, `krna/karna`, `ho ga/hoga`, `ni/nahi`, `mery/mera`, and `humara/hamara`

Normalization changes only matching and canonical values. Evidence retains the user's original wording except for security redaction.

## Sectionless and Segmentation Rules

- Paragraphs split on sentence endings regardless of the next letter's case.
- Semicolons, Markdown bullets, numbered lists, and line breaks form stable segments.
- Inline headings separated by semicolons can change the active section deterministically.
- Commas, semicolons, English `and`, Bahasa `dan`, and Roman Urdu `aur` split explicit list values.
- Sectionless matches use narrower explicit phrase patterns and a fixed confidence reduction.
- Vague or unsupported prose remains unmatched.

## Negative and Temporal Scope

Negative or noncurrent classification runs before dictionaries so prohibited or deferred technologies, integrations, platforms, and features are not emitted as current requirements.

- Current-MVP statements propose `scope.inScope` values.
- Later/future statements propose `scope.outOfScope` values prefixed with `Deferred:`.
- Explicit exclusions propose `scope.outOfScope` values without a future claim.
- Undecided statements propose `scope.outOfScope` values prefixed with `Undecided:` so they cannot be treated as approved current scope.
- Visual `avoid` statements propose `visual.avoidList`; other prohibitions propose `scope.constraints`.
- The same normalized capability in current features and noncurrent scope creates a blocking conflict.

These mappings describe the current MVP boundary; they do not claim that a deferred item is permanently rejected. A later canonical mutation unit may introduce richer decision records while preserving these proposals and evidence.

## Canonical Alias Normalization

Reviewed aliases include:

- `NextJS` → `Next.js`
- `Postgres` → `PostgreSQL`
- `Bhasa Indonesia`, and bare `Bahasa` in explicit language context, → `Bahasa Indonesia`
- `mobile first` → `Responsive web` for platform detection and `Mobile-first` in explicit constraints
- Dark/light mode variants → `Dark`, `Light`, or `Dark and light`
- SaaS variants → `saas_application`
- Codex, Cursor, Claude Code, and Gemini CLI → stable tool names

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
- Deferred and undecided prefixes are ignored only for conflict-key comparison, never removed from evidence or displayed values.
- New extracted data never replaces an approved field; even a duplicate is recorded as protected with no write required.

## Current Limitations

- Rule coverage is vocabulary-bound and cannot provide general semantic understanding.
- Synonyms and Roman Urdu variants outside the reviewed lexicons may remain unmatched.
- Target-user needs, integration purpose, risk mitigation, and similar required nested canonical properties may be marked inferred when the source names an entity without the required detail.
- Complex or long-distance negation, sarcasm, pronoun resolution, and intentional multi-database or multi-deployment architectures can require manual review.
- `scope.outOfScope` currently carries deterministic `Deferred:` and `Undecided:` markers because the canonical schema has no dedicated temporal-scope field; this is reviewable but intentionally less expressive than a future decision/mutation model.
- Answer application, canonical mutation, persistence, interview generation, and AI extraction remain separate later units.
