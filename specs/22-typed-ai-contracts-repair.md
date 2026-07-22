# OXZI — Typed AI Contracts and Structured Output Repair Specification

## Status and Boundary

**Normalized contracts and deterministic known-variation normalization implemented; provider parsing/repair runtimes not implemented.** `src/domain/ai-contracts/` defines contract definitions, invocations, parse results, validation errors, repair attempts, partial states, typed completion results, deterministic serialization, and bounded escalation gates.

Typed AI Contracts apply to extraction, clarification, graph enrichment, technical planning, slicing, Task Cards, certification, divergence, execution reports, audit/convergence findings, optimization candidates, and evaluator results. They are validated operational boundaries, never canonical project truth.

## Contract and Invocation

Each definition records stable ID/version, operation, input/output schema references, compatibility, strictness, partial policy, validation/repair/retry policy, privacy, evidence, and fingerprint. Invocations reference provider-adapter request/response artifacts; provider-native payloads never enter the domain contract.

Parsing failure and task failure are separate states. Invalid structured output is not successful prose. Trust elevation requires schema validation, evidence checks where required, and a normalized typed result.

## Bounded Repair Pipeline

```text
raw response → exact extraction → schema parse → known normalization
→ unambiguous deterministic repair → optional model repair
→ revalidation → success | partial | blocked | failed
```

Safe deterministic operations are fenced-JSON extraction, harmless whitespace, confidently removable trailing separators, approved field/enum aliases, and known primitive representations. Alias collisions fail closed.

Repair must never invent required values, approvals, acceptance criteria, evidence, conflicts, or IDs; silently remove conflicts; or convert uncertainty into approved truth. Each attempt records original/repaired hashes, numbered method, operations, confidence, validator version, remaining errors, result, and escalation. Exhausted attempts require escalation. Provider-specific quirks remain adapter-local.

## Partial and Streaming Contract

Partial output is explicitly marked with stream/interruption state, artifact and fragment references, deterministic duplicate tracking, missing required fields, and pending final validation. Partial records may support progress display or recovery but cannot pass final certification. Interrupted streams retain recoverable artifacts where policy allows.

## Non-Goals

Deferred: provider calls, streaming transport, dynamic schema registry, model-assisted repair, automatic retries, persistence, UI, and provider-specific SDK behavior. Unstructured output cannot mutate canonical state.

