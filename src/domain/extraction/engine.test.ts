import { describe, expect, it } from "vitest";

import { oxzire3dWebsiteFixture } from "../project";
import {
  extractCanonicalUpdates,
  type ExtractableFieldPath,
  type ExtractionSource,
  type ExtractionSourceKind,
} from ".";

const CAPTURED_AT = "2026-07-22T12:00:00.000Z";

function source(
  content: string,
  kind: ExtractionSourceKind = "plain_text",
  sourceId = "source_test",
): ExtractionSource {
  return { sourceId, kind, content, capturedAt: CAPTURED_AT };
}

function updatesFor(
  result: ReturnType<typeof extractCanonicalUpdates>,
  fieldPath: ExtractableFieldPath,
) {
  return result.updates.filter((update) => update.fieldPath === fieldPath);
}

describe("extractCanonicalUpdates", () => {
  it("extracts normalized canonical updates from a simple prompt", () => {
    const result = extractCanonicalUpdates({
      sources: [
        source(`Build a responsive website for creative agencies. The goal is to generate qualified leads.
Features: portfolio case studies, contact form
Deployment: Vercel`),
      ],
    });

    expect(updatesFor(result, "identity.projectType")[0]?.value).toBe("website");
    expect(updatesFor(result, "business.targetUsers")[0]?.value).toEqual([
      expect.objectContaining({ name: "Creative agencies" }),
    ]);
    expect(updatesFor(result, "business.goals")[0]?.value).toEqual([
      expect.objectContaining({ name: "To generate qualified leads" }),
    ]);
    expect(updatesFor(result, "product.features")[0]?.value).toHaveLength(2);
    expect(updatesFor(result, "technical.deployment")[0]?.value).toBe("Vercel");

    for (const update of result.updates) {
      expect(update.confidence).toBeGreaterThan(0);
      expect(update.evidence.length).toBeGreaterThan(0);
      expect(update.sources.length).toBeGreaterThan(0);
      expect(update.reasoning.length).toBeGreaterThan(0);
      expect(["explicit", "inferred"]).toContain(update.explicitness);
    }
  });

  it("extracts all required domains from a large Master Prompt", () => {
    const result = extractCanonicalUpdates({
      sources: [
        source(
          `# Atlas Operations Platform
Project Name: Atlas Operations
Project Type: SaaS
Problem: Distributed operators lose incident context across disconnected tools.
Solution: A shared operational workspace with durable audit history.
Goals:
- Primary: reduce incident response time
- improve audit readiness
Target Users:
- Operators who need one live incident timeline
- Managers who need measurable response data
Features:
- Must provide role-based workspaces
- Required incident timeline
- Optional executive dashboard
Constraints:
- Must keep an immutable audit log
- Must support organization SSO
Integrations:
- Slack
- GitHub
Visual Direction:
- calm, technical, high information density
Tech Stack:
- Next.js
- TypeScript
- PostgreSQL
Assumptions:
- Customers already have an identity provider
Risks:
- High: delayed webhooks -> use idempotent retries
Languages:
- English
- Bahasa Indonesia
Deployment: AWS
Security:
- Role-based access control
- Encryption at rest
Priorities:
- Incident response workflow
- Auditability`,
          "master_prompt",
          "source_master",
        ),
      ],
    });

    const paths = new Set(result.updates.map((update) => update.fieldPath));
    for (const requiredPath of [
      "business.goals",
      "business.targetUsers",
      "product.features",
      "scope.constraints",
      "technical.integrations",
      "visual.visualKeywords",
      "technical.preferredStack",
      "scope.assumptionSummaries",
      "execution.risks",
      "quality.localization",
      "technical.deployment",
      "technical.security",
      "scope.inScope",
    ] as const) {
      expect(paths.has(requiredPath)).toBe(true);
    }

    const features = updatesFor(result, "product.features")[0]?.value as Array<{
      priority: string;
    }>;
    expect(features.map((feature) => feature.priority)).toEqual(["must", "must", "could"]);
  });

  it("merges duplicated information and retains all evidence", () => {
    const result = extractCanonicalUpdates({
      sources: [
        source("Features: editorial approval", "uploaded_notes", "source_notes_a"),
        source("Features: editorial approval", "master_prompt", "source_notes_b"),
      ],
    });

    const featureUpdate = updatesFor(result, "product.features")[0];
    expect(featureUpdate?.value).toHaveLength(1);
    expect(featureUpdate?.evidence.length).toBeGreaterThanOrEqual(2);
    expect(featureUpdate?.sources).toHaveLength(2);
  });

  it("detects incompatible information instead of choosing silently", () => {
    const result = extractCanonicalUpdates({
      sources: [
        source("Deployment: Vercel\nTech Stack: React", "uploaded_notes", "source_cloud"),
        source(
          "Deployment: Local-only deployment\nTech Stack: Vue",
          "uploaded_notes",
          "source_local",
        ),
      ],
    });

    expect(
      result.conflicts.some((conflict) => conflict.fieldPaths.includes("technical.deployment")),
    ).toBe(true);
    expect(
      result.conflicts.some((conflict) => conflict.fieldPaths.includes("technical.preferredStack")),
    ).toBe(true);
    expect(
      updatesFor(result, "technical.deployment").every(
        (update) => update.disposition === "blocked_conflict",
      ),
    ).toBe(true);
  });

  it("returns no fabricated values when information is missing", () => {
    const result = extractCanonicalUpdates({
      sources: [source("I have an early idea but no requirements are decided yet.")],
    });

    expect(result.updates).toEqual([]);
    expect(result.conflicts).toEqual([]);
    expect(result.unmatchedSegmentCount).toBe(1);
  });

  it("extracts multilingual English and Bahasa Indonesia input", () => {
    const result = extractCanonicalUpdates({
      sources: [
        source(
          `Buat situs web modern untuk UMKM.
Tujuan: meningkatkan qualified leads
Pengguna: pemilik UMKM yang ingin menampilkan layanan
Fitur: katalog layanan, formulir kontak
Bahasa: Bahasa Indonesia dan English
Keamanan: Harus menggunakan rate limiting
Deployment: Vercel`,
          "plain_text",
          "source_multilingual",
        ),
      ],
    });

    expect(updatesFor(result, "identity.projectType")[0]?.value).toBe("website");
    expect(updatesFor(result, "quality.localization")[0]?.value).toEqual(
      expect.arrayContaining(["Bahasa Indonesia", "English"]),
    );
    expect(updatesFor(result, "technical.security")[0]?.value).toEqual(
      expect.arrayContaining(["Rate limiting"]),
    );
    expect(updatesFor(result, "business.targetUsers")[0]?.value).toEqual([
      expect.objectContaining({ name: "Pemilik UMKM" }),
    ]);
  });

  it("extracts the Oxzire Website scenario", () => {
    const result = extractCanonicalUpdates({
      sources: [
        source(
          `Project Name: Oxzire 3D Website
Project Type: Website
Goals: generate qualified creative-production enquiries
Target Users: brand producers who need to assess visual quality quickly
Features: adaptive 3D hero, captioned video case studies, localized CMS
Constraints: Must remain mobile-first and must provide a static fallback for WebGL
Visual Direction: cinematic, premium, editorial, dark and light
Tech Stack: Next.js, TypeScript, Three.js, WebGL
Integrations: Headless CMS, transactional email
Languages: English, Bahasa Indonesia
Deployment: Vercel
Security: rate limiting, server-side authorization
Risks: High: heavy 3D assets -> use compressed assets and poster fallbacks`,
          "master_prompt",
          "source_oxzire",
        ),
      ],
    });

    expect(updatesFor(result, "visual.visualKeywords")[0]?.value).toEqual(
      expect.arrayContaining(["Cinematic", "Premium", "Editorial"]),
    );
    expect(updatesFor(result, "technical.preferredStack")[0]?.value).toEqual(
      expect.arrayContaining(["Next.js", "TypeScript", "Three.js", "WebGL"]),
    );
    expect(updatesFor(result, "quality.localization")[0]?.value).toEqual(
      expect.arrayContaining(["English", "Bahasa Indonesia"]),
    );
    expect(result.conflicts).toHaveLength(0);
  });

  it("extracts the News Automation scenario", () => {
    const result = extractCanonicalUpdates({
      sources: [
        source(
          `Project Type: automation system
Goals: reduce editorial handling time, preserve source traceability
Target Users: news editors who need to verify every claim
Features: scheduled ingestion, semantic duplicate detection, cited AI drafts, mandatory editorial approval, idempotent publishing
Constraints: Must never publish without human approval and must retain audit history
Integrations: RSS feeds, News APIs, OpenAI-compatible model, Publisher CMS
Tech Stack: Next.js, TypeScript, PostgreSQL, Redis
Security: role-based access control, audit logging, human approval required
Risks: Blocking: unsupported generated claims -> require claim-level citations
Deployment: AWS`,
          "master_prompt",
          "source_news",
        ),
      ],
    });

    expect(updatesFor(result, "identity.projectType")[0]?.value).toBe("automation_system");
    const integrations = updatesFor(result, "technical.integrations")[0]?.value as Array<{
      name: string;
    }>;
    expect(integrations.map((integration) => integration.name)).toEqual(
      expect.arrayContaining([
        "RSS feeds",
        "News APIs",
        "OpenAI-compatible model",
        "Publisher CMS",
      ]),
    );
    expect(updatesFor(result, "technical.security")[0]?.value).toEqual(
      expect.arrayContaining([
        "Role-based access control",
        "Audit logging",
        "Human approval required",
      ]),
    );
  });

  it("never proposes overwriting an approved canonical field", () => {
    const result = extractCanonicalUpdates({
      sources: [source("Deployment: AWS", "uploaded_notes", "source_new_deployment")],
      existingProject: oxzire3dWebsiteFixture,
    });

    const deployment = updatesFor(result, "technical.deployment")[0];
    expect(deployment?.disposition).toBe("blocked_approved");
    expect(deployment?.fieldId).toBe(oxzire3dWebsiteFixture.technical.deployment.id);
    expect(result.protectedFields).toEqual([
      expect.objectContaining({ fieldPath: "technical.deployment" }),
    ]);
  });

  it("treats assistant statements in imported AI conversations as inferred", () => {
    const result = extractCanonicalUpdates({
      sources: [
        source(
          `User: Features: workspace export
Assistant: Tech Stack: Next.js`,
          "ai_conversation",
          "source_conversation",
        ),
      ],
    });

    expect(updatesFor(result, "product.features")[0]?.explicitness).toBe("explicit");
    expect(updatesFor(result, "technical.preferredStack")[0]?.explicitness).toBe("inferred");
    expect(updatesFor(result, "technical.preferredStack")[0]?.sources[0]?.speaker).toBe(
      "assistant",
    );
  });

  it("produces deterministic output for identical source metadata", () => {
    const request = {
      sources: [source("Features: export, audit history\nDeployment: Vercel")],
    };

    expect(extractCanonicalUpdates(request)).toEqual(extractCanonicalUpdates(request));
  });
});
