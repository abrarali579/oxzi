# OXZI — AI Workflow Rules

## Mandatory Start Sequence

Before implementation or architectural work:

1. Read `OXZI.md`.
2. Read all six context files in order.
3. Read the relevant specification file.
4. Read the latest progress tracker.
5. State the single implementation unit being worked on.

## Scope Discipline

- Implement one verifiable feature unit at a time.
- Do not combine UI, persistence, provider integration, and background processing unless the feature requires them end to end.
- Split work when the change cannot be tested clearly.
- Do not rewrite unrelated files.

## Requirement Priority

From highest to lowest:

1. User-confirmed values
2. Approved decisions
3. Explicit source material
4. Accepted assumptions
5. OXZI product defaults
6. AI inference

A lower-priority source cannot silently overwrite a higher-priority source.

## Handling Missing Information

- Do not invent critical business or technical behavior.
- Apply a safe default only when reversal is cheap and impact is low.
- Record every material default or inference as an assumption.
- Ask a question only when the discovery rules classify it as blocking or high-impact.

## Architecture Changes

Before changing an approved boundary, technology, data model, or invariant:

1. Explain the reason.
2. Record affected files and risks.
3. Add a decision entry.
4. Update architecture/specification.
5. Only then modify implementation.

## Generated Files

- Render files from canonical project state.
- Do not independently author contradictory details across files.
- Every renderer must use shared normalized data.
- Missing optional content should be omitted cleanly, not left as `[placeholder]`.
- Critical missing content must block approval rather than produce vague filler.

## Verification Before Completing a Unit

1. Feature works within its defined scope.
2. Type checking passes.
3. Relevant tests pass.
4. No architecture invariant is violated.
5. Context/spec files remain accurate.
6. Progress tracker is updated.
7. Next task is explicit.

## Protected Decisions

The following Phase 1 decisions cannot be changed silently:

- Canonical structured state is the source of truth.
- Six Markdown files are generated views.
- Interviews are adaptive and minimal.
- Complete master prompts may skip the interview.
- Cloud and local model support use a provider-neutral gateway.
- Users retain portable Markdown/ZIP exports.
