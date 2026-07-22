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

  it("extracts a Roman Urdu project description conservatively", () => {
    const result = extractCanonicalUpdates({
      sources: [
        source(
          `Mujhe clients ke liye website bnana hai. Mera maqsad qualified leads generate krna hai. Isme portfolio aur contact form hona chahye. Design minimal aur dark/light mode hoga. English aur Roman Urdu zaban support karna hoga. Vercel pe host karna hoga.`,
          "plain_text",
          "source_roman_urdu",
        ),
      ],
    });

    expect(updatesFor(result, "identity.projectType")[0]?.value).toBe("website");
    expect(updatesFor(result, "business.targetUsers")[0]?.value).toEqual([
      expect.objectContaining({ name: "Clients" }),
    ]);
    expect(updatesFor(result, "business.goals")[0]?.value).toEqual([
      expect.objectContaining({ name: expect.stringMatching(/qualified leads/i) }),
    ]);
    expect(updatesFor(result, "product.features")[0]?.value).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "Portfolio" }),
        expect.objectContaining({ name: "Contact form" }),
      ]),
    );
    expect(updatesFor(result, "visual.visualKeywords")[0]?.value).toContain("Minimal");
    expect(updatesFor(result, "visual.themes")[0]?.value).toContain("Dark and light");
    expect(updatesFor(result, "quality.localization")[0]?.value).toEqual(
      expect.arrayContaining(["English", "Roman Urdu"]),
    );
    expect(updatesFor(result, "technical.deployment")[0]?.value).toBe("Vercel");
  });

  it("extracts a mixed Roman Urdu and English Master Prompt", () => {
    const result = extractCanonicalUpdates({
      sources: [
        source(
          `Project Type: SaaS app
Maqsad: operations automate krna hai
Kis ke liye: support teams
Functionality: shared inbox, audit history
Tech Stack: NextJS, Postgres
Security: RBAC zaroori
Later: billing
Language: English, Roman Urdu`,
          "master_prompt",
          "source_mixed_master",
        ),
      ],
    });

    expect(updatesFor(result, "identity.projectType")[0]?.value).toBe("saas_application");
    expect(updatesFor(result, "business.goals")[0]?.value).toEqual([
      expect.objectContaining({ name: expect.stringMatching(/operations automate/i) }),
    ]);
    expect(updatesFor(result, "business.targetUsers")[0]?.value).toEqual([
      expect.objectContaining({ name: "Support teams" }),
    ]);
    expect(updatesFor(result, "technical.preferredStack")[0]?.value).toEqual(
      expect.arrayContaining(["Next.js", "PostgreSQL"]),
    );
    expect(updatesFor(result, "technical.security")[0]?.value).toContain(
      "Role-based access control",
    );
    expect(updatesFor(result, "scope.outOfScope")[0]?.value).toContain("Deferred: Billing");
    expect(
      (updatesFor(result, "product.features")[0]?.value as Array<{ name: string }>).map(
        (feature) => feature.name,
      ),
    ).not.toContain("Billing");
  });

  it("extracts explicit fields from a sectionless paragraph", () => {
    const result = extractCanonicalUpdates({
      sources: [
        source(
          `We are building a SaaS application for logistics teams. The goal is reduce scheduling errors. It should include a dispatch board, alerts, and export. The problem is operators use disconnected spreadsheets. The solution is a shared live workspace.`,
          "plain_text",
          "source_sectionless",
        ),
      ],
    });

    expect(updatesFor(result, "identity.projectType")[0]?.value).toBe("saas_application");
    expect(updatesFor(result, "business.targetUsers")[0]?.value).toEqual([
      expect.objectContaining({ name: "Logistics teams" }),
    ]);
    expect(updatesFor(result, "business.problem")[0]?.value).toMatch(/operators use/i);
    expect(updatesFor(result, "business.solution")[0]?.value).toMatch(/shared live workspace/i);
    expect(updatesFor(result, "product.features")[0]?.value).toHaveLength(3);
    expect(updatesFor(result, "product.features")[0]?.confidence).toBeLessThan(92);
  });

  it("preserves negative constraints without extracting prohibited choices as current", () => {
    const result = extractCanonicalUpdates({
      sources: [
        source(
          `Do not use NextJS. Must not expose private keys. Avoid crowded layouts.`,
          "plain_text",
          "source_negative",
        ),
      ],
    });

    expect(updatesFor(result, "scope.constraints")[0]?.value).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/do not use nextjs/i),
        expect.stringMatching(/must not expose private keys/i),
      ]),
    );
    expect(updatesFor(result, "visual.avoidList")[0]?.value).toContain("Crowded layouts");
    expect(updatesFor(result, "technical.preferredStack")).toHaveLength(0);
  });

  it("keeps deferred features out of current required features", () => {
    const result = extractCanonicalUpdates({
      sources: [
        source(
          `Features:
- dashboard
Later: authentication`,
          "master_prompt",
          "source_deferred",
        ),
      ],
    });

    const features = updatesFor(result, "product.features")[0]?.value as Array<{ name: string }>;
    expect(features.map((feature) => feature.name)).toEqual(["Dashboard"]);
    expect(updatesFor(result, "scope.outOfScope")[0]?.value).toContain("Deferred: Authentication");
  });

  it("normalizes an explicit out-of-scope statement", () => {
    const result = extractCanonicalUpdates({
      sources: [source("Authentication is out of scope.", "plain_text", "source_out_scope")],
    });

    expect(updatesFor(result, "scope.outOfScope")[0]?.value).toEqual(["Authentication"]);
    expect(updatesFor(result, "product.features")).toHaveLength(0);
  });

  it("distinguishes current-MVP scope from an undecided capability", () => {
    const result = extractCanonicalUpdates({
      sources: [
        source(
          `MVP includes export. Authentication is undecided.`,
          "plain_text",
          "source_scope_states",
        ),
      ],
    });

    expect(updatesFor(result, "scope.inScope")[0]?.value).toEqual(["Export"]);
    expect(updatesFor(result, "scope.outOfScope")[0]?.value).toEqual(["Undecided: Authentication"]);
  });

  it("segments mixed bullets, prose, semicolons, and inline headings", () => {
    const result = extractCanonicalUpdates({
      sources: [
        source(
          `Features:
- search, export
2. audit history
Deployment: Vercel; Languages: English, Bhasa Indonesia`,
          "master_prompt",
          "source_mixed_segments",
        ),
      ],
    });

    expect(updatesFor(result, "product.features")[0]?.value).toHaveLength(3);
    expect(updatesFor(result, "technical.deployment")[0]?.value).toBe("Vercel");
    expect(updatesFor(result, "quality.localization")[0]?.value).toEqual(
      expect.arrayContaining(["English", "Bahasa Indonesia"]),
    );
  });

  it("supports reviewed Roman Urdu spelling variations", () => {
    const result = extractCanonicalUpdates({
      sources: [
        source(
          `Mery goal onboarding fast krna hai. Isme export hona chahye. Mobile first hoga. Abhi authentication ni chahiye.`,
          "plain_text",
          "source_spelling_variants",
        ),
      ],
    });

    expect(updatesFor(result, "business.goals")[0]?.value).toHaveLength(1);
    expect(updatesFor(result, "product.features")[0]?.value).toEqual([
      expect.objectContaining({ name: "Export" }),
    ]);
    expect(updatesFor(result, "product.platforms")[0]?.value).toContain("Responsive web");
    expect(updatesFor(result, "scope.outOfScope")[0]?.value).toContain("Deferred: Authentication");
  });

  it("normalizes common technology, language, theme, SaaS, and agent aliases", () => {
    const result = extractCanonicalUpdates({
      sources: [
        source(
          `Project Type: software-as-a-service
Tech Stack: NextJS, Postgres, Codex, Cursor, Claude Code, Gemini CLI
Language: Bahasa
Visual: dark mode and light mode`,
          "master_prompt",
          "source_aliases",
        ),
      ],
    });

    expect(updatesFor(result, "identity.projectType")[0]?.value).toBe("saas_application");
    expect(updatesFor(result, "technical.preferredStack")[0]?.value).toEqual(
      expect.arrayContaining([
        "Next.js",
        "PostgreSQL",
        "Codex",
        "Cursor",
        "Claude Code",
        "Gemini CLI",
      ]),
    );
    expect(updatesFor(result, "quality.localization")[0]?.value).toEqual(["Bahasa Indonesia"]);
    expect(updatesFor(result, "visual.themes")[0]?.value).toContain("Dark and light");
  });

  it("leaves an ambiguous unsupported sentence unmatched", () => {
    const result = extractCanonicalUpdates({
      sources: [source("We are still thinking about it.", "plain_text", "source_ambiguous")],
    });

    expect(result.updates).toEqual([]);
    expect(result.conflicts).toEqual([]);
    expect(result.unmatchedSegmentCount).toBe(1);
  });

  it("blocks a capability stated as both current and deferred", () => {
    const result = extractCanonicalUpdates({
      sources: [
        source(
          `Features: authentication
Later: authentication`,
          "master_prompt",
          "source_temporal_conflict",
        ),
      ],
    });

    expect(
      result.conflicts.some(
        (conflict) =>
          conflict.fieldPaths.includes("product.features") &&
          conflict.fieldPaths.includes("scope.outOfScope"),
      ),
    ).toBe(true);
    expect(updatesFor(result, "product.features")[0]?.disposition).toBe("blocked_conflict");
    expect(updatesFor(result, "scope.outOfScope")[0]?.disposition).toBe("blocked_conflict");
  });

  it("redacts secret-shaped values while preserving harmless project identifiers", () => {
    const secret = "sk-proj-abcdefghijklmnopqrstuvwxyz";
    const harmlessIdentifier = "project_oxzi_release_2026";
    const result = extractCanonicalUpdates({
      sources: [
        source(
          `Features: export with api_key=${secret}, ${harmlessIdentifier}`,
          "uploaded_notes",
          "source_secret",
        ),
      ],
    });
    const serialized = JSON.stringify(result);

    expect(serialized).not.toContain(secret);
    expect(serialized).toContain("[REDACTED]");
    expect(serialized).toContain(harmlessIdentifier);
    for (const update of result.updates) {
      for (const evidence of update.evidence) expect(evidence.excerpt).not.toContain(secret);
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
