# OXZI — Minimal Discovery Engine Specification

## Objective

Ask as little as possible while preventing expensive or structural mistakes.

## Pipeline

```text
Normalize input
→ classify project type
→ extract facts and evidence
→ populate canonical state
→ detect conflicts
→ determine relevant field set
→ score critical completeness
→ identify candidate gaps
→ rank candidate questions
→ apply question budget
→ skip or run interview
```

## Question Eligibility

A question is eligible only when all are true:

1. The information is missing, conflicted, or too uncertain.
2. The field is relevant to this project type and current phase.
3. The answer would materially change the output.
4. A safe, low-cost default is not sufficient.
5. The answer is not already available in any source or accepted assumption.

## Material Impact Categories

Ask first when the answer changes:

- Product scope
- Primary user flow
- Architecture or data model
- Authentication or permissions
- Security/privacy
- External integrations
- Cost-intensive functionality
- Visual direction at a foundational level
- Primary conversion/business objective

Usually infer or defer:

- Minor naming
- Exact microcopy
- Noncritical animation details
- Internal folder naming
- Reversible library choices
- Later-phase optimizations

## Question Score

```text
score =
  criticality_weight
  × impact_weight
  × uncertainty_weight
  × phase_relevance
  × answerability
  − typing_cost
  − default_safety
  − redundancy_penalty
```

Suggested weights:

- Blocking: 100
- High: 70
- Medium: 35
- Low: 10

### Phase 3 Deterministic Runtime Contract

The implementation uses those criticality values as both completeness weights and the base question-rank weights. All weights are static, exported, and provider-neutral.

Resolution ratios are:

- Approved or confirmed field: `1.0`
- Accepted assumption where the field permits assumptions: `1.0`
- Safe default where the field and project type permit it: `1.0`
- Unapproved inference: confidence-scaled, capped at `0.5`
- Default without an approved safe-default rule: `0.75`
- Missing or conflicted field: `0`

Critical completeness includes relevant blocking and high fields. Overall completeness includes every relevant field. Section completeness applies the same weighted-average formula within each canonical section. Scores are rounded to one decimal place.

Runtime question rank is:

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

The exact multiplier and penalty tables are exported from `src/domain/discovery/rules.ts` and formally recorded in ADR-010. Ties sort by canonical field path so output ordering remains deterministic.

## Interview Skip Rule

Skip the interview when all conditions are met:

- Critical completeness >= 90%
- No blocking conflicts
- No blocking missing fields
- Remaining assumptions are low-risk or reversible
- The system can generate all required six-file sections without vague filler

The system should tell the user plainly:

> “Your prompt covers everything important. I’m skipping the interview.”

## Question Budget

- Complete Master Prompt: 0 questions
- Detailed brief: 0–3 questions
- Typical project idea: 2–5 questions
- Complex but unclear project: maximum 8 questions before an Understanding Review

After eight questions, OXZI must generate the best available draft or show a compact unresolved-decision review. It must not continue an endless interview.

## Question Design Rules

- One decision per question
- Prefer 2–4 concrete choices
- Include a recommended option where a strong default exists
- Keep visible question text under roughly twelve words where possible
- Allow custom text
- Do not ask abstract questions such as “What is your vision?”
- Ask for the concrete choice that affects the project

## Example Transformations

Bad:

> Tell us about your target audience, goals, preferred design, features, and budget.

Better sequence only when missing:

> Who should take the main action?

Options:

- Business owners
- Internal team
- Consumers
- Other

Then, only if needed:

> What should they do first?

## Contradiction Handling

When sources conflict, ask one reconciliation question rather than repeating both original questions.

Example:

> “Your brief says local-only AI, but the feature list requires a cloud API. Which rule wins?”

## Smart Default Rules

A default may be applied without asking when:

- It is reversible
- It is low cost
- It does not change user-visible product scope
- It does not weaken security/privacy
- It is a conventional implementation detail

Every applied default is visible in the Understanding Review.

## Understanding Review

Before final generation, show:

- Confirmed facts
- Inferred details
- Defaults
- Assumptions requiring approval
- Conflicts
- Items intentionally deferred

User can approve all low-risk assumptions in one action.
