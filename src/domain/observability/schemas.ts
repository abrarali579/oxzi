import { z } from "zod";

import { evaluationSuiteIdSchema } from "../evaluation";
import {
  agentProfileRevisionReferenceSchema,
  executionIdSchema,
  executionPassportIdSchema,
  taskCardIdSchema,
} from "../execution";
import { contentFingerprintSchema, stableJson, type JsonValue } from "../knowledge-graph";
import { projectIdSchema, timestampSchema, versionIdSchema } from "../project";
import { promptProgramVersionIdSchema } from "../prompt-programs";

const nonempty = z.string().trim().min(1);
const refs = z.array(nonempty);
const id = <T extends string>(prefix: string) =>
  z
    .string()
    .regex(new RegExp(`^${prefix}_[a-z0-9]+(?:_[a-z0-9]+)*$`))
    .brand<T>();

export const traceIdSchema = id<"TraceId">("trace");
export const spanIdSchema = id<"SpanId">("span");
export const generationRecordIdSchema = id<"GenerationRecordId">("generation");
export const observationIdSchema = id<"ObservationId">("observation");
export const evaluationLinkIdSchema = id<"EvaluationLinkId">("evaluation_link");
export const observabilityDatasetIdSchema = id<"ObservabilityDatasetId">("dataset");
export const datasetItemIdSchema = id<"DatasetItemId">("dataset_item");
export const experimentIdSchema = id<"ExperimentId">("experiment");
export const experimentRunIdSchema = id<"ExperimentRunId">("experiment_run");

export const observabilityPrivacyModeSchema = z.enum([
  "metadata_only",
  "redacted_content",
  "full_private_trace",
  "local_only",
  "organization_controlled",
  "consented_product_improvement",
]);

export const retentionPolicySchema = z
  .object({
    policyId: nonempty,
    version: nonempty,
    retentionDays: z.number().int().positive().nullable(),
    deletionMode: z.enum(["automatic", "user_controlled", "organization_controlled", "local_only"]),
    rawContentAllowed: z.boolean(),
    secretRedactionRequired: z.boolean(),
    crossProjectAggregationAllowed: z.boolean(),
  })
  .strict();

export const executionVersionReferencesSchema = z
  .object({
    canonicalProjectVersionId: versionIdSchema,
    constitutionVersionRef: nonempty,
    specificationVersionRefs: refs.min(1),
    technicalPlanVersionRefs: refs,
    knowledgeGraphVersionRef: nonempty,
    repositoryGraphVersionRef: nonempty.nullable(),
    taskCardVersionRef: nonempty,
    contextPackageVersionRef: nonempty,
    promptProgramVersionId: promptProgramVersionIdSchema,
    rendererVersionRef: nonempty,
    exampleVersionRefs: refs,
    workflowPolicyVersionRef: nonempty,
    skillVersionRefs: refs,
    targetAgentProfile: agentProfileRevisionReferenceSchema,
    modelProfileVersionRef: nonempty.nullable(),
    evaluationSuiteId: evaluationSuiteIdSchema,
    parserVersionRefs: refs,
    structuredOutputContractVersionRef: nonempty,
  })
  .strict();

export const traceSchema = z
  .object({
    id: traceIdSchema,
    projectId: projectIdSchema,
    taskCardId: taskCardIdSchema,
    executionPassportId: executionPassportIdSchema.nullable(),
    executionId: executionIdSchema.nullable(),
    environment: z.enum(["local", "development", "test", "staging", "production"]),
    startedAt: timestampSchema,
    endedAt: timestampSchema.nullable(),
    status: z.enum(["running", "completed", "failed", "blocked", "cancelled"]),
    userSessionRef: nonempty.nullable(),
    privacyMode: observabilityPrivacyModeSchema,
    retentionPolicyRef: nonempty,
    tags: refs,
    metadataRefs: refs,
    versions: executionVersionReferencesSchema,
    fingerprint: contentFingerprintSchema,
  })
  .strict();

export const spanSchema = z
  .object({
    id: spanIdSchema,
    traceId: traceIdSchema,
    parentSpanId: spanIdSchema.nullable(),
    operationType: z.enum([
      "task_card_compilation",
      "context_retrieval",
      "prompt_rendering",
      "prompt_evaluation",
      "agent_operation",
      "tool_operation",
      "repository_operation",
      "review",
      "repair",
      "convergence_analysis",
      "compile-and-render",
      "compile",
      "render",
      "extraction",
      "discovery",
      "planning",
      "governance",
      "divergence",
      "integration-test",
    ]),
    inputArtifactRef: nonempty.nullable(),
    outputArtifactRef: nonempty.nullable(),
    startedAt: timestampSchema,
    endedAt: timestampSchema.nullable(),
    status: z.enum(["running", "completed", "failed", "blocked", "cancelled"]),
    inputTokens: z.number().int().nonnegative().nullable(),
    outputTokens: z.number().int().nonnegative().nullable(),
    cacheReadTokens: z.number().int().nonnegative().nullable(),
    cacheWriteTokens: z.number().int().nonnegative().nullable(),
    costAmount: z.number().nonnegative().nullable(),
    costCurrency: nonempty.nullable(),
    errorRef: nonempty.nullable(),
    providerProfileRef: nonempty.nullable(),
    modelProfileRef: nonempty.nullable(),
    agentProfileRef: nonempty.nullable(),
    artifactRefs: refs,
    evaluationRefs: refs,
  })
  .strict();

export const generationRecordSchema = z
  .object({
    id: generationRecordIdSchema,
    traceId: traceIdSchema,
    spanId: spanIdSchema,
    promptProgramVersionId: promptProgramVersionIdSchema,
    rendererVersionRef: nonempty,
    contextPackageVersionRef: nonempty,
    targetModelProfileRef: nonempty,
    tokenizerRef: nonempty.nullable(),
    inputTokens: z.number().int().nonnegative().nullable(),
    outputTokens: z.number().int().nonnegative().nullable(),
    cacheTokens: z.number().int().nonnegative().nullable(),
    latencyMs: z.number().int().nonnegative().nullable(),
    finishReason: nonempty.nullable(),
    parsedContractResultRef: nonempty,
    rawInputArtifactRef: nonempty.nullable(),
    rawOutputArtifactRef: nonempty.nullable(),
    rawContentRetentionPolicyRef: nonempty,
  })
  .strict();

export const observationSchema = z
  .object({
    id: observationIdSchema,
    traceId: traceIdSchema,
    spanId: spanIdSchema.nullable(),
    category: z.enum(["metric", "error", "quality", "security", "scope", "user_outcome"]),
    valueRef: nonempty,
    evidenceRefs: refs,
    observedAt: timestampSchema,
  })
  .strict();

export const evaluationLinkSchema = z
  .object({
    id: evaluationLinkIdSchema,
    traceId: traceIdSchema,
    spanId: spanIdSchema.nullable(),
    evaluationSuiteId: evaluationSuiteIdSchema,
    resultRef: nonempty,
    evaluatorRef: nonempty,
    deterministic: z.boolean(),
  })
  .strict();

export const traceBundleSchema = z
  .object({
    trace: traceSchema,
    retentionPolicy: retentionPolicySchema,
    spans: z.array(spanSchema),
    generations: z.array(generationRecordSchema),
    observations: z.array(observationSchema),
    evaluationLinks: z.array(evaluationLinkSchema),
  })
  .strict()
  .superRefine((value, context) => {
    const spanIds = new Set(value.spans.map((span) => span.id));
    for (const [index, span] of value.spans.entries()) {
      if (span.traceId !== value.trace.id)
        context.addIssue({
          code: "custom",
          path: ["spans", index, "traceId"],
          message: "Span must belong to the enclosing trace",
        });
      if (span.parentSpanId && !spanIds.has(span.parentSpanId))
        context.addIssue({
          code: "custom",
          path: ["spans", index, "parentSpanId"],
          message: "Span parent must exist in the same trace",
        });
    }
    for (const [index, generation] of value.generations.entries()) {
      if (generation.traceId !== value.trace.id || !spanIds.has(generation.spanId))
        context.addIssue({
          code: "custom",
          path: ["generations", index],
          message: "Generation must reference a span in the same trace",
        });
      if (
        value.trace.privacyMode === "metadata_only" &&
        (generation.rawInputArtifactRef !== null || generation.rawOutputArtifactRef !== null)
      )
        context.addIssue({
          code: "custom",
          path: ["generations", index],
          message: "Metadata-only traces cannot retain raw input or output content",
        });
    }
    if (value.trace.retentionPolicyRef !== value.retentionPolicy.policyId)
      context.addIssue({
        code: "custom",
        path: ["retentionPolicy"],
        message: "Trace must reference the supplied retention policy",
      });
  });

export const observabilityDatasetSchema = z
  .object({
    id: observabilityDatasetIdSchema,
    version: z.number().int().positive(),
    name: nonempty,
    partition: z.enum([
      "training",
      "validation",
      "regression",
      "red_team",
      "benchmark",
      "private_project",
      "organization",
      "approved_anonymized_global",
    ]),
    privacyClassification: z.enum(["public", "internal", "confidential", "restricted"]),
    provenanceRefs: refs.min(1),
    globalUseConsent: z.boolean(),
    anonymized: z.boolean(),
    immutable: z.literal(true),
    fingerprint: contentFingerprintSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.partition === "approved_anonymized_global" &&
      (!value.globalUseConsent || !value.anonymized)
    )
      context.addIssue({
        code: "custom",
        path: ["partition"],
        message: "Global datasets require explicit consent and anonymization",
      });
  });

export const datasetItemSchema = z
  .object({
    id: datasetItemIdSchema,
    datasetId: observabilityDatasetIdSchema,
    datasetVersion: z.number().int().positive(),
    scenarioFingerprint: contentFingerprintSchema,
    inputArtifactRef: nonempty,
    expectedOutputArtifactRef: nonempty.nullable(),
    observedOutputArtifactRef: nonempty.nullable(),
    traceId: traceIdSchema.nullable(),
    evaluationResultRefs: refs,
    provenanceRefs: refs.min(1),
  })
  .strict();

export const experimentSchema = z
  .object({
    id: experimentIdSchema,
    version: z.number().int().positive(),
    hypothesis: nonempty,
    trainingDatasetRef: nonempty,
    unseenValidationDatasetRef: nonempty,
    regressionDatasetRefs: refs,
    promptProgramCandidateRefs: refs.min(1),
    baselineRef: nonempty,
    evaluationSuiteId: evaluationSuiteIdSchema,
    requiredVersionRefs: refs.min(1),
    statisticalLimitations: refs.min(1),
    approvalState: z.enum(["draft", "approved", "rejected"]),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.trainingDatasetRef === value.unseenValidationDatasetRef)
      context.addIssue({
        code: "custom",
        path: ["unseenValidationDatasetRef"],
        message: "Experiment training and validation datasets must be separate",
      });
  });

export const experimentRunSchema = z
  .object({
    id: experimentRunIdSchema,
    experimentId: experimentIdSchema,
    experimentVersion: z.number().int().positive(),
    datasetVersionRefs: refs.min(2),
    promptProgramVersionRefs: z.array(promptProgramVersionIdSchema).min(1),
    agentProfileRefs: refs.min(1),
    modelProfileRefs: refs,
    contextCompilerVersionRef: nonempty,
    evaluationSuiteId: evaluationSuiteIdSchema,
    baselineResultRef: nonempty,
    resultRefs: refs.min(1),
    tokenLedgerRef: nonempty,
    latencyResultRef: nonempty,
    qualityResultRef: nonempty,
    reworkResultRef: nonempty,
    failedResultRefs: refs,
    releaseRecommendation: z.enum([
      "promote",
      "reject",
      "review_required",
      "insufficient_evidence",
    ]),
    startedAt: timestampSchema,
    completedAt: timestampSchema,
  })
  .strict();

export function serializeObservabilityContract(input: JsonValue): string {
  return stableJson(input);
}

export type Trace = z.infer<typeof traceSchema>;
export type Span = z.infer<typeof spanSchema>;
export type GenerationRecord = z.infer<typeof generationRecordSchema>;
export type Observation = z.infer<typeof observationSchema>;
export type EvaluationLink = z.infer<typeof evaluationLinkSchema>;
export type ObservabilityDataset = z.infer<typeof observabilityDatasetSchema>;
export type DatasetItem = z.infer<typeof datasetItemSchema>;
export type Experiment = z.infer<typeof experimentSchema>;
export type ExperimentRun = z.infer<typeof experimentRunSchema>;
