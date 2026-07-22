import { z } from "zod";

import { evaluationSuiteIdSchema } from "../evaluation";
import { taskCardIdSchema } from "../execution";
import { contentFingerprintSchema, stableJson, type JsonValue } from "../knowledge-graph";
import { timestampSchema } from "../project";

const nonempty = z.string().trim().min(1);
const refs = z.array(nonempty);
const id = <T extends string>(prefix: string) =>
  z
    .string()
    .regex(new RegExp(`^${prefix}_[a-z0-9]+(?:_[a-z0-9]+)*$`))
    .brand<T>();

export const promptProgramIdSchema = id<"PromptProgramId">("prompt_program");
export const promptProgramVersionIdSchema = id<"PromptProgramVersionId">("prompt_version");
export const exampleRecordIdSchema = id<"ExampleRecordId">("example");
export const exampleSelectionIdSchema = id<"ExampleSelectionId">("example_selection");
export const optimizationCandidateIdSchema = id<"OptimizationCandidateId">("opt_candidate");
export const optimizationExperimentIdSchema = id<"OptimizationExperimentId">("opt_experiment");
export const promptPromotionDecisionIdSchema = id<"PromptPromotionDecisionId">("prompt_promotion");

export const promptProgramVersionSchema = z
  .object({
    id: promptProgramVersionIdSchema,
    programId: promptProgramIdSchema,
    version: z.number().int().positive(),
    parentVersionId: promptProgramVersionIdSchema.nullable(),
    normalizedMeaningFingerprint: contentFingerprintSchema,
    inputContractRef: nonempty,
    outputContractRef: nonempty,
    taskCardSchemaRef: nonempty,
    contextSelectionPolicyRef: nonempty,
    rendererRef: nonempty,
    exampleSelectionRef: nonempty.nullable(),
    workflowPolicyRef: nonempty,
    evaluationSuiteId: evaluationSuiteIdSchema,
    targetAgentProfileRefs: refs,
    targetModelProfileRefs: refs,
    optimizationHistoryRefs: refs,
    approvalState: z.enum(["draft", "pending", "approved", "rejected"]),
    releaseStatus: z.enum(["draft", "staging", "production", "rollback", "retired"]),
    usedInExecution: z.boolean(),
    createdAt: timestampSchema,
    fingerprint: contentFingerprintSchema,
  })
  .strict();

export const promptProgramSchema = z
  .object({
    id: promptProgramIdSchema,
    purpose: nonempty,
    normalizedInputContractRef: nonempty,
    normalizedOutputContractRef: nonempty,
    taskCardSchemaRef: nonempty,
    currentVersionId: promptProgramVersionIdSchema,
    versions: z.array(promptProgramVersionSchema).min(1),
  })
  .strict()
  .superRefine((value, context) => {
    const versions = value.versions.filter((version) => version.programId === value.id);
    if (versions.length !== value.versions.length)
      context.addIssue({
        code: "custom",
        path: ["versions"],
        message: "Every Prompt Program version must belong to the program",
      });
    if (!versions.some((version) => version.id === value.currentVersionId))
      context.addIssue({
        code: "custom",
        path: ["currentVersionId"],
        message: "Current Prompt Program version must exist",
      });
    const meanings = new Set(versions.map((version) => version.normalizedMeaningFingerprint));
    if (meanings.size > 1)
      context.addIssue({
        code: "custom",
        path: ["versions"],
        message: "Prompt Program optimization cannot change normalized Task Card meaning",
      });
  });

export const exampleRecordSchema = z
  .object({
    id: exampleRecordIdSchema,
    version: z.number().int().positive(),
    taskType: nonempty,
    inputArtifactRef: nonempty,
    expectedNormalizedOutputRef: nonempty,
    targetAgentProfileRefs: refs,
    targetModelProfileRefs: refs,
    sourceRefs: refs.min(1),
    approvalState: z.enum(["draft", "approved", "rejected", "retired"]),
    privacyClassification: z.enum(["public", "internal", "confidential", "restricted"]),
    secretScanStatus: z.enum(["passed", "failed", "not_run"]),
    qualityResultRefs: refs,
    tokenOverhead: z.number().int().nonnegative().nullable(),
    successHistoryRefs: refs,
    failureHistoryRefs: refs,
    freshness: z.enum(["current", "stale", "unknown"]),
    fingerprint: contentFingerprintSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (value.approvalState === "approved" && value.secretScanStatus !== "passed")
      context.addIssue({
        code: "custom",
        path: ["secretScanStatus"],
        message: "Approved examples require a passing secret scan",
      });
  });

export const exampleSelectionSchema = z
  .object({
    id: exampleSelectionIdSchema,
    taskCardId: taskCardIdSchema,
    taskType: nonempty,
    taskMeaningFingerprint: contentFingerprintSchema,
    resultingTaskMeaningFingerprint: contentFingerprintSchema,
    selectedExampleIds: z.array(exampleRecordIdSchema),
    selectionReasons: z.record(exampleRecordIdSchema, nonempty),
    selectionPolicyVersion: nonempty,
    estimatedOverheadTokens: z.number().int().nonnegative().nullable(),
    staleExampleIds: z.array(exampleRecordIdSchema),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.taskMeaningFingerprint !== value.resultingTaskMeaningFingerprint)
      context.addIssue({
        code: "custom",
        path: ["resultingTaskMeaningFingerprint"],
        message: "Example selection cannot change Task Card meaning",
      });
    if (value.staleExampleIds.some((id) => value.selectedExampleIds.includes(id)))
      context.addIssue({
        code: "custom",
        path: ["selectedExampleIds"],
        message: "Stale examples cannot be selected silently",
      });
  });

export const promptOptimizationCandidateSchema = z
  .object({
    id: optimizationCandidateIdSchema,
    programId: promptProgramIdSchema,
    parentVersionId: promptProgramVersionIdSchema,
    changeDescription: nonempty,
    hypothesis: nonempty,
    targetMetricRefs: refs.min(1),
    expectedBenefit: nonempty,
    possibleRegressions: refs.min(1),
    trainingDatasetRef: nonempty,
    unseenValidationDatasetRef: nonempty,
    evaluationSuiteId: evaluationSuiteIdSchema,
    rollbackVersionId: promptProgramVersionIdSchema,
    normalizedMeaningFingerprint: contentFingerprintSchema,
    approvalState: z.enum(["proposal", "pending", "approved", "rejected"]),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.trainingDatasetRef === value.unseenValidationDatasetRef)
      context.addIssue({
        code: "custom",
        path: ["unseenValidationDatasetRef"],
        message: "Training and unseen validation datasets must be separate",
      });
  });

export const optimizationExperimentSchema = z
  .object({
    id: optimizationExperimentIdSchema,
    candidateId: optimizationCandidateIdSchema,
    baselineVersionId: promptProgramVersionIdSchema,
    candidateVersionId: promptProgramVersionIdSchema,
    trainingResultRefs: refs.min(1),
    unseenValidationResultRefs: refs.min(1),
    regressionResultRefs: refs.min(1),
    hardGatesPassed: z.boolean(),
    meaningPreservationPassed: z.boolean(),
    tokenCostResultRef: nonempty,
    qualityResultRef: nonempty,
    completedAt: timestampSchema,
  })
  .strict();

export const promptPromotionDecisionSchema = z
  .object({
    id: promptPromotionDecisionIdSchema,
    candidateId: optimizationCandidateIdSchema,
    experimentId: optimizationExperimentIdSchema,
    decision: z.enum(["promote", "reject", "review_required", "rollback"]),
    unseenValidationResultRefs: refs.min(1),
    regressionResultRefs: refs.min(1),
    hardGatesPassed: z.boolean(),
    securityRegressionPassed: z.boolean(),
    meaningPreservationPassed: z.boolean(),
    approvedBy: nonempty.nullable(),
    rollbackVersionId: promptProgramVersionIdSchema,
    decidedAt: timestampSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.decision === "promote" &&
      (!value.hardGatesPassed ||
        !value.securityRegressionPassed ||
        !value.meaningPreservationPassed ||
        !value.approvedBy)
    )
      context.addIssue({
        code: "custom",
        path: ["decision"],
        message:
          "Promotion requires unseen validation, hard gates, security, meaning, and approval",
      });
  });

export function assertPromptProgramVersionUpdate(
  previousInput: unknown,
  proposedInput: unknown,
): void {
  const previous = promptProgramVersionSchema.parse(previousInput);
  const proposed = promptProgramVersionSchema.parse(proposedInput);
  if (
    previous.usedInExecution &&
    stableJson(previous as unknown as JsonValue) !== stableJson(proposed as unknown as JsonValue)
  )
    throw new Error("Used Prompt Program versions are immutable; create a child version");
}

export function serializePromptProgramContract(input: JsonValue): string {
  return stableJson(input);
}

export type PromptProgram = z.infer<typeof promptProgramSchema>;
export type PromptProgramVersion = z.infer<typeof promptProgramVersionSchema>;
export type ExampleRecord = z.infer<typeof exampleRecordSchema>;
export type ExampleSelection = z.infer<typeof exampleSelectionSchema>;
export type PromptOptimizationCandidate = z.infer<typeof promptOptimizationCandidateSchema>;
export type OptimizationExperiment = z.infer<typeof optimizationExperimentSchema>;
export type PromptPromotionDecision = z.infer<typeof promptPromotionDecisionSchema>;
