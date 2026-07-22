import { z } from "zod";

import { normalizedTaskCardSchema } from "../execution";
import {
  contentFingerprintSchema,
  jsonValueSchema,
  temporalMetadataSchema,
} from "../knowledge-graph";
import {
  approvalStatusSchema,
  canonicalProjectSchema,
  criticalitySchema,
  decisionIdSchema,
  projectIdSchema,
  timestampSchema,
  versionIdSchema,
} from "../project";
import {
  acceptanceCriterionIdSchema,
  constitutionRuleIdSchema,
  constitutionRuleSchema,
  implementationSliceSchema,
  specificationHealthResultSchema,
  specificationIdSchema,
  specificationSchema,
  technicalPlanReferenceSchema,
} from "./schemas";

const nonempty = z.string().trim().min(1);
const refs = z.array(nonempty);
const id = <T extends string>(prefix: string) =>
  z
    .string()
    .regex(new RegExp(`^${prefix}_[a-z0-9]+(?:_[a-z0-9]+)*$`))
    .brand<T>();

export const specificationRequirementIdSchema = id<"SpecificationRequirementId">("requirement");
export const constitutionExceptionIdSchema =
  id<"ConstitutionExceptionId">("constitution_exception");
export const constitutionResolutionIdSchema =
  id<"ConstitutionResolutionId">("constitution_resolution");
export const governanceFindingIdSchema = id<"GovernanceFindingId">("governance_finding");
export const clarificationNeedIdSchema = id<"ClarificationNeedId">("clarification_need");
export const traceabilityLinkIdSchema = id<"TraceabilityLinkId">("trace_link");
export const governanceReportIdSchema = id<"GovernanceReportId">("governance_report");

export const governanceEvaluatorVersionsSchema = z
  .object({
    normalizer: nonempty,
    constitutionResolver: nonempty,
    structuralValidator: nonempty,
    clarificationAnalyzer: nonempty,
    complianceEvaluator: nonempty,
    consistencyAnalyzer: nonempty,
    traceabilityAnalyzer: nonempty,
    testabilityAnalyzer: nonempty,
    freshnessEvaluator: nonempty,
    healthCalculator: nonempty,
    readinessPolicy: nonempty,
    reportCompiler: nonempty,
  })
  .strict();

export const specificationLifecycleSchema = z.enum([
  "draft",
  "review",
  "approved",
  "readiness_requested",
  "implementation_ready",
  "in_planning",
  "in_implementation",
  "completed",
  "superseded",
]);

export const specificationRequirementSchema = z
  .object({
    id: specificationRequirementIdSchema,
    specificationId: specificationIdSchema,
    statement: nonempty,
    actor: nonempty.nullable(),
    action: nonempty.nullable(),
    object: nonempty.nullable(),
    successCondition: nonempty.nullable(),
    failureBehavior: nonempty.nullable(),
    edgeCaseBehavior: nonempty.nullable(),
    kind: z.enum(["product_requirement", "implementation_constraint"]),
    scopeState: z.enum(["included", "excluded", "deferred", "undecided"]),
    acceptanceCriterionIds: z.array(acceptanceCriterionIdSchema),
    decisionRefs: z.array(decisionIdSchema),
    dependencyRequirementIds: z.array(specificationRequirementIdSchema),
    externalDependencyRefs: refs,
    riskRefs: refs,
    contradictsRequirementIds: z.array(specificationRequirementIdSchema),
    contradictoryCriterionIds: z.array(acceptanceCriterionIdSchema),
    unresolvedQuestions: refs,
    privacyClassification: z
      .enum(["public", "internal", "confidential", "restricted", "unknown"])
      .nullable(),
    dataOwner: nonempty.nullable(),
    authorityRef: nonempty.nullable(),
    approvalBoundaryRef: nonempty.nullable(),
    criticality: criticalitySchema,
    approvalStatus: approvalStatusSchema,
    sourceRefs: refs,
    evidenceRefs: refs,
    freshness: z.enum(["current", "stale", "unknown"]),
  })
  .strict();

export const constitutionPolicyKeySchema = z.enum([
  "product_quality",
  "safety",
  "security",
  "privacy",
  "canonical_state_protection",
  "traceability",
  "evidence_requirements",
  "testing_requirements",
  "human_approval",
  "protected_scope",
  "token_efficiency_hierarchy",
  "provider_neutrality",
  "planned_implemented_honesty",
]);

export const constitutionRuleBindingSchema = z
  .object({
    rule: constitutionRuleSchema,
    authority: z.enum(["global", "project", "specification"]),
    policyKey: constitutionPolicyKeySchema,
    subject: nonempty,
    effect: z.enum(["require", "forbid"]),
  })
  .strict();

export const constitutionExceptionSchema = z
  .object({
    id: constitutionExceptionIdSchema,
    ruleId: constitutionRuleIdSchema,
    specificationId: specificationIdSchema,
    specificationVersion: z.number().int().positive(),
    scopeRefs: refs.min(1),
    approvalStatus: approvalStatusSchema,
    approvedBy: nonempty.nullable(),
    approvedAt: timestampSchema.nullable(),
    justification: nonempty,
    evidenceRefs: refs.min(1),
    fingerprint: contentFingerprintSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (value.approvalStatus === "approved" && (!value.approvedBy || !value.approvedAt))
      context.addIssue({
        code: "custom",
        path: ["approvalStatus"],
        message: "Approved Constitution exceptions require approver and approval time",
      });
  });

export const constitutionComplianceEvidenceSchema = z
  .object({
    ruleId: constitutionRuleIdSchema,
    status: z.enum(["pass", "fail", "not_applicable"]),
    evidenceRefs: refs,
    affectedEntityIds: refs,
    explanation: nonempty,
  })
  .strict();

export const governanceRevisionMetadataSchema = z
  .object({
    lifecycle: specificationLifecycleSchema,
    canonicalVersionId: versionIdSchema,
    canonicalFingerprint: contentFingerprintSchema,
    createdAt: timestampSchema,
    approvedAt: timestampSchema.nullable(),
    supersededAt: timestampSchema.nullable(),
    staleSince: timestampSchema.nullable(),
    parentSpecificationVersion: z.number().int().positive().nullable(),
    parentSpecificationFingerprint: contentFingerprintSchema.nullable(),
    amendmentReason: nonempty.nullable(),
    completedEvidenceRefs: refs,
    humanApprovalRequired: z.boolean(),
    sourceFingerprints: z.array(contentFingerprintSchema),
    dependencyFingerprints: z.array(contentFingerprintSchema),
  })
  .strict();

export const traceabilityEntityTypeSchema = z.enum([
  "requirement",
  "specification",
  "decision",
  "technical_plan",
  "implementation_slice",
  "task_card",
  "validation",
  "review",
  "convergence_finding",
  "artifact",
]);

export const traceabilityLinkSchema = z
  .object({
    id: traceabilityLinkIdSchema,
    fromType: traceabilityEntityTypeSchema,
    fromId: nonempty,
    toType: traceabilityEntityTypeSchema,
    toId: nonempty,
    relationship: nonempty,
    evidenceRefs: refs,
    approvalStatus: approvalStatusSchema,
    freshness: z.enum(["current", "stale", "unknown"]),
  })
  .strict();

export const specificationGovernanceInputSchema = z
  .object({
    canonicalProject: canonicalProjectSchema,
    specification: specificationSchema,
    requirements: z.array(specificationRequirementSchema).min(1),
    revision: governanceRevisionMetadataSchema,
    constitutionVersion: nonempty,
    constitutionRules: z.array(constitutionRuleBindingSchema),
    constitutionExceptions: z.array(constitutionExceptionSchema),
    complianceEvidence: z.array(constitutionComplianceEvidenceSchema),
    technicalPlans: z.array(technicalPlanReferenceSchema),
    implementationSlices: z.array(implementationSliceSchema),
    taskCards: z.array(normalizedTaskCardSchema),
    traceabilityLinks: z.array(traceabilityLinkSchema),
    validationRefs: refs,
    reviewRefs: refs,
    convergenceFindingRefs: refs,
    artifactRefs: refs,
    evaluationTimestamp: timestampSchema,
  })
  .strict();

export const governanceFindingSeveritySchema = z.enum(["info", "warning", "blocking"]);
export const governanceFindingSchema = z
  .object({
    id: governanceFindingIdSchema,
    ruleId: nonempty,
    category: z.enum([
      "structural",
      "constitution",
      "consistency",
      "traceability",
      "testability",
      "freshness",
      "controlled_living",
    ]),
    severity: governanceFindingSeveritySchema,
    message: nonempty,
    evidenceRefs: refs,
    affectedEntityIds: refs,
    remediation: nonempty,
    evaluatorVersion: nonempty,
  })
  .strict();

export const normalizationResultSchema = z
  .object({
    normalizedInput: specificationGovernanceInputSchema,
    fingerprint: contentFingerprintSchema,
    declaredFingerprintMatches: z.boolean(),
    actions: refs,
    warnings: z.array(governanceFindingSchema),
    blockingErrors: z.array(governanceFindingSchema),
  })
  .strict();

export const resolvedConstitutionSchema = z
  .object({
    id: constitutionResolutionIdSchema,
    projectId: projectIdSchema,
    canonicalVersionId: versionIdSchema,
    constitutionVersion: nonempty,
    rules: z.array(constitutionRuleBindingSchema),
    appliedExceptionIds: z.array(constitutionExceptionIdSchema),
    findings: z.array(governanceFindingSchema),
    sourceFingerprint: contentFingerprintSchema,
    fingerprint: contentFingerprintSchema,
  })
  .strict();

export const constitutionComplianceResultSchema = z
  .object({
    ruleId: constitutionRuleIdSchema,
    policyKey: constitutionPolicyKeySchema,
    status: z.enum(["pass", "fail", "unknown", "not_applicable"]),
    evidenceRefs: refs,
    affectedSpecificationEntityIds: refs,
    explanation: nonempty,
    remediation: nonempty,
    evaluatorVersion: nonempty,
    blocking: z.boolean(),
  })
  .strict();

export const clarificationCategorySchema = z.enum([
  "ambiguous_actor",
  "ambiguous_action",
  "ambiguous_object",
  "undefined_success_condition",
  "missing_failure_behavior",
  "missing_edge_case_behavior",
  "conflicting_requirement",
  "undefined_dependency",
  "undefined_authority",
  "unclear_data_ownership",
  "missing_privacy_classification",
  "missing_approval_boundary",
  "unclear_scope_inclusion",
  "unclear_scope_exclusion",
  "missing_acceptance_criterion",
  "unverifiable_acceptance_criterion",
  "implementation_detail_as_product_requirement",
]);

export const clarificationNeedSchema = z
  .object({
    id: clarificationNeedIdSchema,
    category: clarificationCategorySchema,
    severity: governanceFindingSeveritySchema,
    affectedRequirementIds: z.array(specificationRequirementIdSchema).min(1),
    evidenceRefs: refs,
    question: nonempty,
    blocking: z.boolean(),
    evaluatorVersion: nonempty,
  })
  .strict();

export const freshnessEvaluationSchema = z
  .object({
    status: z.enum(["current", "stale", "unknown"]),
    specificationVersion: z.number().int().positive(),
    constitutionVersion: nonempty,
    canonicalVersionId: versionIdSchema,
    inputFingerprints: z
      .object({
        specification: contentFingerprintSchema,
        constitution: contentFingerprintSchema,
        canonical: contentFingerprintSchema,
      })
      .strict(),
    passedCheckIds: refs,
    failedCheckIds: refs,
    unknownCheckIds: refs,
    findings: z.array(governanceFindingSchema),
    evaluatorVersion: nonempty,
  })
  .strict();

export const healthDimensionSchema = z
  .object({
    dimension: z.enum([
      "structural_completeness",
      "clarification_completeness",
      "constitutional_compliance",
      "internal_consistency",
      "traceability",
      "testability",
      "approval_completeness",
      "freshness",
    ]),
    result: z.enum(["pass", "warning", "fail", "unknown", "not_applicable"]),
    calculationInputs: refs,
    passedCheckIds: refs,
    failedCheckIds: refs,
    unknownCheckIds: refs,
    blockingFindingIds: z.array(governanceFindingIdSchema),
    evaluatorVersion: nonempty,
  })
  .strict();

export const governanceHealthResultSchema = z
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
    readinessClass: z.enum([
      "draft",
      "clarification_required",
      "constitution_blocked",
      "inconsistent",
      "structurally_incomplete",
      "untestable",
      "review_required",
      "implementation_ready",
      "stale",
    ]),
    dimensions: z.array(healthDimensionSchema).length(8),
    blockingReasons: refs,
    recommendations: refs,
    evaluatorVersion: nonempty,
    inputFingerprint: contentFingerprintSchema,
    baseResult: specificationHealthResultSchema,
  })
  .strict();

export const implementationReadinessDecisionSchema = z
  .object({
    decision: z.enum(["readiness_recommended", "not_ready", "human_review_required", "stale"]),
    readinessClass: governanceHealthResultSchema.shape.readinessClass,
    blockingReasons: refs,
    recommendations: refs,
    governingPolicyVersion: nonempty,
    evaluatedSpecificationId: specificationIdSchema,
    evaluatedSpecificationVersion: z.number().int().positive(),
    constitutionVersion: nonempty,
    evaluatorVersions: governanceEvaluatorVersionsSchema,
    inputFingerprints: z
      .object({
        specification: contentFingerprintSchema,
        constitution: contentFingerprintSchema,
        canonical: contentFingerprintSchema,
      })
      .strict(),
    requiredNextAction: nonempty,
    humanApprovalRequired: z.boolean(),
  })
  .strict();

export const governanceReportSchema = z
  .object({
    id: governanceReportIdSchema,
    specificationId: specificationIdSchema,
    specificationVersion: z.number().int().positive(),
    specificationFingerprint: contentFingerprintSchema,
    constitutionId: constitutionResolutionIdSchema,
    constitutionVersion: nonempty,
    constitutionFingerprint: contentFingerprintSchema,
    canonicalVersionId: versionIdSchema,
    canonicalFingerprint: contentFingerprintSchema,
    evaluatedAt: timestampSchema,
    evaluatorVersions: governanceEvaluatorVersionsSchema,
    normalization: normalizationResultSchema,
    structuralFindings: z.array(governanceFindingSchema),
    clarificationNeeds: z.array(clarificationNeedSchema),
    constitutionalResults: z.array(constitutionComplianceResultSchema),
    consistencyFindings: z.array(governanceFindingSchema),
    traceabilityFindings: z.array(governanceFindingSchema),
    testabilityFindings: z.array(governanceFindingSchema),
    freshness: freshnessEvaluationSchema,
    health: governanceHealthResultSchema,
    readiness: implementationReadinessDecisionSchema,
    evidenceRefs: refs,
    recommendedNextAction: nonempty,
    temporal: temporalMetadataSchema,
    semanticFingerprint: contentFingerprintSchema,
  })
  .strict();

export const governanceSemanticValueSchema = jsonValueSchema;

export type SpecificationRequirement = z.infer<typeof specificationRequirementSchema>;
export type SpecificationGovernanceInput = z.infer<typeof specificationGovernanceInputSchema>;
export type GovernanceFinding = z.infer<typeof governanceFindingSchema>;
export type NormalizationResult = z.infer<typeof normalizationResultSchema>;
export type ResolvedConstitution = z.infer<typeof resolvedConstitutionSchema>;
export type ConstitutionComplianceResult = z.infer<typeof constitutionComplianceResultSchema>;
export type ClarificationNeed = z.infer<typeof clarificationNeedSchema>;
export type FreshnessEvaluation = z.infer<typeof freshnessEvaluationSchema>;
export type GovernanceHealthResult = z.infer<typeof governanceHealthResultSchema>;
export type ImplementationReadinessDecision = z.infer<typeof implementationReadinessDecisionSchema>;
export type GovernanceReport = z.infer<typeof governanceReportSchema>;
