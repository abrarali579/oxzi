# OXZI — Code Standards

## General Engineering Rules

- Use strict TypeScript.
- Keep feature logic isolated by domain.
- Fix root causes instead of adding silent fallbacks.
- Do not mix AI provider code with product workflow logic.
- Do not trust AI-generated JSON until schema validation passes.
- Prefer deterministic renderers for Markdown output.
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

## Critical Test Cases

1. Complete master prompt produces zero questions.
2. Known information is never asked again.
3. Contradictory source material produces a conflict, not a guessed answer.
4. A low-confidence noncritical field does not block generation.
5. An approved critical field cannot be overwritten silently.
6. Exported six files remain internally consistent.

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

## Documentation Rule

Any implementation that changes scope, architecture, canonical schema, discovery behavior, or workflow invariants must update the relevant context/spec file before the task is considered complete.
