# OXZI — AI Workflow Rules

## Mandatory Start Sequence

Before implementation or architectural work:

1. Read `AGENTS.md`.
2. Read `PROJECT.md`.
3. Read `DECISIONS.md`.
4. Read `OXZI.md`.
5. Read all context files in numerical order.
6. Read the relevant specification files.
7. Read the relevant examples.
8. State the single implementation unit being worked on.

## Scope Discipline

- Implement one verifiable feature unit at a time.
- Do not combine UI, persistence, provider integration, and background processing unless the feature requires them end to end.
- Split work when the change cannot be tested clearly.
- Do not rewrite unrelated files.
- Repair failed checks, security findings, blockers, and incomplete acceptance criteria before unrelated feature work.

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
- Treat Knowledge Graphs, context packages, Task Cards, prompts, audit recommendations, visual diagrams, and Markdown as derived outputs or proposals.
- Generate only the selected prompt style initially; default to Agent Optimized with Balanced Quality context and manual review.
- Never compress away unique requirements, security boundaries, blockers, decisions, direct dependencies, required tests, acceptance criteria, or ambiguity warnings.

## Review and Handoff

- Verify agent claims against the Review Engine's changed files, validation results, architecture impact, diff metadata, and security findings.
- Classify the next action as accept, repair, clarify, focused re-audit, proceed, or stop.
- Changes outside the approved unit require explicit review.
- The analyzer recommends; the user approves the next Task Card or any future connected-agent send.
- OXZI does not execute project code.

## Verification Before Completing a Unit

1. Feature works within its defined scope.
2. Type checking passes.
3. Relevant tests pass.
4. No architecture invariant is violated.
5. Context/spec files remain accurate.
6. Progress tracker is updated.
7. Next task is explicit.

## Protected Decisions

`DECISIONS.md` is the formal register of accepted decisions. No accepted decision may be changed silently; any change must follow the architecture-change process above and update every affected context, specification, implementation, and progress record.
