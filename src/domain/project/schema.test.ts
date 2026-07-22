import { describe, expect, it } from "vitest";

import {
  canonicalProjectSchema,
  newsAutomation2026Fixture,
  oxzire3dWebsiteFixture,
  parseCanonicalProject,
  serializeCanonicalProject,
  type ConflictId,
  type EvidenceId,
} from ".";

const cloneOxzire = () => structuredClone(oxzire3dWebsiteFixture);

function createMinimumProject() {
  const project = cloneOxzire();
  project.metadata.lifecycle = "draft";
  project.metadata.approvalStatus = "not_requested";
  project.metadata.lifecycleHistory = [project.metadata.lifecycleHistory[0]!];
  project.metadata.version.approvalStatus = "not_requested";
  delete project.metadata.version.approvedAt;
  delete project.metadata.version.approvedBy;

  const groups = [
    project.identity,
    project.business,
    project.scope,
    project.product,
    project.visual,
    project.technical,
    project.quality,
    project.execution,
  ];

  for (const group of groups) {
    for (const field of Object.values(group)) {
      field.value = null;
      field.status = "missing";
      field.confidence = 0;
      field.evidenceIds = [];
      field.approval = { status: "not_requested" };
      delete field.assumption;
      delete field.conflict;
    }
  }

  project.meta.evidence = [];
  project.meta.assumptions = [];
  project.meta.decisions = [];
  project.meta.conflicts = [];
  project.meta.completeness = {
    criticalCompleteness: 0,
    overallCompleteness: 0,
    contradictionCount: 0,
    blockingQuestionCount: 12,
    assumptionCount: 0,
  };

  return project;
}

describe("canonicalProjectSchema", () => {
  it("accepts a valid minimum draft project", () => {
    expect(canonicalProjectSchema.safeParse(createMinimumProject()).success).toBe(true);
  });

  it("accepts a valid complete project", () => {
    const parsed = parseCanonicalProject(oxzire3dWebsiteFixture);

    expect(parsed.metadata.lifecycle).toBe("approved");
    expect(parsed.meta.completeness.criticalCompleteness).toBe(100);
  });

  it("rejects confidence outside the zero-to-one-hundred range", () => {
    const project = cloneOxzire();
    project.identity.name.confidence = 101;

    expect(canonicalProjectSchema.safeParse(project).success).toBe(false);
  });

  it("rejects evidence references that do not resolve", () => {
    const project = cloneOxzire();
    project.identity.name.evidenceIds = ["evidence_missing" as EvidenceId];

    const result = canonicalProjectSchema.safeParse(project);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.message.includes("unknown evidence"))).toBe(
        true,
      );
    }
  });

  it("rejects an unresolved critical conflict in an architecture-ready project", () => {
    const project = cloneOxzire();
    const conflictId = "conflict_oxzire_3d_hero" as ConflictId;
    project.visual.threeDRules.status = "conflicted";
    project.visual.threeDRules.conflict = {
      conflictId,
      status: "open",
      severity: "blocking",
    };
    project.meta.conflicts.push({
      id: conflictId,
      fieldIds: [project.visual.threeDRules.id],
      evidenceIds: [project.meta.evidence[0]!.id],
      summary: "The source simultaneously requires and prohibits 3D rendering.",
      severity: "blocking",
      status: "open",
      createdAt: "2026-07-22T10:00:00.000Z",
    });

    const result = canonicalProjectSchema.safeParse(project);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((issue) => issue.message.includes("Architecture-ready")),
      ).toBe(true);
    }
  });

  it("rejects an approved project version containing a placeholder", () => {
    const project = cloneOxzire();
    project.identity.name.value = "[placeholder: project name]";

    const result = canonicalProjectSchema.safeParse(project);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.message.includes("placeholders"))).toBe(
        true,
      );
    }
  });

  it("rejects an accepted assumption without rationale", () => {
    const project = cloneOxzire();
    delete project.meta.assumptions[0]!.rationale;

    const result = canonicalProjectSchema.safeParse(project);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((issue) => issue.message.includes("requires rationale")),
      ).toBe(true);
    }
  });

  it("rejects an invalid lifecycle transition", () => {
    const project = cloneOxzire();
    project.metadata.lifecycleHistory[1]!.status = "approved";

    const result = canonicalProjectSchema.safeParse(project);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.message.includes("Invalid lifecycle"))).toBe(
        true,
      );
    }
  });

  it("rejects server-secret keys in public environment data", () => {
    const project = cloneOxzire();
    project.technical.publicEnvironment.value = {
      NEXT_PUBLIC_SITE_URL: "https://oxzire.example",
      NEXT_PUBLIC_API_SECRET: "not-a-real-secret",
    };

    const result = canonicalProjectSchema.safeParse(project);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.message.includes("non-secret"))).toBe(true);
    }
  });

  it("validates the concrete Oxzire 3D Website fixture", () => {
    expect(canonicalProjectSchema.safeParse(oxzire3dWebsiteFixture).success).toBe(true);
  });

  it("validates the concrete News Website Automation Systems 2026 fixture", () => {
    expect(canonicalProjectSchema.safeParse(newsAutomation2026Fixture).success).toBe(true);
  });

  it("parses and serializes deterministically through a JSON-safe round trip", () => {
    const first = serializeCanonicalProject(newsAutomation2026Fixture);
    const reparsed = JSON.parse(first) as unknown;
    const second = serializeCanonicalProject(reparsed);

    expect(second).toBe(first);
    expect(JSON.parse(second)).toEqual(parseCanonicalProject(newsAutomation2026Fixture));
  });
});
