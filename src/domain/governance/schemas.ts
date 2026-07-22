import { z } from "zod";

import {
  approvalStatusSchema,
  projectIdSchema,
  timestampSchema,
  versionIdSchema,
} from "../project";
import {
  contentFingerprintSchema,
  graphNodeIdSchema,
  temporalMetadataSchema,
} from "../knowledge-graph";

const id = <T extends string>(prefix: string) =>
  z
    .string()
    .regex(new RegExp(`^${prefix}_[a-z0-9]+(?:_[a-z0-9]+)*$`))
    .brand<T>();
export const constitutionRuleIdSchema = id<"ConstitutionRuleId">("constitution_rule");
export const specificationIdSchema = id<"SpecificationId">("spec");
export const acceptanceCriterionIdSchema = id<"AcceptanceCriterionId">("criterion");
export const technicalPlanIdSchema = id<"TechnicalPlanId">("plan");
export const implementationSliceIdSchema = id<"ImplementationSliceId">("slice");
export const convergenceFindingIdSchema = id<"ConvergenceFindingId">("convergence");
const referenceList = z.array(z.string().trim().min(1));

export const constitutionRuleSchema = z
  .object({
    id: constitutionRuleIdSchema,
    projectId: projectIdSchema,
    title: z.string().trim().min(1),
    description: z.string().trim().min(1),
    category: z.enum([
      "product",
      "architecture",
      "security",
      "privacy",
      "quality",
      "accessibility",
      "data_ownership",
      "ai_workflow",
      "agent_permissions",
      "token_efficiency",
      "compliance",
      "deployment",
    ]),
    severity: z.enum(["blocking", "required", "advisory"]),
    applicability: referenceList.min(1),
    sourceRefs: referenceList.min(1),
    evidenceRefs: referenceList,
    approvalStatus: approvalStatusSchema,
    effectiveVersion: versionIdSchema,
    temporal: temporalMetadataSchema,
    verificationMethod: z.string().trim().min(1),
    violationConsequence: z.string().trim().min(1),
    freshness: z.enum(["current", "stale", "unknown"]),
    fingerprint: contentFingerprintSchema,
  })
  .strict();

export const acceptanceCriterionSchema = z
  .object({
    id: acceptanceCriterionIdSchema,
    statement: z.string().trim().min(1),
    specificationId: specificationIdSchema,
    sourceRefs: referenceList.min(1),
    evidenceRefs: referenceList.min(1),
    verificationRefs: referenceList,
    approvalStatus: approvalStatusSchema,
  })
  .strict();

export const specificationSchema = z
  .object({
    id: specificationIdSchema,
    projectId: projectIdSchema,
    version: z.number().int().positive(),
    title: z.string().trim().min(1),
    what: referenceList.min(1),
    why: referenceList.min(1),
    actors: referenceList.min(1),
    outcomes: referenceList.min(1),
    constraints: referenceList,
    scope: referenceList.min(1),
    exclusions: referenceList,
    acceptanceCriteria: z.array(acceptanceCriterionSchema).min(1),
    sourceRefs: referenceList.min(1),
    evidenceRefs: referenceList.min(1),
    approvalStatus: approvalStatusSchema,
    fingerprint: contentFingerprintSchema,
  })
  .strict();

export const technicalPlanReferenceSchema = z
  .object({
    id: technicalPlanIdSchema,
    specificationId: specificationIdSchema,
    version: z.number().int().positive(),
    componentRefs: referenceList.min(1),
    interfaceRefs: referenceList,
    dependencyRefs: referenceList,
    securityRefs: referenceList,
    testStrategyRefs: referenceList.min(1),
    approvalStatus: approvalStatusSchema,
    fingerprint: contentFingerprintSchema,
  })
  .strict();

export const implementationSliceSchema = z
  .object({
    id: implementationSliceIdSchema,
    version: z.number().int().positive(),
    specificationId: specificationIdSchema,
    specificationVersion: z.number().int().positive(),
    specificationFingerprint: contentFingerprintSchema,
    technicalPlanId: technicalPlanIdSchema,
    technicalPlanVersion: z.number().int().positive(),
    technicalPlanFingerprint: contentFingerprintSchema,
    constitutionFingerprint: contentFingerprintSchema,
    goal: z.string().trim().min(1),
    order: z.number().int().nonnegative(),
    kind: z.enum(["vertical", "foundation"]),
    prerequisiteSliceIds: z.array(implementationSliceIdSchema),
    acceptanceCriterionIds: z.array(acceptanceCriterionIdSchema).min(1),
    scope: referenceList.min(1),
    exclusions: referenceList,
    riskRefs: referenceList,
    evidenceRefs: referenceList.min(1),
    validationCommands: referenceList.min(1),
    artifactOutputRefs: referenceList,
    editableScope: referenceList,
    protectedScope: referenceList,
    rollbackStrategy: z.string().trim().min(1),
    foundationJustification: z.string().trim().min(1).nullable(),
    parallelGroup: z.string().trim().min(1).nullable(),
    approvalStatus: approvalStatusSchema,
    lifecycle: z.enum(["draft", "approved", "used", "completed", "superseded"]),
    parentSliceVersion: z.number().int().positive().nullable(),
    parentSliceFingerprint: contentFingerprintSchema.nullable(),
    createdAt: timestampSchema,
    approvedAt: timestampSchema.nullable(),
    usedAt: timestampSchema.nullable(),
    fingerprint: contentFingerprintSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (value.kind === "foundation" && !value.foundationJustification)
      context.addIssue({
        code: "custom",
        path: ["foundationJustification"],
        message: "Foundation slices require an explicit justification",
      });
    if (["approved", "used"].includes(value.lifecycle) && value.approvalStatus !== "approved")
      context.addIssue({
        code: "custom",
        path: ["approvalStatus"],
        message: "Approved slices require approved status",
      });
    if (value.lifecycle === "used" && !value.usedAt)
      context.addIssue({
        code: "custom",
        path: ["usedAt"],
        message: "Used slices require a used timestamp",
      });
  });

export const specificationHealthResultSchema = z
  .object({
    specificationId: specificationIdSchema,
    status: z.enum([
      "healthy",
      "clarification_required",
      "incomplete",
      "conflicted",
      "untestable",
      "blocked",
      "deferred",
      "superseded",
    ]),
    passedCheckIds: referenceList,
    failedCheckIds: referenceList,
    missingInformation: referenceList,
    blockerRefs: referenceList,
    clarificationRefs: referenceList,
    planningMayProceed: z.boolean(),
    policyVersion: z.string().trim().min(1),
    fingerprint: contentFingerprintSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (value.planningMayProceed && value.status !== "healthy")
      context.addIssue({
        code: "custom",
        path: ["planningMayProceed"],
        message: "Only healthy specifications may proceed",
      });
  });

export const convergenceFindingSchema = z
  .object({
    id: convergenceFindingIdSchema,
    requirementOrRuleId: z.string().trim().min(1),
    affectedNodeIds: z.array(graphNodeIdSchema),
    expectedState: z.string().trim().min(1),
    observedState: z.string().trim().min(1),
    evidenceRefs: referenceList.min(1),
    confidence: z.number().min(0).max(100),
    severity: z.enum(["blocking", "high", "medium", "low"]),
    classification: z.enum([
      "fully_converged",
      "partially_implemented",
      "missing_implementation",
      "unverified_implementation",
      "overbuilt_scope",
      "stale_specification",
      "stale_plan",
      "architecture_drift",
      "missing_test_coverage",
      "conflicting_evidence",
      "blocked",
      "repair_required",
      "human_decision_required",
    ]),
    recommendedAction: z.string().trim().min(1),
    approvalRequired: z.boolean(),
  })
  .strict();

export type ConstitutionRule = z.infer<typeof constitutionRuleSchema>;
export type Specification = z.infer<typeof specificationSchema>;
export type AcceptanceCriterion = z.infer<typeof acceptanceCriterionSchema>;
export type TechnicalPlanReference = z.infer<typeof technicalPlanReferenceSchema>;
export type ImplementationSlice = z.infer<typeof implementationSliceSchema>;
export type SpecificationHealthResult = z.infer<typeof specificationHealthResultSchema>;
export type ConvergenceFinding = z.infer<typeof convergenceFindingSchema>;
