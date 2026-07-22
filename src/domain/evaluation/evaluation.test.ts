import { describe, expect, it } from "vitest";

import { contentFingerprint } from "../knowledge-graph";
import {
  assertionResultSchema,
  executionCertificationResultSchema,
  optimizationHypothesisSchema,
  performanceDatasetSchema,
  promptCertificationResultSchema,
  releaseDecisionSchema,
  rendererCandidateSchema,
  selectEvaluationSuite,
  serializeEvaluationContract,
  trustedContentBoundarySchema,
} from ".";

const fingerprint = contentFingerprint({ fixture: "evaluation" });
const agent = { profileId: "agent_profile_local", revision: 1, fingerprint };
const hardPass = {
  assertionId: "assertion_goal",
  passed: true,
  deterministic: true,
  hardGate: true,
  evidenceRefs: ["task:goal"],
  reason: "present",
  evaluatorRef: "deterministic:presence",
  modelJudgeResult: null,
};
const hardFail = { ...hardPass, assertionId: "assertion_scope", passed: false, reason: "missing" };
const suite = {
  id: "eval_suite_standard",
  version: "1.0.0",
  applicableTaskTypes: ["implementation"],
  riskLevels: ["medium"],
  hardAssertionIds: ["assertion_goal"],
  softMetricIds: [],
  requiredEvidenceTypes: ["diff"],
  evaluatorPolicyRef: "deterministic_first",
  tokenBudget: 1000,
  humanReviewRequired: false,
};

describe("prompt evaluation contracts", () => {
  it("prevents renderer records from changing Task Card meaning", () => {
    const candidate = {
      id: "renderer_candidate_agent",
      rendererName: "Agent Optimized",
      version: "1",
      taskCardId: "task_card_auth",
      normalizedMeaningFingerprint: fingerprint,
      renderedMeaningFingerprint: fingerprint,
      promptArtifactRef: "artifact:prompt",
      changeDescription: "Baseline",
    };
    expect(rendererCandidateSchema.parse(candidate).id).toBe(candidate.id);
    expect(() =>
      rendererCandidateSchema.parse({
        ...candidate,
        renderedMeaningFingerprint: contentFingerprint({ changed: true }),
      }),
    ).toThrow(/meaning/);
  });
  it("blocks Prompt Certification after a hard-gate failure", () => {
    const certification = {
      id: "prompt_cert_auth",
      taskCardId: "task_card_auth",
      rendererCandidateId: "renderer_candidate_agent",
      status: "certified",
      assertionResults: [hardFail],
      visibleCheckIds: ["scope"],
      evidenceRefs: [],
      version: "1",
    };
    expect(() => promptCertificationResultSchema.parse(certification)).toThrow(/hard gates/);
  });
  it("does not let a model judge override deterministic failure", () => {
    expect(() => assertionResultSchema.parse({ ...hardFail, modelJudgeResult: "passed" })).toThrow(
      /Model judges/,
    );
  });
  it("keeps Prompt and Execution Certification separate", () => {
    const execution = {
      id: "execution_cert_auth",
      executionId: "execution_auth",
      status: "repair_required",
      goalSuccess: "failed",
      processCompliance: "passed",
      specificationCompliance: "failed",
      engineeringQuality: "uncertain",
      validationEvidence: "failed",
      tokenEfficiency: "unavailable",
      assertionResults: [hardFail],
      repositoryDiffRef: "diff:1",
      evidenceRefs: ["test:1"],
      version: "1",
    };
    expect(executionCertificationResultSchema.parse(execution).executionId).toBe("execution_auth");
    expect(promptCertificationResultSchema.safeParse(execution).success).toBe(false);
  });
  it("selects the minimum sufficient suite by task risk", () => {
    const larger = {
      ...suite,
      id: "eval_suite_large",
      hardAssertionIds: ["assertion_goal", "assertion_scope"],
    };
    expect(selectEvaluationSuite([larger, suite], "implementation", "medium")?.id).toBe(
      "eval_suite_standard",
    );
    expect(selectEvaluationSuite([suite], "implementation", "high")).toBeNull();
  });
  it("rejects training and validation leakage", () => {
    const record = {
      id: "dataset_record_train",
      scenarioFingerprint: fingerprint,
      partition: "training",
      projectType: "website",
      taskType: "implementation",
      riskLevel: "medium",
      taskCardRef: "task:1",
      contextPackageVersion: "1",
      rendererRef: "renderer:1",
      targetAgent: agent,
      executionEvidenceRefs: [],
      certificationRefs: [],
      inputTokens: null,
      outputTokens: null,
      cacheTokens: null,
      optimizationOverhead: null,
      repairTurns: 0,
      latencyMs: null,
      userVerdict: "unavailable",
      globalUseConsent: false,
      redacted: true,
    };
    expect(() =>
      performanceDatasetSchema.parse([
        record,
        { ...record, id: "dataset_record_validation", partition: "validation" },
      ]),
    ).toThrow(/training and validation/);
  });
  it("requires measurable optimization targets", () => {
    const hypothesis = {
      id: "optimization_boundaries",
      version: "1",
      changeDescription: "Move boundaries",
      hypothesis: "Reduce scope errors",
      expectedBenefit: "Fewer violations",
      targetMetricId: "scope_violation_rate",
      targetImprovement: 5,
      possibleRegressions: ["longer prompt"],
      evaluationSuiteId: "eval_suite_standard",
    };
    expect(optimizationHypothesisSchema.parse(hypothesis).targetImprovement).toBe(5);
    expect(() =>
      optimizationHypothesisSchema.parse({ ...hypothesis, targetMetricId: "" }),
    ).toThrow();
  });
  it("requires unseen validation and security results for release", () => {
    const decision = {
      id: "release_decision_agent",
      rendererCandidateId: "renderer_candidate_agent",
      decision: "promote",
      trainingResultRefs: ["train:1"],
      unseenValidationResultRefs: ["validation:1"],
      securityRegressionResultRefs: ["security:1"],
      meaningPreservationPassed: true,
      approvedBy: "user:1",
      version: "1",
    };
    expect(releaseDecisionSchema.parse(decision).decision).toBe("promote");
    expect(() =>
      releaseDecisionSchema.parse({ ...decision, unseenValidationResultRefs: [] }),
    ).toThrow();
  });
  it("prevents untrusted content becoming constitutional instruction", () => {
    const boundary = {
      contentRef: "README.md",
      trustLevel: "untrusted_imported_source",
      delimited: true,
      mayProvideInstructions: false,
      suspiciousInstructionRefs: [],
    };
    expect(trustedContentBoundarySchema.parse(boundary).mayProvideInstructions).toBe(false);
    expect(() =>
      trustedContentBoundarySchema.parse({ ...boundary, mayProvideInstructions: true }),
    ).toThrow(/cannot become instructions/);
  });
  it("serializes identical evaluation contracts deterministically", () => {
    expect(serializeEvaluationContract({ b: 2, a: 1 })).toBe(
      serializeEvaluationContract({ a: 1, b: 2 }),
    );
  });
});
