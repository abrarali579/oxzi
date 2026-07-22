# OXZI — Observability, Datasets, and Experiments Specification

## Status and Boundary

**Provider-neutral contracts implemented; capture, persistence, viewers, and telemetry upload not implemented.** `src/domain/observability/` defines traces, spans, generations, observations, evaluation links, privacy/retention policy, datasets/items, experiments/runs, hierarchy checks, exact version lineage, and deterministic serialization.

Operational evidence is derived and cannot become canonical truth.

## Trace Model

```text
Trace → Span → Generation or Agent Operation
               → Tool/Repository Operation → Evaluation → Artifact
```

A trace represents compilation, retrieval, rendering, evaluation, execution, review, repair, or convergence. It records project/task/Passport/execution IDs, environment, time/status, session reference, privacy mode, tags, metadata, retention policy, and exact versions.

Spans record parentage, operation, artifact references, timing, token/cache categories, cost/currency, errors, profiles, evaluations, and artifacts. Parents must exist within the trace. Generations bind exact Prompt Program, renderer, context, model/tokenizer, usage, latency, finish reason, parsed contract result, and raw-retention policy.

Every execution lineage records canonical project, Constitution, specification, plan, Knowledge Graph, repository graph, Task Card, Context Package, Prompt Program, renderer, examples, workflow, skills, target agent/model, evaluation suite, parser, and typed-output-contract versions. Already-used versions are immutable.

## Privacy Modes

Modes are `metadata_only`, `redacted_content`, `full_private_trace`, `local_only`, `organization_controlled`, and `consented_product_improvement`. Metadata Only is the privacy-favoring default direction and rejects raw input/output references. Raw prompts and code are not globally collected by default; secret redaction precedes persistence; private projects remain isolated; retention/deletion are configurable; hashes and derived metrics are preferred.

Consented product-improvement data requires explicit provenance, anonymization/redaction policy, and consent. Users may disable raw tracing. Traces never become project truth.

## Datasets and Experiments

Datasets are immutable versioned partitions: training, unseen validation, regression, red-team, benchmark, private project, organization, or approved anonymized global. Items retain provenance and scenario fingerprints. Training/validation leakage is prohibited.

Experiments record hypothesis, candidates, baseline, exact dataset/profile/context/suite versions, token/cost/latency, quality, rework, all results including failures, statistical limitations, and release recommendation. Selective reporting is prohibited. Provider latency or cost is not execution quality.

## Non-Goals

Deferred: Trace/Span runtime, storage, telemetry upload, trace viewer, provider billing, automatic datasets, experiment runner, evaluation execution, organization controls, and deletion jobs.

