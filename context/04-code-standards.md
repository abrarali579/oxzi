# OXZI — Code Standards

## General Engineering Rules

- Use strict TypeScript.
- Keep feature logic isolated by domain.
- Fix root causes instead of adding silent fallbacks.
- Do not mix AI provider code with product workflow logic.
- Do not trust AI-generated JSON until schema validation passes.
- Prefer deterministic renderers for Markdown output.
- Keep token optimization behind mandatory quality and sufficiency gates.
- Model graphs, context packages, Task Cards, prompt styles, audit findings, and visual views as derived data or validated proposals.
- Keep modules small enough to test independently.
- Use explicit error types and user-safe error messages.

## TypeScript

- `strict: true` is mandatory.
- Avoid `any`; use `unknown` at untrusted boundaries.
- Validate external data with Zod before use.
- Prefer discriminated unions for workflow states.
- Canonical schema types must be generated from or directly aligned with runtime schemas.

## Next.js

- Default to server components.
- Use client components only for browser interaction.
- Mutations require server-side authentication and authorization.
- Route handlers should orchestrate, not contain domain logic.
- Long-running generation should create a tracked job.

## AI Integration

- Use structured outputs where supported.
- Every provider response must be parsed and validated.
- Store model, provider, prompt version, and run metadata.
- Retry only transient failures.
- Never hide schema validation failures by accepting partial malformed output.
- Separate extraction, gap analysis, question generation, merge, and rendering prompts.

## Canonical State

- Canonical project state changes only through validated mutations.
- Every critical field stores evidence and confidence.
- User-confirmed values outrank inferred values and defaults.
- Approved values require an explicit conflict workflow before replacement.
- Markdown is rendered from state; Markdown edits must be parsed into proposed state changes rather than silently becoming truth.
- Knowledge Graph, context packages, Task Cards, prompts, review recommendations, and visual edits follow the same no-silent-mutation rule.

## Derived Intelligence

- Graph identifiers, ordering, traversal results, context selection, Task Card compilation, and style rendering must be deterministic for identical versioned inputs.
- Every graph node and relationship retains source/evidence references, confidence, and version/lifecycle metadata.
- Context compilation must prove complete mandatory-context, direct-dependency, and blocker coverage before reporting sufficiency.
- Token estimates must be labeled estimates unless produced by the selected target tokenizer.
- Keep input, output, cache, gross-savings, optimization-overhead, and net-savings values separate.
- Preserve every graph/context seed and expose truncation reasons, omission counts/categories, mandatory coverage, and minimum-safe estimates.
- Use content fingerprints for deterministic invalidation, not as cryptographic security proofs.
- Prompt renderers consume a validated normalized Task Card and cannot introduce new requirements.
- Audit analysis must inspect validation evidence and changed-file scope rather than trusting completion prose.
- Low-confidence graph relationships cannot silently authorize destructive or high-impact changes.
- Never silently truncate below the mandatory context set; return explicit insufficiency.
- Compression output is derived-only and must retain protected code, commands, paths, identifiers, errors, numeric limits, security invariants, acceptance IDs, field IDs, decision IDs, and evidence references.

## Governance and Execution Artifacts

- Give Constitutions, Specifications, Technical Plans, slices, Task Cards, Context Packages, Passports, artifacts, execution records, reviews, and convergence findings strict versioned schemas.
- Preserve stable IDs, parent references, source/evidence, approval, freshness, and content fingerprints.
- Do not collapse Specification, Plan, Task Card, Passport, and renderer responsibilities into one type or module.
- Make status transitions explicit and reject invalid or stale certification states.
- Treat implementation discoveries as proposals; only approved mutation boundaries change authoritative state.
- Keep compliance and quality findings distinct even when one defect affects both dimensions.
- Policy selection, slice ordering, retry escalation, and adapter downgrade behavior must be deterministic and tested.
- Artifact references must verify integrity, access, freshness, and target readability before replacing inline context.
- Temporal records use explicit effective and ingestion fields; never overload one timestamp.
- Repository parsers and optional enrichment remain adapters outside canonical project state.
- Exact file content outranks stale chat; edit formats must match agent capability and read-only/generated boundaries.

## Database

- Every project-owned record includes `project_id`.
- Every workspace-owned query enforces ownership.
- Use transactions for version creation and approved-state updates.
- Preserve immutable historical versions.
- Do not store API keys in plaintext.

## API Response Shape

```ts
export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string; details?: unknown } };
```

## Testing

Required layers:

- Unit tests for scoring, ranking, merge rules, and renderers
- Contract tests for AI provider adapters
- Integration tests for project creation and authorization
- End-to-end tests for zero-question and minimal-question project flows
- Golden-file tests for generated Markdown
- Contract tests for graph projection, context sufficiency, Task Card render equivalence, audit classification, and graph-derived visual view models as those units are implemented
- Determinism tests for byte-stable graph serialization, stable identities, cap/hub behavior, cycle safety, traceability, and fingerprint invalidation

## Critical Test Cases

1. Complete master prompt produces zero questions.
2. Known information is never asked again.
3. Contradictory source material produces a conflict, not a guessed answer.
4. A low-confidence noncritical field does not block generation.
5. An approved critical field cannot be overwritten silently.
6. Exported six files remain internally consistent.
7. Every context mode preserves mandatory constraints, dependencies, blockers, tests, and acceptance criteria.
8. Failed review checks yield repair or stop rather than unrelated next work.
9. Prompt-style renderers preserve identical normalized Task Card meaning.
10. Every task subgraph preserves seeds and mandatory dependency, blocker, decision, security, test, and documentation coverage.
11. Token-efficiency success is rejected after quality regression, mandatory-coverage failure, or omission-caused repair.
12. Unhealthy specifications cannot enter technical planning.
13. A Task Card cannot broaden its Specification or Technical Plan.
14. Changed semantic dependencies make an Execution Passport stale.
15. Compliance and quality gates independently block acceptance.
16. Repeated repair failures reach a durable escalation outcome.
17. Adapter rendering preserves normalized Passport and Task Card meaning.

## File Organization

```text
src/
├── app/
├── components/
├── features/
│   ├── project-intake/
│   ├── discovery/
│   ├── project-schema/
│   ├── generation/
│   └── projects/
├── lib/
│   ├── ai/
│   ├── db/
│   ├── security/
│   └── shared/
└── tests/
```

Implemented domain modules also include `src/domain/project/`, `src/domain/discovery/`, `src/domain/extraction/`, and `src/domain/knowledge-graph/`. New deterministic intelligence belongs beside these domains rather than inside route handlers.

## Documentation Rule

Any implementation that changes scope, architecture, canonical schema, discovery behavior, or workflow invariants must update the relevant context/spec file before the task is considered complete.
