import { z } from "zod";

import { contentFingerprintSchema, stableJson, type JsonValue } from "../knowledge-graph";
import { agentProfileRevisionReferenceSchema, taskCardIdSchema } from "../execution";
import { evaluationSuiteIdSchema } from "../evaluation";
import { projectIdSchema, timestampSchema } from "../project";

const nonempty = z.string().trim().min(1);
const refs = z.array(nonempty);
const id = <T extends string>(prefix: string) =>
  z
    .string()
    .regex(new RegExp(`^${prefix}_[a-z0-9]+(?:_[a-z0-9]+)*$`))
    .brand<T>();
export const cognitiveFrameIdSchema = id<"CognitiveFrameId">("frame");
export const divergenceRequestIdSchema = id<"DivergenceRequestId">("divergence_request");
export const branchIdSchema = id<"BranchId">("branch");
export const candidateIdeaIdSchema = id<"CandidateIdeaId">("candidate");
export const candidateClusterIdSchema = id<"CandidateClusterId">("cluster");
export const trapFindingIdSchema = id<"TrapFindingId">("trap");

export const cognitiveFrameMetadataSchema = z
  .object({
    id: cognitiveFrameIdSchema,
    title: nonempty,
    activationDomains: refs.min(1),
    problemTypes: refs.min(1),
    risk: z.enum(["low", "medium", "high"]),
    expectedNovelty: z.enum(["low", "medium", "high"]),
    contextOverheadTokens: z.number().int().nonnegative().nullable(),
    incompatibleConditions: refs,
    evaluationHistoryRefs: refs,
    version: nonempty,
    enabled: z.boolean(),
  })
  .strict();
export const cognitiveFrameSchema = z
  .object({ metadata: cognitiveFrameMetadataSchema, frameInstruction: nonempty })
  .strict();

export const divergenceRequestSchema = z
  .object({
    id: divergenceRequestIdSchema,
    projectId: projectIdSchema,
    decisionTaskCardId: taskCardIdSchema,
    decision: nonempty,
    constraints: refs.min(1),
    acceptedFacts: refs,
    prohibitedOptions: refs,
    evaluationCriteria: refs.min(1),
    uncertainty: refs.min(1),
    graphContextRef: nonempty,
    mode: z.enum(["quick", "standard", "deep"]),
    branchCount: z.number().int().min(2),
    tokenBudget: z.number().int().positive(),
    finalDecisionFormatRef: nonempty,
    approvalState: z.enum(["pending", "approved", "rejected"]),
  })
  .strict();

export const frameSelectionSchema = z
  .object({
    requestId: divergenceRequestIdSchema,
    selectedFrameIds: z.array(cognitiveFrameIdSchema).min(2),
    reasonByFrame: z.record(cognitiveFrameIdSchema, nonempty),
    estimatedOverheadTokens: z.number().int().nonnegative(),
    evaluationSuiteId: evaluationSuiteIdSchema,
    userApprovalRequired: z.boolean(),
  })
  .strict();

export const candidateIdeaSchema = z
  .object({
    id: candidateIdeaIdSchema,
    requestId: divergenceRequestIdSchema,
    branchId: branchIdSchema,
    frameId: cognitiveFrameIdSchema,
    title: nonempty,
    approach: nonempty,
    assumptions: refs,
    risks: refs,
    firstValidationStep: nonempty,
    evidenceRefs: refs,
    siblingResultRefs: z.array(z.never()).max(0),
    approvalState: z.literal("proposal"),
    generatorProfile: agentProfileRevisionReferenceSchema,
    inputContextFingerprint: contentFingerprintSchema,
    outputHash: z.string().regex(/^sha256:[0-9a-f]{64}$/),
    createdAt: timestampSchema,
    tokenUsage: z.number().int().nonnegative().nullable(),
    privacyClassification: z.enum(["public", "internal", "confidential", "restricted"]),
    version: nonempty,
    freshness: z.enum(["current", "stale", "unknown"]),
  })
  .strict();

export const candidateScoreSchema = z
  .object({
    candidateId: candidateIdeaIdSchema,
    dimension: z.enum([
      "novelty",
      "viability",
      "task_fit",
      "safety",
      "maintainability",
      "reversibility",
      "expected_cost",
      "implementation_complexity",
      "evidence_strength",
    ]),
    value: z.number().min(0).max(100).nullable(),
    status: z.enum(["passed", "failed", "uncertain", "not_applicable"]),
    reason: nonempty,
    evaluator: agentProfileRevisionReferenceSchema,
    confidence: z.number().min(0).max(100),
    evidenceRefs: refs,
    version: nonempty,
    hardConstraint: z.boolean(),
  })
  .strict();

export const criticResultSchema = z
  .object({
    requestId: divergenceRequestIdSchema,
    criticProfile: agentProfileRevisionReferenceSchema,
    candidateIds: z.array(candidateIdeaIdSchema).min(1),
    scores: z.array(candidateScoreSchema).min(1),
    evidenceRefs: refs,
    version: nonempty,
  })
  .strict()
  .superRefine((value, context) => {
    const candidates = new Set(value.candidateIds);
    if (value.scores.some((score) => !candidates.has(score.candidateId)))
      context.addIssue({
        code: "custom",
        path: ["scores"],
        message: "Critic scores must reference declared candidates",
      });
  });

export const candidateClusterSchema = z
  .object({
    id: candidateClusterIdSchema,
    requestId: divergenceRequestIdSchema,
    label: nonempty,
    underlyingApproach: nonempty,
    candidateIds: z.array(candidateIdeaIdSchema).min(1),
    evidenceRefs: refs,
    version: nonempty,
  })
  .strict();
export const trapFindingSchema = z
  .object({
    id: trapFindingIdSchema,
    candidateId: candidateIdeaIdSchema,
    category: z.enum([
      "false_economy",
      "premature_abstraction",
      "hidden_operational_burden",
      "security_weakness",
      "vendor_lock_in",
      "non_scalable_design",
      "untestable_architecture",
      "high_migration_cost",
      "poor_reversibility",
      "compliance_risk",
      "excessive_reasoning_cost",
      "irrelevant_novelty",
      "complexity_without_user_value",
    ]),
    explanation: nonempty,
    severity: z.enum(["blocking", "high", "medium", "low"]),
    evidenceRefs: refs,
    mitigation: nonempty,
    rejectCandidate: z.boolean(),
  })
  .strict();
export const deepenedCandidateSchema = z
  .object({
    candidateId: candidateIdeaIdSchema,
    requestId: divergenceRequestIdSchema,
    expandedApproach: nonempty,
    validationPlan: refs.min(1),
    unresolvedRisks: refs,
    evidenceRefs: refs,
    version: nonempty,
  })
  .strict();

export const divergenceCostEstimateSchema = z
  .object({
    sharedBaseContextTokens: z.number().int().nonnegative(),
    contextPerBranchTokens: z.number().int().nonnegative(),
    branchCount: z.number().int().min(2),
    repeatedBranchContextTokens: z.number().int().nonnegative(),
    expectedBranchOutputTokens: z.number().int().nonnegative(),
    criticTokens: z.number().int().nonnegative(),
    clusteringTokens: z.number().int().nonnegative(),
    deepeningCount: z.number().int().nonnegative(),
    deepeningTokens: z.number().int().nonnegative(),
    orchestrationOverheadTokens: z.number().int().nonnegative(),
    totalEstimatedTokens: z.number().int().nonnegative(),
    latencyEstimateMs: z.number().int().nonnegative().nullable(),
    expectedDecisionValue: z.enum(["low", "medium", "high"]),
  })
  .strict()
  .superRefine((value, context) => {
    const repeated = value.contextPerBranchTokens * value.branchCount;
    const total =
      value.sharedBaseContextTokens +
      repeated +
      value.expectedBranchOutputTokens * value.branchCount +
      value.criticTokens +
      value.clusteringTokens +
      value.deepeningCount * value.deepeningTokens +
      value.orchestrationOverheadTokens;
    if (value.repeatedBranchContextTokens !== repeated)
      context.addIssue({
        code: "custom",
        path: ["repeatedBranchContextTokens"],
        message: "Repeated branch context must include every isolated branch",
      });
    if (value.totalEstimatedTokens !== total)
      context.addIssue({
        code: "custom",
        path: ["totalEstimatedTokens"],
        message: "Total divergence cost is inconsistent",
      });
  });

export const divergenceActivationDecisionSchema = z
  .object({
    requestId: divergenceRequestIdSchema,
    decision: z.enum([
      "recommended",
      "optional",
      "not_cost_effective",
      "blocked_by_budget",
      "blocked_by_insufficient_context",
      "blocked_by_risk",
    ]),
    reason: nonempty,
    costEstimate: divergenceCostEstimateSchema,
    availableBudgetTokens: z.number().int().positive(),
    selectedMode: z.enum(["quick", "standard", "deep"]).nullable(),
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.costEstimate.totalEstimatedTokens > value.availableBudgetTokens &&
      !["blocked_by_budget", "blocked_by_insufficient_context"].includes(value.decision)
    )
      context.addIssue({
        code: "custom",
        path: ["decision"],
        message: "Insufficient budget must block activation",
      });
  });

export const divergenceReportSchema = z
  .object({
    requestId: divergenceRequestIdSchema,
    candidateIds: z.array(candidateIdeaIdSchema).min(1),
    clusters: z.array(candidateClusterSchema).min(1),
    scores: z.array(candidateScoreSchema),
    traps: z.array(trapFindingSchema),
    deepenedCandidates: z.array(deepenedCandidateSchema),
    shortlistIds: z.array(candidateIdeaIdSchema),
    nonObviousViableCandidateId: candidateIdeaIdSchema.nullable(),
    recommendationCandidateId: candidateIdeaIdSchema.nullable(),
    unresolvedDecision: nonempty.nullable(),
    firstValidationStep: nonempty,
    status: z.enum(["proposal", "awaiting_approval", "approved", "rejected"]),
    artifactRefs: refs,
    version: nonempty,
  })
  .strict()
  .superRefine((value, context) => {
    const candidates = new Set(value.candidateIds);
    const referenced = [
      ...value.shortlistIds,
      ...value.clusters.flatMap((cluster) => cluster.candidateIds),
      ...(value.recommendationCandidateId ? [value.recommendationCandidateId] : []),
      ...(value.nonObviousViableCandidateId ? [value.nonObviousViableCandidateId] : []),
    ];
    if (referenced.some((candidateId) => !candidates.has(candidateId)))
      context.addIssue({
        code: "custom",
        path: ["candidateIds"],
        message: "Report references unknown candidates",
      });
    const blocked = new Set(
      value.scores
        .filter((score) => score.hardConstraint && score.status === "failed")
        .map((score) => score.candidateId),
    );
    if (
      value.shortlistIds.some((candidateId) => blocked.has(candidateId)) ||
      (value.recommendationCandidateId && blocked.has(value.recommendationCandidateId))
    )
      context.addIssue({
        code: "custom",
        path: ["shortlistIds"],
        message: "Hard safety failures cannot be selected",
      });
  });

export function serializeDivergenceContract(input: JsonValue): string {
  return stableJson(input);
}
