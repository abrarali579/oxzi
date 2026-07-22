# OXZI — Architecture Context

## Architecture Principle

The canonical structured project state is the source of truth. The six Markdown files are deterministic views generated from that state.

## Proposed MVP Stack

| Layer | Technology | Responsibility |
|---|---|---|
| Web application | Next.js + TypeScript | UI, server routes, project workspace |
| UI system | Tailwind CSS + shadcn/ui | Accessible product interface |
| Validation | Zod | Runtime validation of AI and user data |
| Database | PostgreSQL | Users, projects, schema state, versions, decisions |
| ORM | Prisma or Drizzle | Typed database access; choose during implementation bootstrap |
| Authentication | Supabase Auth | User identity and sessions |
| File/object storage | Supabase Storage | Imports and generated export artifacts |
| AI gateway | Provider adapter layer | Cloud and local model access |
| Background jobs | Database-backed job queue initially | Long generation operations and retries |
| Deployment | Vercel + Supabase initially | Low-friction MVP hosting |

## Core System Boundaries

- `app/` — routes and page composition
- `components/` — reusable UI only
- `features/project-intake/` — input, import, and source parsing
- `features/discovery/` — completeness analysis and question selection
- `features/project-schema/` — canonical state types, validation, and mutations
- `features/generation/` — six-file rendering and export generation
- `features/projects/` — project workspace, approval, and versions
- `lib/ai/` — provider-neutral AI gateway and structured output handling
- `lib/db/` — persistence and repositories
- `lib/security/` — authorization, rate limits, redaction, and secret handling

## Core Data Entities

- User
- Workspace
- Project
- SourceInput
- CanonicalProjectState
- FieldEvidence
- DiscoveryQuestion
- DiscoveryAnswer
- Assumption
- Decision
- ProjectVersion
- GeneratedArtifact
- AIProviderConfiguration
- GenerationRun

## Canonical Data Flow

```text
Input or imported material
→ extraction result
→ field-level evidence
→ canonical project state
→ completeness and risk analysis
→ minimal discovery
→ approved canonical state
→ six Markdown renderers
→ export package
```

## Storage Model

### PostgreSQL

Stores project metadata, structured schema state, versions, evidence, decisions, questions, answers, approvals, and generation logs.

### Object Storage

Stores imported files, large source material, generated ZIP files, and later visual references.

### Local Export

Markdown exports remain portable and independent from OXZI. Users retain a usable project context even if they stop using the SaaS.

## AI Provider Model

Every provider implements a shared interface:

- `extractProjectState()`
- `identifyCriticalGaps()`
- `generateQuestions()`
- `mergeAnswers()`
- `renderProjectFiles()`
- `auditConsistency()`

Local models connect through an OpenAI-compatible base URL. Provider-specific logic must not leak into product features.

## Security and Privacy Boundaries

1. API keys are encrypted at rest and never written into generated project files.
2. Imported source content belongs only to its project/workspace.
3. Every project read or mutation requires server-side authorization.
4. AI provider calls receive only the minimum required project context.
5. Sensitive values detected in source input must be flagged and optionally redacted.
6. Local mode must allow project generation without sending content to cloud providers.

## System Invariants

1. Markdown output never directly mutates canonical state.
2. No interview question may request an already-known field unless the system detects a material contradiction.
3. Every inferred critical value carries confidence, evidence, and approval status.
4. Approved decisions cannot be silently overwritten by later generation.
5. A project cannot be marked `architecture_ready` while critical blockers remain unresolved.
6. AI output is untrusted until validated against the canonical schema.
7. Failed generation cannot overwrite the latest approved project version.
8. Long-running AI work must not execute inside a request handler without job tracking.

## Initial Status Lifecycle

```text
draft
→ analyzing
→ discovery_required | discovery_skipped
→ understanding_review
→ bible_generated
→ approved
→ in_build
→ maintained
```
