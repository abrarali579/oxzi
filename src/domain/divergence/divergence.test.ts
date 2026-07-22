import { describe, expect, it } from "vitest";

import { contentFingerprint } from "../knowledge-graph";
import {
  candidateClusterSchema,
  candidateIdeaSchema,
  cognitiveFrameMetadataSchema,
  cognitiveFrameSchema,
  criticResultSchema,
  divergenceActivationDecisionSchema,
  divergenceCostEstimateSchema,
  divergenceReportSchema,
  serializeDivergenceContract,
  trapFindingSchema,
} from ".";

const fingerprint = contentFingerprint({ fixture: "divergence" });
const agent = { profileId: "agent_profile_local", revision: 1, fingerprint };
const frameMetadata = {
  id: "frame_security",
  title: "Security adversary",
  activationDomains: ["security"],
  problemTypes: ["architecture"],
  risk: "low",
  expectedNovelty: "high",
  contextOverheadTokens: 50,
  incompatibleConditions: [],
  evaluationHistoryRefs: [],
  version: "1",
  enabled: true,
};
const candidate = {
  id: "candidate_zero_trust",
  requestId: "divergence_request_auth",
  branchId: "branch_security",
  frameId: "frame_security",
  title: "Zero trust boundary",
  approach: "Isolate privileges",
  assumptions: [],
  risks: [],
  firstValidationStep: "Threat model",
  evidenceRefs: [],
  siblingResultRefs: [],
  approvalState: "proposal",
  generatorProfile: agent,
  inputContextFingerprint: fingerprint,
  outputHash: `sha256:${"a".repeat(64)}`,
  createdAt: "2026-07-23T00:00:00.000Z",
  tokenUsage: 100,
  privacyClassification: "internal",
  version: "1",
  freshness: "current",
};
const cost = {
  sharedBaseContextTokens: 100,
  contextPerBranchTokens: 200,
  branchCount: 2,
  repeatedBranchContextTokens: 400,
  expectedBranchOutputTokens: 100,
  criticTokens: 100,
  clusteringTokens: 50,
  deepeningCount: 1,
  deepeningTokens: 100,
  orchestrationOverheadTokens: 50,
  totalEstimatedTokens: 1000,
  latencyEstimateMs: null,
  expectedDecisionValue: "high",
};

describe("divergent reasoning contracts", () => {
  it("accepts a versioned cognitive frame", () => {
    expect(
      cognitiveFrameSchema.parse({
        metadata: frameMetadata,
        frameInstruction: "Inspect attack paths",
      }).metadata.id,
    ).toBe("frame_security");
  });
  it("separates frame instructions from discovery metadata", () => {
    expect(cognitiveFrameMetadataSchema.parse(frameMetadata).title).toBe("Security adversary");
    expect(() =>
      cognitiveFrameMetadataSchema.parse({ ...frameMetadata, frameInstruction: "hidden" }),
    ).toThrow();
  });
  it("mechanically isolates branches from sibling results", () => {
    expect(candidateIdeaSchema.parse(candidate).siblingResultRefs).toEqual([]);
    expect(() =>
      candidateIdeaSchema.parse({ ...candidate, siblingResultRefs: ["branch_other"] }),
    ).toThrow();
  });
  it("keeps generator output free of critic scores", () => {
    expect(() => candidateIdeaSchema.parse({ ...candidate, criticScore: 90 })).toThrow();
  });
  it("requires critic scores to reference declared candidates", () => {
    const score = {
      candidateId: "candidate_other",
      dimension: "safety",
      value: 80,
      status: "passed",
      reason: "safe",
      evaluator: agent,
      confidence: 80,
      evidenceRefs: [],
      version: "1",
      hardConstraint: true,
    };
    expect(() =>
      criticResultSchema.parse({
        requestId: "divergence_request_auth",
        criticProfile: agent,
        candidateIds: [candidate.id],
        scores: [score],
        evidenceRefs: [],
        version: "1",
      }),
    ).toThrow(/declared candidates/);
  });
  it("validates cluster candidate identifiers", () => {
    expect(
      candidateClusterSchema.parse({
        id: "cluster_security",
        requestId: "divergence_request_auth",
        label: "Isolation",
        underlyingApproach: "Privilege boundaries",
        candidateIds: [candidate.id],
        evidenceRefs: [],
        version: "1",
      }).candidateIds,
    ).toEqual([candidate.id]);
  });
  it("requires trap explanations", () => {
    const trap = {
      id: "trap_cost",
      candidateId: candidate.id,
      category: "false_economy",
      explanation: "Operational cost is hidden",
      severity: "high",
      evidenceRefs: [],
      mitigation: "Measure operations",
      rejectCandidate: false,
    };
    expect(trapFindingSchema.parse(trap).category).toBe("false_economy");
    expect(() => trapFindingSchema.parse({ ...trap, explanation: "" })).toThrow();
  });
  it("blocks hard safety failures from selection", () => {
    const score = {
      candidateId: candidate.id,
      dimension: "safety",
      value: 0,
      status: "failed",
      reason: "unsafe",
      evaluator: agent,
      confidence: 100,
      evidenceRefs: ["security:1"],
      version: "1",
      hardConstraint: true,
    };
    const cluster = {
      id: "cluster_security",
      requestId: "divergence_request_auth",
      label: "Isolation",
      underlyingApproach: "Boundary",
      candidateIds: [candidate.id],
      evidenceRefs: [],
      version: "1",
    };
    const report = {
      requestId: "divergence_request_auth",
      candidateIds: [candidate.id],
      clusters: [cluster],
      scores: [score],
      traps: [],
      deepenedCandidates: [],
      shortlistIds: [candidate.id],
      nonObviousViableCandidateId: null,
      recommendationCandidateId: candidate.id,
      unresolvedDecision: null,
      firstValidationStep: "Threat model",
      status: "proposal",
      artifactRefs: [],
      version: "1",
    };
    expect(() => divergenceReportSchema.parse(report)).toThrow(/Hard safety/);
  });
  it("includes repeated branch context in divergence cost", () => {
    expect(divergenceCostEstimateSchema.parse(cost).repeatedBranchContextTokens).toBe(400);
    expect(() =>
      divergenceCostEstimateSchema.parse({ ...cost, repeatedBranchContextTokens: 200 }),
    ).toThrow(/every isolated branch/);
  });
  it("blocks activation when budget is insufficient", () => {
    const decision = {
      requestId: "divergence_request_auth",
      decision: "blocked_by_budget",
      reason: "Budget below cost",
      costEstimate: cost,
      availableBudgetTokens: 500,
      selectedMode: null,
    };
    expect(divergenceActivationDecisionSchema.parse(decision).decision).toBe("blocked_by_budget");
    expect(() =>
      divergenceActivationDecisionSchema.parse({ ...decision, decision: "recommended" }),
    ).toThrow(/block activation/);
  });
  it("keeps generated ideas as proposals", () => {
    expect(candidateIdeaSchema.parse(candidate).approvalState).toBe("proposal");
    expect(() => candidateIdeaSchema.parse({ ...candidate, approvalState: "approved" })).toThrow();
  });
  it("serializes identical divergence contracts deterministically", () => {
    expect(serializeDivergenceContract({ b: 2, a: 1 })).toBe(
      serializeDivergenceContract({ a: 1, b: 2 }),
    );
  });
  it("rejects invalid records", () => {
    expect(() =>
      cognitiveFrameSchema.parse({
        metadata: { ...frameMetadata, id: "bad" },
        frameInstruction: "Inspect",
      }),
    ).toThrow();
  });
});
