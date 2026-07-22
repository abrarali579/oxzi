import { describe, expect, it } from "vitest";

import {
  newsAutomation2026Fixture,
  oxzire3dWebsiteFixture,
  type CanonicalProject,
  type ConflictId,
  type LifecycleStatus,
  type ProjectField,
} from "../project";

import { analyzeDiscovery } from ".";

const cloneOxzire = () => structuredClone(oxzire3dWebsiteFixture);

function prepareLifecycle(project: CanonicalProject, lifecycle: LifecycleStatus = "draft") {
  const lifecycleIndex = project.metadata.lifecycleHistory.findIndex(
    (event) => event.status === lifecycle,
  );
  if (lifecycleIndex < 0) throw new Error(`Fixture does not contain lifecycle ${lifecycle}`);

  project.metadata.lifecycle = lifecycle;
  project.metadata.lifecycleHistory = project.metadata.lifecycleHistory.slice(
    0,
    lifecycleIndex + 1,
  );
  project.metadata.approvalStatus = "not_requested";
  project.metadata.version.approvalStatus = "not_requested";
  delete project.metadata.version.approvedAt;
  delete project.metadata.version.approvedBy;
  return project;
}

function markMissing(field: ProjectField<unknown>) {
  field.value = null;
  field.status = "missing";
  field.confidence = 0;
  field.evidenceIds = [];
  field.approval = { status: "not_requested" };
  delete field.assumption;
  delete field.conflict;
}

describe("analyzeDiscovery", () => {
  it("skips a complete Master Prompt with zero questions", () => {
    const result = analyzeDiscovery(oxzire3dWebsiteFixture);

    expect(result.completeness.criticalCompleteness).toBe(100);
    expect(result.completeness.blockingGapCount).toBe(0);
    expect(result.interview.skipInterview).toBe(true);
    expect(result.questions).toEqual([]);
  });

  it("returns two to three questions for a simple project with three critical gaps", () => {
    const project = prepareLifecycle(cloneOxzire());
    markMissing(project.business.problem);
    markMissing(project.business.targetUsers);
    markMissing(project.scope.inScope);

    const result = analyzeDiscovery(project);

    expect(result.interview.skipInterview).toBe(false);
    expect(result.questions).toHaveLength(3);
    expect(result.questions.every((candidate) => candidate.reason.length > 0)).toBe(true);
    expect(result.questions.every((candidate) => candidate.rankScore > 0)).toBe(true);
  });

  it("caps a complex unclear project at eight questions", () => {
    const project = prepareLifecycle(cloneOxzire());
    const fields = [
      project.identity.name,
      project.business.problem,
      project.business.solution,
      project.business.targetUsers,
      project.business.goals,
      project.scope.inScope,
      project.product.platforms,
      project.product.coreUserFlows,
      project.product.features,
      project.technical.architectureStyle,
      project.technical.security,
      project.technical.deployment,
    ];
    fields.forEach(markMissing);

    const result = analyzeDiscovery(project);

    expect(result.rankedCandidates.length).toBeGreaterThan(8);
    expect(result.questions).toHaveLength(8);
    expect(result.interview.hardMaximum).toBe(8);
  });

  it("does not skip when a blocking conflict remains", () => {
    const project = prepareLifecycle(cloneOxzire());
    const conflictId = "conflict_discovery_primary_goal" as ConflictId;
    project.business.goals.status = "conflicted";
    project.business.goals.approval = { status: "not_requested" };
    project.business.goals.conflict = {
      conflictId,
      status: "open",
      severity: "blocking",
    };
    project.meta.conflicts.push({
      id: conflictId,
      fieldIds: [project.business.goals.id],
      evidenceIds: [project.meta.evidence[0]!.id],
      summary: "The primary conversion goal conflicts across two explicit sources.",
      severity: "blocking",
      status: "open",
      createdAt: "2026-07-22T10:00:00.000Z",
    });

    const result = analyzeDiscovery(project);

    expect(result.completeness.blockingConflictCount).toBe(1);
    expect(result.interview.skipInterview).toBe(false);
    expect(result.rankedCandidates[0]?.questionCategory).toBe("conflict");
  });

  it("uses a safe default instead of asking a question", () => {
    const project = prepareLifecycle(cloneOxzire());
    markMissing(project.visual.avoidList);
    markMissing(project.visual.typography);

    const result = analyzeDiscovery(project);
    const defaultPaths = result.completeness.safeDefaults.map((item) => item.fieldPath);

    expect(defaultPaths).toContain("visual.avoidList");
    expect(defaultPaths).toContain("visual.typography");
    expect(result.rankedCandidates).toEqual([]);
    expect(result.interview.skipInterview).toBe(true);
  });

  it("ranks a critical missing field above a cosmetic field", () => {
    const project = prepareLifecycle(cloneOxzire());
    markMissing(project.business.problem);
    markMissing(project.visual.colors);

    const result = analyzeDiscovery(project);
    const criticalIndex = result.rankedCandidates.findIndex(
      (candidate) => candidate.fieldPath === "business.problem",
    );
    const cosmeticIndex = result.rankedCandidates.findIndex(
      (candidate) => candidate.fieldPath === "visual.colors",
    );

    expect(criticalIndex).toBeGreaterThanOrEqual(0);
    expect(cosmeticIndex).toBeGreaterThan(criticalIndex);
  });

  it("prefers a selectable low-typing-cost question when impact is otherwise equal", () => {
    const project = prepareLifecycle(cloneOxzire());
    markMissing(project.quality.localization);
    markMissing(project.quality.accessibility);

    const result = analyzeDiscovery(project);
    const localization = result.rankedCandidates.find(
      (candidate) => candidate.fieldPath === "quality.localization",
    );
    const accessibility = result.rankedCandidates.find(
      (candidate) => candidate.fieldPath === "quality.accessibility",
    );

    expect(localization?.suggestedAnswerMode).toBe("multi_select");
    expect(localization?.freeTextNecessary).toBe(false);
    expect(localization?.rankScore).toBeGreaterThan(accessibility?.rankScore ?? 0);
  });

  it("changes field relevance with lifecycle phase", () => {
    const draft = prepareLifecycle(cloneOxzire());
    markMissing(draft.execution.milestones);

    const review = prepareLifecycle(cloneOxzire(), "understanding_review");
    markMissing(review.execution.milestones);

    const draftResult = analyzeDiscovery(draft);
    const reviewResult = analyzeDiscovery(review);

    expect(
      draftResult.fields.find((field) => field.path === "execution.milestones")?.relevant,
    ).toBe(false);
    expect(
      reviewResult.fields.find((field) => field.path === "execution.milestones")?.relevant,
    ).toBe(true);
    expect(
      reviewResult.rankedCandidates.some(
        (candidate) => candidate.fieldPath === "execution.milestones",
      ),
    ).toBe(true);
  });

  it("treats accepted permitted assumptions as sufficiently resolved", () => {
    const project = prepareLifecycle(cloneOxzire());
    project.scope.assumptionSummaries.status = "inferred";
    project.scope.assumptionSummaries.approval = { status: "not_requested" };

    const result = analyzeDiscovery(project);
    const assessment = result.fields.find((field) => field.path === "scope.assumptionSummaries");

    expect(assessment?.resolution).toBe("accepted_assumption");
    expect(assessment?.sufficientlyResolved).toBe(true);
  });

  it("does not treat an unresolved critical inference as fully resolved", () => {
    const project = prepareLifecycle(cloneOxzire());
    project.technical.security.status = "inferred";
    project.technical.security.confidence = 95;
    project.technical.security.approval = { status: "pending" };

    const result = analyzeDiscovery(project);
    const assessment = result.fields.find((field) => field.path === "technical.security");

    expect(assessment?.resolution).toBe("partial_inference");
    expect(assessment?.resolutionRatio).toBeLessThanOrEqual(0.5);
    expect(result.completeness.requiredApprovalCount).toBe(1);
    expect(result.interview.skipInterview).toBe(false);
  });

  it("produces deterministic scores and tie ordering", () => {
    const project = prepareLifecycle(cloneOxzire());
    markMissing(project.visual.colors);
    markMissing(project.visual.visualKeywords);
    markMissing(project.business.problem);

    expect(analyzeDiscovery(project)).toEqual(analyzeDiscovery(structuredClone(project)));
  });

  it("scores and skips the concrete Oxzire fixture", () => {
    const result = analyzeDiscovery(oxzire3dWebsiteFixture);

    expect(result.completeness.overallCompleteness).toBe(100);
    expect(result.completeness.acceptedAssumptionCount).toBe(1);
    expect(result.interview.skipInterview).toBe(true);
  });

  it("scores and skips the concrete News Automation fixture", () => {
    const result = analyzeDiscovery(newsAutomation2026Fixture);

    expect(result.completeness.criticalCompleteness).toBe(100);
    expect(result.completeness.unresolvedConflictCount).toBe(0);
    expect(result.questions).toHaveLength(0);
  });
});
