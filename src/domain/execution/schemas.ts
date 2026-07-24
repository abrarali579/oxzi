import { z } from "zod";

import { contentFingerprintSchema, graphNodeIdSchema } from "../knowledge-graph";
import { projectIdSchema, timestampSchema, versionIdSchema } from "../project";

const nonempty = z.string().trim().min(1);
const refs = z.array(nonempty);
const brandedId = <T extends string>(prefix: string) =>
  z
    .string()
    .regex(new RegExp(`^${prefix}_[a-z0-9]+(?:_[a-z0-9]+)*$`))
    .brand<T>();
export const taskCardIdSchema = brandedId<"TaskCardId">("task_card");
export const executionPassportIdSchema = brandedId<"ExecutionPassportId">("passport");
export const agentProfileIdSchema = brandedId<"AgentProfileId">("agent_profile");
export const executionIdSchema = brandedId<"ExecutionId">("execution");
export const artifactIdSchema = brandedId<"ArtifactId">("artifact");
export const executionEventIdSchema = brandedId<"ExecutionEventId">("event");

export const conversationStatusSchema = z.enum([
  "created",
  "active",
  "paused",
  "completed",
  "archived",
  "failed",
]);
export const executionStatusSchema = z.enum([
  "queued",
  "preparing",
  "awaiting_approval",
  "running",
  "awaiting_input",
  "blocked",
  "validating",
  "reviewing",
  "completed",
  "failed",
  "cancelled",
  "timed_out",
]);
export const runtimeStatusSchema = z.enum([
  "missing",
  "starting",
  "running",
  "paused",
  "error",
  "stopping",
  "archived",
]);

export const agentProfileRevisionReferenceSchema = z
  .object({
    profileId: agentProfileIdSchema,
    revision: z.number().int().positive(),
    fingerprint: contentFingerprintSchema,
  })
  .strict();
export const agentCapabilityProfileSchema = z
  .object({
    id: agentProfileIdSchema,
    revision: z.number().int().positive(),
    integrationType: z.enum([
      "instruction_file",
      "cli",
      "api",
      "plugin",
      "session_hook",
      "agent_protocol",
      "artifact_exchange",
      "manual_copy",
    ]),
    instructionFiles: refs,
    promptStyles: refs,
    structuredInput: z.boolean(),
    structuredOutput: z.boolean(),
    contextWindow: z.number().int().positive().nullable(),
    tokenizerRef: nonempty.nullable(),
    modelProfileRef: nonempty.nullable(),
    toolProfileRef: nonempty.nullable(),
    mcpProfileRef: nonempty.nullable(),
    workflowDefaultsRef: nonempty.nullable(),
    promptPreferenceRef: nonempty.nullable(),
    qualityMode: nonempty,
    approvalPolicyRef: nonempty,
    capabilities: z
      .object({
        planMode: z.boolean(),
        sessionReset: z.boolean(),
        compaction: z.boolean(),
        contextInspection: z.boolean(),
        costInspection: z.boolean(),
        artifacts: z.boolean(),
        directDelivery: z.boolean(),
        executionMonitoring: z.boolean(),
        pauseResume: z.boolean(),
        stopCancel: z.boolean(),
        subAgents: z.boolean(),
        readOnlyContext: z.boolean(),
        patchEdits: z.boolean(),
      })
      .strict(),
    sandboxRequirements: refs,
    fingerprint: contentFingerprintSchema,
  })
  .strict();

export const normalizedTaskCardSchema = z
  .object({
    id: taskCardIdSchema,
    projectId: projectIdSchema,
    projectVersionId: versionIdSchema,
    taskType: nonempty,
    goal: nonempty,
    reason: nonempty,
    specificationRefs: refs.min(1),
    planRefs: refs,
    constitutionRuleRefs: refs,
    graphSeedIds: z.array(graphNodeIdSchema),
    repositorySeeds: refs,
    affectedNodeIds: z.array(graphNodeIdSchema),
    expectedAffectedFiles: refs,
    editableScope: refs,
    readOnlyScope: refs,
    prohibitedScope: refs,
    dependencies: refs,
    constraints: refs,
    acceptanceCriteriaRefs: refs.min(1),
    validationCommands: refs.min(1),
    risks: refs,
    workflowPolicyRef: nonempty,
    requiredSkillRefs: refs,
    expectedOutputs: refs.min(1),
    outputContractRef: nonempty,
    deferredWork: refs,
    recommendedCommitMessage: nonempty,
    contextSufficiency: z.enum(["sufficient", "insufficient", "blocked"]),
    tokenEstimate: z.number().int().nonnegative().nullable(),
    approvalState: z.enum(["pending", "approved", "rejected"]),
    freshness: z.enum(["current", "stale", "unknown"]),
  })
  .strict();

export const executionPassportSchema = z
  .object({
    id: executionPassportIdSchema,
    projectId: projectIdSchema,
    canonicalVersionId: versionIdSchema,
    graphVersion: nonempty,
    repositoryRevision: nonempty,
    taskCardId: taskCardIdSchema,
    targetAgent: agentProfileRevisionReferenceSchema,
    workflowPolicyRef: nonempty,
    requiredSkillRefs: refs,
    compiledContextArtifactId: artifactIdSchema,
    editableScope: refs,
    readOnlyScope: refs,
    restrictedScope: refs,
    acceptanceCriteriaRefs: refs.min(1),
    validationCommands: refs.min(1),
    outputContractRef: nonempty,
    artifactDestination: nonempty,
    tokenBudget: z.number().int().positive().nullable(),
    freshness: z.enum(["current", "stale", "unknown"]),
    approval: z.enum(["pending", "approved", "rejected"]),
    expiresAt: timestampSchema.nullable(),
    securityClassification: z.enum(["public", "internal", "confidential", "restricted"]),
    fingerprint: contentFingerprintSchema,
  })
  .strict();

const sensitiveLocation = /(?:^|\/)(?:\.env(?:\.[^/]*)?|credentials?|secrets?)(?:\/|$)/i;
export const artifactReferenceSchema = z
  .object({
    id: artifactIdSchema,
    type: nonempty,
    contentLocation: nonempty.refine(
      (value) => !sensitiveLocation.test(value),
      "Sensitive artifact locations are prohibited",
    ),
    hash: z.string().regex(/^sha256:[0-9a-f]{64}$/),
    version: nonempty,
    producer: nonempty,
    projectId: projectIdSchema,
    executionId: executionIdSchema.nullable(),
    privacyClassification: z.enum(["public", "internal", "confidential", "restricted"]),
    freshness: z.enum(["current", "stale", "unknown"]),
    retention: nonempty,
    verificationStatus: z.enum(["verified", "unverified", "failed"]),
  })
  .strict();

export const executionEventSchema = z
  .object({
    id: executionEventIdSchema,
    executionId: executionIdSchema,
    timestamp: timestampSchema,
    sequence: z.number().int().nonnegative(),
    type: nonempty,
    actor: nonempty,
    source: nonempty,
    payloadArtifactId: artifactIdSchema.nullable(),
    redactionStatus: z.enum(["not_required", "redacted", "rejected"]),
    hash: z.string().regex(/^sha256:[0-9a-f]{64}$/),
    parentEventId: executionEventIdSchema.nullable(),
    visibility: z.enum(["private", "project", "workspace"]),
    evidenceStatus: z.enum(["claim", "observed", "verified", "rejected"]),
  })
  .strict();
export const executionEventLogSchema = z
  .array(executionEventSchema)
  .superRefine((events, context) => {
    events.forEach((event, index) => {
      if (event.sequence !== index)
        context.addIssue({
          code: "custom",
          path: [index, "sequence"],
          message: "Event sequence must be contiguous and ordered",
        });
    });
  });

export const executionReceiptSchema = z
  .object({
    status: executionStatusSchema,
    executionId: executionIdSchema,
    artifactIds: z.array(artifactIdSchema),
    changedFiles: refs,
    validationSummary: refs,
    blockingFindings: refs,
    nextRequiredDecision: nonempty.nullable(),
  })
  .strict();

export const tokenMeasurementStatusSchema = z.enum([
  "measured_by_target_tokenizer",
  "measured_by_provider",
  "tokenizer_estimated",
  "character_estimated",
  "unavailable",
]);
export const tokenLedgerRecordSchema = z
  .object({
    executionId: executionIdSchema,
    categories: z.record(
      nonempty,
      z
        .object({
          tokens: z.number().int().nonnegative().nullable(),
          status: tokenMeasurementStatusSchema,
        })
        .strict(),
    ),
    baselineTokens: z.number().int().nonnegative().nullable(),
    compiledTokens: z.number().int().nonnegative().nullable(),
    grossSaving: z.number().int().nullable(),
    optimizationOverhead: z.number().int().nonnegative().nullable(),
    netSaving: z.number().int().nullable(),
    mandatoryCoverage: z.boolean(),
    qualityResult: z.enum(["passed", "failed", "unavailable"]),
    reworkResult: z.enum(["none", "required", "unavailable"]),
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.netSaving !== null &&
      value.netSaving > 0 &&
      (!value.mandatoryCoverage ||
        value.qualityResult !== "passed" ||
        value.reworkResult === "required")
    )
      context.addIssue({
        code: "custom",
        path: ["netSaving"],
        message: "Positive savings require coverage, quality, and no compression-caused rework",
      });
  });

// ── Execution Report ────────────────────────────────────────────

export const executionReportStatusSchema = z.enum([
  "success",
  "partial",
  "failed",
  "blocked",
]);

export const executionMetricsSchema = z
  .object({
    totalLatencyMs: z.number().int().nonnegative(),
    inputTokens: z.number().int().nonnegative().nullable(),
    outputTokens: z.number().int().nonnegative().nullable(),
    costEstimate: z.number().nonnegative().nullable(),
  })
  .strict();

const traceRefSchema = z
  .string()
  .regex(/^trace_[a-f0-9]{16}$/)
  .describe("Observability trace reference");

export const executionReportSchema = z
  .object({
    traceId: traceRefSchema,
    passportId: z.string(),
    executionId: executionIdSchema,
    status: executionReportStatusSchema,
    artifacts: z.array(artifactReferenceSchema),
    rawOutputRef: z.string().nullable(),
    error: z.string().nullable(),
    metrics: executionMetricsSchema,
    startedAt: timestampSchema,
    endedAt: timestampSchema,
    fingerprint: contentFingerprintSchema,
  })
  .strict();

// ── Provider Adapter ───────────────────────────────────────────

export const providerTypeSchema = z.enum([
  "mock",
  "openai",
  "anthropic",
  "local",
  "custom",
]);

export const providerCapabilitySchema = z.enum([
  "text_generation",
  "structured_output",
  "tool_use",
  "streaming",
  "vision",
  "code_generation",
]);

export const providerAdapterConfigSchema = z
  .object({
    providerId: z.string().trim().min(1),
    providerType: providerTypeSchema,
    capabilities: z.array(providerCapabilitySchema).min(1),
    supportsArtifacts: z.boolean(),
    maxContextTokens: z.number().int().positive().nullable(),
    defaultModel: z.string().trim().min(1),
  })
  .strict();

export const providerResponseSchema = z
  .object({
    rawText: z.string(),
    parsedContract: z.record(z.string(), z.unknown()).nullable(),
    finishReason: z.string().nullable(),
    inputTokens: z.number().int().nonnegative().nullable(),
    outputTokens: z.number().int().nonnegative().nullable(),
    latencyMs: z.number().int().nonnegative(),
  })
  .strict();

// ── Agent Role ─────────────────────────────────────────────────

export const agentRoleSchema = z.enum([
  "architect",
  "executor",
  "reviewer",
]);

export const agentCapabilityMappingSchema = z
  .object({
    role: agentRoleSchema,
    requiredCapabilities: z.array(z.string()),
    forbiddenCapabilities: z.array(z.string()),
  })
  .strict();

// ── Execution error types ──────────────────────────────────────

export const executionErrorTypeSchema = z.enum([
  "passport_invalid",
  "passport_expired",
  "capability_mismatch",
  "provider_error",
  "provider_timeout",
  "structured_parse_failure",
  "contract_violation",
  "unknown",
]);

export type NormalizedTaskCard = z.infer<typeof normalizedTaskCardSchema>;
export type ExecutionPassport = z.infer<typeof executionPassportSchema>;
export type AgentCapabilityProfile = z.infer<typeof agentCapabilityProfileSchema>;
export type ExecutionEvent = z.infer<typeof executionEventSchema>;
export type ArtifactReference = z.infer<typeof artifactReferenceSchema>;
export type TokenLedgerRecord = z.infer<typeof tokenLedgerRecordSchema>;
export type ExecutionReport = z.infer<typeof executionReportSchema>;
export type ExecutionReportStatus = z.infer<typeof executionReportStatusSchema>;
export type ExecutionMetrics = z.infer<typeof executionMetricsSchema>;
export type ProviderAdapterConfig = z.infer<typeof providerAdapterConfigSchema>;
export type ProviderResponse = z.infer<typeof providerResponseSchema>;
export type ProviderType = z.infer<typeof providerTypeSchema>;
export type ProviderCapability = z.infer<typeof providerCapabilitySchema>;
export type AgentRole = z.infer<typeof agentRoleSchema>;
export type AgentCapabilityMapping = z.infer<typeof agentCapabilityMappingSchema>;
export type ExecutionErrorType = z.infer<typeof executionErrorTypeSchema>;
