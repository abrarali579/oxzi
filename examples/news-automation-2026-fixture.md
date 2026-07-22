# Validation Fixture — News Website Automation Systems in 2026

The executable canonical fixture is `src/domain/project/fixtures.ts` as `newsAutomation2026Fixture`. It is validated when imported and contains field-level evidence, confidence, criticality, approval, lifecycle, version, assumption, and decision metadata.

## Structured Scenario

```yaml
identity:
  name: News Website Automation Systems 2026
  project_type: automation_system
business:
  primary_goal: Reduce handling time without weakening source traceability
  target_users:
    - News editors
    - Audience editors
product:
  trigger: Per-source scheduled feed polling
  core_flow: Ingest → normalize → deduplicate → draft → human review → publish
  approval_gate: A managing editor must approve every publication
technical:
  inputs: Allow-listed RSS and news APIs
  outputs: Publisher CMS and operator alerts
  retries: Bounded exponential backoff with persisted idempotency keys
  audit: Immutable source, generation, review, and publication-attempt history
quality:
  unsupported_claim_target: zero
  duplicate_publish_target: below 0.5 percent
  observability: Per-stage latency, queue age, failures, and attempt history
```

This scenario exercises automation classification, source licensing, scheduling, citations, fact checks, duplicate detection, mandatory editorial approval, idempotent publishing, monitoring, and cloud/local provider routing without replacing the executable fixture.

## Deterministic Extraction Variant

The extraction regression suite also preserves the scenario's scope and safety rules from mixed prose:

```text
News automation system banana hai for editors. Maqsad handling time reduce krna hai without losing source traceability.
Isme scheduled ingestion, duplicate detection, cited drafts aur editorial approval hona chahiye.
Integrations: RSS feeds, News APIs, Publisher CMS
Security: RBAC, audit logging, human approval zaroori
Future: automatic social distribution
Must not publish without editor approval.
```

The future distribution capability must not become a current feature, and the publication prohibition remains a constraint rather than a guessed implementation.
