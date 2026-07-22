import { z } from "zod";

import {
  governanceFindingIdSchema,
  governanceFindingSchema,
  governanceReportSchema,
  implementationSliceIdSchema,
  implementationSliceSchema,
  specificationIdSchema,
  technicalPlanIdSchema,
} from "../governance";
import { contentFingerprintSchema, temporalMetadataSchema } from "../knowledge-graph";
import { approvalStatusSchema, projectIdSchema, timestampSchema } from "../project";

const nonempty = z.string().trim().min(1);
const refs = z.array(nonempty);
const brandedId = <T extends string>(prefix: string) =>
  z
    .string()
    .regex(new RegExp(`^${prefix}_[a-z0-9]+(?:_[a-z0-9]+)*$`))
    .brand<T>();

export const planGovernanceReportIdSchema = brandedId<"PlanGovernanceReportId">("plan_report");
export const sliceGovernanceReportIdSchema = brandedId<"SliceGovernanceReportId">("slice_report");

export const planLifecycleSchema = z.enum(["draft", "approved", "used", "superseded"]);

export const technicalPlanVersionSchema = z
  .object({
    version: z.number().int().positive(),
    lifecycle: planLifecycleSchema,
    parentVersion: z.number().int().positive().nullable(),
    parentFingerprint: contentFingerprintSchema.nullable(),
    createdAt: timestampSchema,
    approvedAt: timestampSchema.nullable(),
    usedAt: timestampSchema.nullable(),
    supersededAt: timestampSchema.nullable(),
  })
  .strict();

export const technicalPlanSchema = z
  .object({
    id: technicalPlanIdSchema,
    projectId: projectIdSchema,
    title: nonempty,
    specificationId: specificationIdSchema,
    specificationVersion: z.number().int().positive(),
    specificationFingerprint: contentFingerprintSchema,
    constitutionFingerprint: contentFingerprintSchema,
    governanceReportId: nonempty,
    governanceReportFingerprint: contentFingerprintSchema,
    architectureRefs: refs.min(1),
    componentRefs: refs.min(1),
    interfaceRefs: refs,
    dataModelRefs: refs,
    dependencyRefs: refs,
    migrationRefs: refs,
    securityRefs: refs,
    testStrategyRefs: refs.min(1),
    rolloutRefs: refs,
    rollbackRefs: refs.min(1),
    scope: refs.min(1),
    exclusions: refs,
    riskRefs: refs,
    acceptanceCriterionIds: refs,
    implementationSequence: z.array(implementationSliceIdSchema),
    protectedScope: refs,
    sourceRefs: refs.min(1),
    evidenceRefs: refs.min(1),
    approvalStatus: approvalStatusSchema,
    revision: technicalPlanVersionSchema,
    fingerprint: contentFingerprintSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (
      ["approved", "used"].includes(value.revision.lifecycle) &&
      value.approvalStatus !== "approved"
    )
      context.addIssue({
        code: "custom",
        path: ["approvalStatus"],
        message: "Approved plans require approved status",
      });
    if (value.revision.lifecycle === "used" && !value.revision.usedAt)
      context.addIssue({
        code: "custom",
        path: ["revision", "usedAt"],
        message: "Used plans require a used timestamp",
      });
  });

export const implementationSliceVersionSchema = z
  .object({
    version: z.number().int().positive(),
    lifecycle: z.enum(["draft", "approved", "used", "completed", "superseded"]),
    parentSliceVersion: z.number().int().positive().nullable(),
    parentSliceFingerprint: contentFingerprintSchema.nullable(),
    createdAt: timestampSchema,
    approvedAt: timestampSchema.nullable(),
    usedAt: timestampSchema.nullable(),
    fingerprint: contentFingerprintSchema,
  })
  .strict();

export const planningInputSchema = z
  .object({
    parentGovernanceReport: governanceReportSchema,
    plan: technicalPlanSchema,
    evaluationTimestamp: timestampSchema,
  })
  .strict();

export const planNormalizationResultSchema = z
  .object({
    plan: technicalPlanSchema,
    fingerprint: contentFingerprintSchema,
    declaredFingerprintMatches: z.boolean(),
    actions: refs,
    warnings: z.array(governanceFindingSchema),
    blockingErrors: z.array(governanceFindingSchema),
  })
  .strict();

export const sliceNormalizationResultSchema = z
  .object({
    slice: implementationSliceSchema,
    fingerprint: contentFingerprintSchema,
    declaredFingerprintMatches: z.boolean(),
    actions: refs,
    warnings: z.array(governanceFindingSchema),
    blockingErrors: z.array(governanceFindingSchema),
  })
  .strict();

export const planningHealthDimensionSchema = z
  .object({
    dimension: z.enum([
      "parent_governance",
      "structural_completeness",
      "internal_consistency",
      "traceability",
      "approval_completeness",
      "freshness",
    ]),
    result: z.enum(["pass", "warning", "fail", "unknown"]),
    passedCheckIds: refs,
    failedCheckIds: refs,
    unknownCheckIds: refs,
    blockingFindingIds: z.array(governanceFindingIdSchema),
    evaluatorVersion: nonempty,
  })
  .strict();

export const planningHealthResultSchema = z
  .object({
    subjectId: nonempty,
    status: z.enum(["healthy", "incomplete", "conflicted", "blocked", "stale"]),
    dimensions: z.array(planningHealthDimensionSchema).length(6),
    blockingReasons: refs,
    recommendations: refs,
    evaluatorVersion: nonempty,
    inputFingerprint: contentFingerprintSchema,
  })
  .strict();

export const planningReadinessDecisionSchema = z
  .object({
    decision: z.enum(["readiness_recommended", "not_ready", "human_review_required", "stale"]),
    blockingReasons: refs,
    recommendations: refs,
    governingPolicyVersion: nonempty,
    subjectId: nonempty,
    subjectVersion: z.number().int().positive(),
    parentFingerprints: z.record(z.string(), contentFingerprintSchema),
    requiredNextAction: nonempty,
    humanApprovalRequired: z.boolean(),
  })
  .strict();

export const planGovernanceReportSchema = z
  .object({
    id: planGovernanceReportIdSchema,
    plan: technicalPlanSchema,
    normalization: planNormalizationResultSchema,
    derivedSlices: z.array(implementationSliceSchema),
    structuralFindings: z.array(governanceFindingSchema),
    consistencyFindings: z.array(governanceFindingSchema),
    traceabilityFindings: z.array(governanceFindingSchema),
    health: planningHealthResultSchema,
    readiness: planningReadinessDecisionSchema,
    evaluatorVersions: z.record(z.string(), nonempty),
    evaluatedAt: timestampSchema,
    temporal: temporalMetadataSchema,
    semanticFingerprint: contentFingerprintSchema,
  })
  .strict();

export const sliceGovernanceReportSchema = z
  .object({
    id: sliceGovernanceReportIdSchema,
    slice: implementationSliceSchema,
    normalization: sliceNormalizationResultSchema,
    structuralFindings: z.array(governanceFindingSchema),
    traceabilityFindings: z.array(governanceFindingSchema),
    health: planningHealthResultSchema,
    readiness: planningReadinessDecisionSchema,
    parentPlanReportFingerprint: contentFingerprintSchema,
    evaluatorVersions: z.record(z.string(), nonempty),
    evaluatedAt: timestampSchema,
    temporal: temporalMetadataSchema,
    semanticFingerprint: contentFingerprintSchema,
  })
  .strict();

export type TechnicalPlan = z.infer<typeof technicalPlanSchema>;
export type TechnicalPlanVersion = z.infer<typeof technicalPlanVersionSchema>;
export type ImplementationSliceVersion = z.infer<typeof implementationSliceVersionSchema>;
export type PlanningInput = z.infer<typeof planningInputSchema>;
export type PlanNormalizationResult = z.infer<typeof planNormalizationResultSchema>;
export type SliceNormalizationResult = z.infer<typeof sliceNormalizationResultSchema>;
export type PlanningHealthResult = z.infer<typeof planningHealthResultSchema>;
export type PlanningReadinessDecision = z.infer<typeof planningReadinessDecisionSchema>;
export type PlanGovernanceReport = z.infer<typeof planGovernanceReportSchema>;
export type SliceGovernanceReport = z.infer<typeof sliceGovernanceReportSchema>;
export type ImplementationSlice = z.infer<typeof implementationSliceSchema>;
