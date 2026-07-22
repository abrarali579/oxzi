# OXZI — Divergent Reasoning Engine Specification

## Status and Purpose

**Contracts implemented; runtime not implemented.** Strict schemas cover frames, requests, selections, isolated candidate outputs, critic scores, clusters, traps, deepening, cost, activation, and decision reports. No parallel calls, LLM judging, clustering runtime, provider, or UI is included.

The future engine selectively widens the solution space for open-ended, high-impact architecture, strategy, API, naming, fuzzy debugging, UX, security, or trade-off decisions. It is disabled for factual lookup, mechanical work, routine validation/formatting, low-risk fixes, accepted single solutions, or net-negative overhead.

## Mechanical Isolation

Branches receive the same normalized Decision Task Card, smallest sufficient shared context, and one selected frame. During divergence they cannot see siblings, critique, rank, or include critic scores. Isolation is a runtime property—not an instruction to one shared conversation. Outputs are short, structured, versioned artifacts.

## Cognitive Frame Registry

Frames are vantage operators, not fictional personas. Concise discovery metadata contains identity, domains/problem types, risk/novelty/overhead, incompatibilities, evaluation history, version, and enabled status; full independently authored frame instructions load only after activation. Candidate categories include security, regulation, operations, zero-budget, long-term, inversion, assumption removal, performance, friction, accessibility, privacy, business, maintainability, recovery, and analogy. Selection is task/risk/diversity/evidence/cost-based; every frame is never loaded.

## Phase Separation

1. Divergence generates proposals only.
2. An independent critic scores declared candidates.
3. Clustering groups underlying approaches.
4. Trap detection identifies attractive failures.
5. Deepening expands only survivors.
6. Decision support returns clusters, shortlist, a non-obvious viable option, risks/traps, first validation, and a recommendation or unresolved decision.

Different approved profiles may reduce correlation but do not prove independence.

## Scores and Traps

Visible dimensions may include novelty, viability, fit, safety, maintainability, reversibility, cost, complexity, and evidence. Each score carries status/value, reason, evaluator/profile, confidence, evidence, hard-constraint flag, and version. Hard failures cannot be averaged away.

Trap findings cover false economy, premature abstraction, operational burden, security, lock-in, non-scalability, untestability, migration cost, reversibility, compliance, reasoning cost, irrelevant novelty, and valueless complexity. Each cites candidate, explanation, severity, evidence, mitigation, and rejection state.

## Cost and Activation Gate

Cost includes shared context, repeated context for every isolated branch, branch output, critic, clustering, deepening, orchestration, model cost, and latency—not call count alone. Decisions are `recommended`, `optional`, `not_cost_effective`, `blocked_by_budget`, `blocked_by_insufficient_context`, or `blocked_by_risk`.

Quick, Standard, and Deep modes adapt branches/frames to stakes, ambiguity, risk, budget, prior evaluation, and diversity saturation. Stop on structural repetition, insufficient marginal diversity, exhausted budget, or enough viable clusters. Deep mode requires explicit approval unless policy says otherwise.

## Token and Artifact Discipline

Compile one decision-relevant graph context; reuse accessible stable references/cache, keep outputs bounded, store branches as artifacts, normalize candidates for critics, deepen only survivors, and charge all overhead to the Token Ledger. The main conversation receives receipts rather than transcripts. Disable divergence when net value is negative.

## Workflow and Prompt Integration

`divergent_reasoning` is a selectively activated workflow/skill before architecture/specification choices, slicing, renderer redesign, threat modeling, or repeated repair escalation. The prompt compiler emits a Decision Task Card containing decision, constraints/facts/prohibited options, criteria, uncertainty, graph context, frame policy, budget, and final format. Ideation and implementation instructions never share one uncontrolled prompt.

Generated ideas remain proposals until configured approval creates a canonical/specification change.

## Evaluation Contract

Future evaluation compares baseline single answer, one-prompt alternatives, isolated branches, and isolated branches plus critic across breadth, novelty, viability, fit, traps, actionability, usefulness, tokens, latency, decision quality, and preference. Training/unseen validation separation determines benefiting task classes, branch counts, frame combinations, and cost limits; favorable anecdotes cannot promote the workflow.

Future branch, critic, cluster, trap, and report outputs each use an operation-specific Typed AI Contract. Partial branch artifacts remain partial and cannot enter the shortlist until final validation; repair cannot invent evidence, scores, constraints, or approvals. Prompt Program versions and traces are recorded per isolated branch without exposing sibling results.
