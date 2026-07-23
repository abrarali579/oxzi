import { z } from "zod";

import { contentFingerprintSchema, stableJson, type JsonValue } from "../knowledge-graph";
import { timestampSchema } from "../project";
import { renderedPromptProgramIdSchema } from "../prompt-renderer";
import {
  agentProfileRevisionReferenceSchema,
  executionIdSchema,
  taskCardIdSchema,
} from "../execution";

const nonempty = z.string().trim().min(1);
const refs = z.array(nonempty);
const id = <T extends string>(prefix: string) =>
  z
    .string()
    .regex(new RegExp(`^${prefix}_[a-z0-9]+(?:_[a-z0-9]+)*$`))
    .brand<T>();
export const assertionIdSchema = id<"AssertionId">("assertion");
export const evaluationSuiteIdSchema = id<"EvaluationSuiteId">("eval_suite");
export const evaluationScenarioIdSchema = id<"EvaluationScenarioId">("eval_scenario");
export const promptCertificationIdSchema = id<"PromptCertificationId">("prompt_cert");
export const executionCertificationIdSchema = id<"ExecutionCertificationId">("execution_cert");
export const datasetRecordIdSchema = id<"DatasetRecordId">("dataset_record");
export const optimizationHypothesisIdSchema = id<"OptimizationHypothesisId">("optimization");
export const rendererCandidateIdSchema = id<"RendererCandidateId">("renderer_candidate");
export const releaseDecisionIdSchema = id<"ReleaseDecisionId">("release_decision");

export const trustLevelSchema = z.enum([
  "constitutional",
  "approved_canonical",
  "trusted_evidence",
  "repository_evidence",
  "untrusted_imported_source",
  "generated_proposal",
  "agent_claim",
  "verified_execution_evidence",
]);

export const trustedContentBoundarySchema = z
  .object({
    contentRef: nonempty,
    trustLevel: trustLevelSchema,
    delimited: z.boolean(),
    mayProvideInstructions: z.boolean(),
    suspiciousInstructionRefs: refs,
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.mayProvideInstructions &&
      !["constitutional", "approved_canonical"].includes(value.trustLevel)
    )
      context.addIssue({
        code: "custom",
        path: ["mayProvideInstructions"],
        message: "Untrusted or evidentiary content cannot become instructions",
      });
  });

export const assertionDefinitionSchema = z
  .object({
    id: assertionIdSchema,
    version: nonempty,
    category: z.enum(["prompt", "context", "execution", "trajectory", "security", "qualitative"]),
    kind: nonempty,
    description: nonempty,
    hardGate: z.boolean(),
    deterministic: z.boolean(),
    requiredEvidenceTypes: refs,
    modelJudgePolicyRef: nonempty.nullable(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.deterministic && value.modelJudgePolicyRef)
      context.addIssue({
        code: "custom",
        path: ["modelJudgePolicyRef"],
        message: "Deterministic assertions do not use a model judge",
      });
  });

export const assertionResultSchema = z
  .object({
    assertionId: assertionIdSchema,
    passed: z.boolean(),
    deterministic: z.boolean(),
    hardGate: z.boolean(),
    evidenceRefs: refs,
    reason: nonempty,
    evaluatorRef: nonempty,
    modelJudgeResult: z.enum(["passed", "failed", "unavailable"]).nullable(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.deterministic && value.modelJudgeResult !== null)
      context.addIssue({
        code: "custom",
        path: ["modelJudgeResult"],
        message: "Model judges cannot grade deterministic assertions",
      });
  });

export const evaluationSuiteSchema = z
  .object({
    id: evaluationSuiteIdSchema,
    version: nonempty,
    applicableTaskTypes: refs.min(1),
    riskLevels: z.array(z.enum(["low", "medium", "high", "critical"])).min(1),
    hardAssertionIds: z.array(assertionIdSchema).min(1),
    softMetricIds: refs,
    requiredEvidenceTypes: refs.min(1),
    evaluatorPolicyRef: nonempty,
    tokenBudget: z.number().int().positive().nullable(),
    humanReviewRequired: z.boolean(),
  })
  .strict();

export const evaluationScenarioSchema = z
  .object({
    id: evaluationScenarioIdSchema,
    version: nonempty,
    taskCardId: taskCardIdSchema,
    contextPackageRef: nonempty,
    renderedPromptRef: nonempty,
    targetAgent: agentProfileRevisionReferenceSchema,
    suiteId: evaluationSuiteIdSchema,
    riskLevel: z.enum(["low", "medium", "high", "critical"]),
    trustBoundaries: z.array(trustedContentBoundarySchema),
    fingerprint: contentFingerprintSchema,
  })
  .strict();

const certificationStatusSchema = z.enum([
  "certified",
  "certified_with_warnings",
  "review_required",
  "insufficient_context",
  "stale",
  "incompatible",
  "blocked",
]);

export const promptCertificationResultSchema = z
  .object({
    id: promptCertificationIdSchema,
    taskCardId: taskCardIdSchema,
    rendererCandidateId: rendererCandidateIdSchema,
    status: certificationStatusSchema,
    assertionResults: z.array(assertionResultSchema).min(1),
    visibleCheckIds: refs.min(1),
    evidenceRefs: refs,
    version: nonempty,
  })
  .strict()
  .superRefine((value, context) => {
    const failedHardGate = value.assertionResults.some(
      (result) => result.hardGate && !result.passed,
    );
    if (failedHardGate && ["certified", "certified_with_warnings"].includes(value.status))
      context.addIssue({
        code: "custom",
        path: ["status"],
        message: "Failed deterministic hard gates block Prompt Certification",
      });
  });

export const executionCertificationResultSchema = z
  .object({
    id: executionCertificationIdSchema,
    executionId: executionIdSchema,
    status: z.enum([
      "accepted",
      "accepted_with_warnings",
      "repair_required",
      "clarification_required",
      "blocked",
      "invalid_evidence",
    ]),
    goalSuccess: z.enum(["passed", "failed", "uncertain"]),
    processCompliance: z.enum(["passed", "failed", "uncertain"]),
    specificationCompliance: z.enum(["passed", "failed", "uncertain"]),
    engineeringQuality: z.enum(["passed", "failed", "uncertain"]),
    validationEvidence: z.enum(["passed", "failed", "unavailable"]),
    tokenEfficiency: z.enum(["positive", "neutral", "negative", "unavailable"]),
    assertionResults: z.array(assertionResultSchema).min(1),
    repositoryDiffRef: nonempty,
    evidenceRefs: refs.min(1),
    version: nonempty,
  })
  .strict()
  .superRefine((value, context) => {
    const hardFailure = value.assertionResults.some((result) => result.hardGate && !result.passed);
    const unsafeProcess = value.processCompliance === "failed";
    if (
      (hardFailure || unsafeProcess) &&
      ["accepted", "accepted_with_warnings"].includes(value.status)
    )
      context.addIssue({
        code: "custom",
        path: ["status"],
        message: "Unsafe process or hard-gate failure blocks Execution Certification",
      });
  });

export const rendererCandidateSchema = z
  .object({
    id: rendererCandidateIdSchema,
    rendererName: nonempty,
    version: nonempty,
    taskCardId: taskCardIdSchema,
    normalizedMeaningFingerprint: contentFingerprintSchema,
    renderedMeaningFingerprint: contentFingerprintSchema,
    promptArtifactRef: nonempty,
    changeDescription: nonempty,
  })
  .strict()
  .superRefine((value, context) => {
    if (value.normalizedMeaningFingerprint !== value.renderedMeaningFingerprint)
      context.addIssue({
        code: "custom",
        path: ["renderedMeaningFingerprint"],
        message: "Renderer output cannot change normalized Task Card meaning",
      });
  });

export const optimizationHypothesisSchema = z
  .object({
    id: optimizationHypothesisIdSchema,
    version: nonempty,
    changeDescription: nonempty,
    hypothesis: nonempty,
    expectedBenefit: nonempty,
    targetMetricId: nonempty,
    targetImprovement: z.number().finite(),
    possibleRegressions: refs.min(1),
    evaluationSuiteId: evaluationSuiteIdSchema,
  })
  .strict();

export const performanceDatasetRecordSchema = z
  .object({
    id: datasetRecordIdSchema,
    scenarioFingerprint: contentFingerprintSchema,
    partition: z.enum([
      "training",
      "validation",
      "regression",
      "red_team",
      "private_project",
      "organization",
      "approved_global_anonymized",
    ]),
    projectType: nonempty,
    taskType: nonempty,
    riskLevel: z.enum(["low", "medium", "high", "critical"]),
    taskCardRef: nonempty,
    contextPackageVersion: nonempty,
    rendererRef: nonempty,
    targetAgent: agentProfileRevisionReferenceSchema,
    executionEvidenceRefs: refs,
    certificationRefs: refs,
    inputTokens: z.number().int().nonnegative().nullable(),
    outputTokens: z.number().int().nonnegative().nullable(),
    cacheTokens: z.number().int().nonnegative().nullable(),
    optimizationOverhead: z.number().int().nonnegative().nullable(),
    repairTurns: z.number().int().nonnegative(),
    latencyMs: z.number().int().nonnegative().nullable(),
    userVerdict: z.enum(["accepted", "rejected", "unavailable"]),
    globalUseConsent: z.boolean(),
    redacted: z.boolean(),
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.partition === "approved_global_anonymized" &&
      (!value.globalUseConsent || !value.redacted)
    )
      context.addIssue({
        code: "custom",
        path: ["partition"],
        message: "Global records require consent and redaction",
      });
  });

export const performanceDatasetSchema = z
  .array(performanceDatasetRecordSchema)
  .superRefine((records, context) => {
    const partitions = new Map<string, Set<string>>();
    records.forEach((record) => {
      const values = partitions.get(record.scenarioFingerprint) ?? new Set<string>();
      values.add(record.partition);
      partitions.set(record.scenarioFingerprint, values);
    });
    for (const [fingerprint, values] of partitions) {
      if (values.has("training") && values.has("validation"))
        context.addIssue({
          code: "custom",
          message: `Scenario ${fingerprint} cannot appear in both training and validation`,
        });
    }
  });

export const releaseDecisionSchema = z
  .object({
    id: releaseDecisionIdSchema,
    rendererCandidateId: rendererCandidateIdSchema,
    decision: z.enum(["promote", "reject", "rollback", "review_required"]),
    trainingResultRefs: refs,
    unseenValidationResultRefs: refs.min(1),
    securityRegressionResultRefs: refs.min(1),
    meaningPreservationPassed: z.boolean(),
    approvedBy: nonempty.nullable(),
    version: nonempty,
  })
  .strict()
  .superRefine((value, context) => {
    if (value.decision === "promote" && (!value.meaningPreservationPassed || !value.approvedBy))
      context.addIssue({
        code: "custom",
        path: ["decision"],
        message: "Promotion requires meaning preservation and approval",
      });
  });

export const promptEvaluationAssertionSchema = z
  .object({
    ruleId: nonempty,
    passed: z.boolean(),
    hardGate: z.boolean(),
    message: nonempty,
    evaluatorRef: nonempty,
  })
  .strict();

export const promptEvaluationReportSchema = z
  .object({
    targetProgramId: renderedPromptProgramIdSchema,
    timestamp: timestampSchema,
    assertions: z.array(promptEvaluationAssertionSchema).min(1),
    totalPassed: z.number().int().nonnegative(),
    totalFailed: z.number().int().nonnegative(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.totalPassed + value.totalFailed !== value.assertions.length)
      context.addIssue({
        code: "custom",
        path: ["totalPassed", "totalFailed"],
        message: "Total passed and failed assertion counts must equal the assertion count",
      });
    if (value.totalFailed !== value.assertions.filter((entry) => !entry.passed).length)
      context.addIssue({
        code: "custom",
        path: ["totalFailed"],
        message: "totalFailed must match the number of failed assertions",
      });
  });

export const promptCertificationSchema = z
  .object({
    certificationId: promptCertificationIdSchema,
    programId: renderedPromptProgramIdSchema,
    status: z.enum(["CERTIFIED", "REJECTED"]),
    reason: nonempty,
  })
  .strict();

export type PromptEvaluationAssertion = z.infer<typeof promptEvaluationAssertionSchema>;
export type PromptEvaluationReport = z.infer<typeof promptEvaluationReportSchema>;
export type PromptCertification = z.infer<typeof promptCertificationSchema>;

type EvaluationRiskLevel = "low" | "medium" | "high" | "critical";
export function selectEvaluationSuite(
  input: unknown[],
  taskType: string,
  riskLevel: EvaluationRiskLevel,
) {
  const suites = input.map((suite) => evaluationSuiteSchema.parse(suite));
  const eligible = suites.filter(
    (suite) => suite.applicableTaskTypes.includes(taskType) && suite.riskLevels.includes(riskLevel),
  );
  return (
    eligible.sort(
      (left, right) =>
        left.hardAssertionIds.length - right.hardAssertionIds.length ||
        left.id.localeCompare(right.id),
    )[0] ?? null
  );
}

export function serializeEvaluationContract(input: JsonValue): string {
  return stableJson(input);
}

// ── Step 14: Evaluation Lab & Launch Hardening ─────────────────

export const benchmarkFixtureSchema = z
  .object({
    fixtureId: nonempty,
    projectInput: nonempty,
    expectedSlices: z.array(nonempty).optional().default([]),
    expectedPassportBoundaries: z.array(nonempty).optional().default([]),
  })
  .strict();

export const benchmarkResultSchema = z
  .object({
    fixtureId: nonempty,
    passed: z.boolean(),
    latencyMs: z.number().nonnegative(),
    tokenCount: z.number().int().nonnegative(),
    schemaErrors: z.array(nonempty),
  })
  .strict();

export const benchSuiteResultSchema = z
  .object({
    suiteName: nonempty,
    totalFixtures: z.number().int().nonnegative(),
    passed: z.number().int().nonnegative(),
    failed: z.number().int().nonnegative(),
    totalLatencyMs: z.number().nonnegative(),
    totalTokens: z.number().int().nonnegative(),
    passRate: z.number().min(0).max(100),
    results: z.array(benchmarkResultSchema),
  })
  .strict();

export const launchHardeningReportSchema = z
  .object({
    reportId: nonempty,
    timestamp: nonempty,
    totalFixtures: z.number().int().nonnegative(),
    passRate: z.number().min(0).max(100),
    tokenEfficiencyRatio: z.number().nonnegative(),
    totalLatencyMs: z.number().nonnegative(),
    suites: z.array(benchSuiteResultSchema),
    hardeningStatus: z.enum(["READY_FOR_LAUNCH", "NEEDS_HARDENING"]),
    failures: z.array(nonempty),
    fingerprint: contentFingerprintSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (value.hardeningStatus === "READY_FOR_LAUNCH" && value.failures.length > 0) {
      context.addIssue({
        code: "custom",
        path: ["hardeningStatus"],
        message: "READY_FOR_LAUNCH status requires zero failures",
      });
    }
  });

export type BenchmarkFixture = z.infer<typeof benchmarkFixtureSchema>;
export type BenchmarkResult = z.infer<typeof benchmarkResultSchema>;
export type BenchSuiteResult = z.infer<typeof benchSuiteResultSchema>;
export type LaunchHardeningReport = z.infer<typeof launchHardeningReportSchema>;
