import { describe, expect, it } from "vitest";

import { contentFingerprint } from "../knowledge-graph";
import {
  assertPromptProgramVersionUpdate,
  exampleSelectionSchema,
  promptOptimizationCandidateSchema,
  promptProgramSchema,
  promptProgramVersionSchema,
  promptPromotionDecisionSchema,
} from ".";

const now = "2026-07-23T00:00:00.000Z";
const meaning = contentFingerprint({ task: "meaning" });
const fingerprint = contentFingerprint({ version: 1 });
const version = {
  id: "prompt_version_review_1",
  programId: "prompt_program_review",
  version: 1,
  parentVersionId: null,
  normalizedMeaningFingerprint: meaning,
  inputContractRef: "contract:task",
  outputContractRef: "contract:review",
  taskCardSchemaRef: "schema:task-card:1",
  contextSelectionPolicyRef: "context:balanced:1",
  rendererRef: "renderer:agent-optimized:1",
  exampleSelectionRef: null,
  workflowPolicyRef: "workflow:review:1",
  evaluationSuiteId: "eval_suite_review",
  targetAgentProfileRefs: ["agent:local:1"],
  targetModelProfileRefs: [],
  optimizationHistoryRefs: [],
  approvalState: "approved" as const,
  releaseStatus: "production" as const,
  usedInExecution: true,
  createdAt: now,
  fingerprint,
};

describe("Prompt Program contracts", () => {
  it("keeps Task Card meaning immutable across versions", () => {
    expect(() =>
      promptProgramSchema.parse({
        id: "prompt_program_review",
        purpose: "Review one unit",
        normalizedInputContractRef: "contract:task",
        normalizedOutputContractRef: "contract:review",
        taskCardSchemaRef: "schema:task-card:1",
        currentVersionId: "prompt_version_review_2",
        versions: [
          version,
          {
            ...version,
            id: "prompt_version_review_2",
            version: 2,
            parentVersionId: version.id,
            normalizedMeaningFingerprint: contentFingerprint({ task: "changed" }),
          },
        ],
      }),
    ).toThrow(/cannot change normalized Task Card meaning/);
  });

  it("requires an optimization hypothesis", () => {
    const candidate = {
      id: "opt_candidate_review",
      programId: "prompt_program_review",
      parentVersionId: version.id,
      changeDescription: "Move validation earlier",
      hypothesis: "Earlier validation reduces missed checks",
      targetMetricRefs: ["metric:criteria"],
      expectedBenefit: "Higher criteria coverage",
      possibleRegressions: ["More input tokens"],
      trainingDatasetRef: "dataset:training",
      unseenValidationDatasetRef: "dataset:validation",
      evaluationSuiteId: "eval_suite_review",
      rollbackVersionId: version.id,
      normalizedMeaningFingerprint: meaning,
      approvalState: "proposal",
    };
    expect(promptOptimizationCandidateSchema.parse(candidate).hypothesis).toContain("validation");
    expect(() =>
      promptOptimizationCandidateSchema.parse({ ...candidate, hypothesis: "" }),
    ).toThrow();
  });

  it("requires unseen validation for promotion", () => {
    expect(() =>
      promptPromotionDecisionSchema.parse({
        id: "prompt_promotion_review",
        candidateId: "opt_candidate_review",
        experimentId: "opt_experiment_review",
        decision: "promote",
        unseenValidationResultRefs: [],
        regressionResultRefs: ["result:regression"],
        hardGatesPassed: true,
        securityRegressionPassed: true,
        meaningPreservationPassed: true,
        approvedBy: "user:owner",
        rollbackVersionId: version.id,
        decidedAt: now,
      }),
    ).toThrow();
  });

  it("blocks promotion after a failed hard gate", () => {
    expect(() =>
      promptPromotionDecisionSchema.parse({
        id: "prompt_promotion_review",
        candidateId: "opt_candidate_review",
        experimentId: "opt_experiment_review",
        decision: "promote",
        unseenValidationResultRefs: ["result:validation"],
        regressionResultRefs: ["result:regression"],
        hardGatesPassed: false,
        securityRegressionPassed: true,
        meaningPreservationPassed: true,
        approvedBy: "user:owner",
        rollbackVersionId: version.id,
        decidedAt: now,
      }),
    ).toThrow(/Promotion requires/);
  });

  it("prevents mutation of a used version", () => {
    expect(promptProgramVersionSchema.parse(version).usedInExecution).toBe(true);
    expect(() =>
      assertPromptProgramVersionUpdate(version, { ...version, rendererRef: "renderer:new" }),
    ).toThrow(/immutable/);
    expect(() => assertPromptProgramVersionUpdate(version, version)).not.toThrow();
  });

  it("rejects example selection that changes task meaning", () => {
    expect(() =>
      exampleSelectionSchema.parse({
        id: "example_selection_review",
        taskCardId: "task_card_review",
        taskType: "review",
        taskMeaningFingerprint: meaning,
        resultingTaskMeaningFingerprint: contentFingerprint({ task: "overridden" }),
        selectedExampleIds: ["example_review"],
        selectionReasons: { example_review: "Relevant review example" },
        selectionPolicyVersion: "1.0.0",
        estimatedOverheadTokens: 120,
        staleExampleIds: [],
      }),
    ).toThrow(/cannot change Task Card meaning/);
  });
});
