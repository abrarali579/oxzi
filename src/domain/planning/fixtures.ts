import { contentFingerprint } from "../knowledge-graph";
import {
  evaluateSpecificationGovernance,
  implementationSliceSchema,
  implementationReadySpecificationFixture,
  structurallyIncompleteSpecificationFixture,
  technicalPlanIdSchema,
} from "../governance";
import { deriveImplementationSlices } from "./derivation";
import { evaluatePlanGovernance } from "./evaluate";
import {
  calculateImplementationSliceFingerprint,
  calculateTechnicalPlanFingerprint,
} from "./normalization";
import { planningInputSchema, technicalPlanSchema, type PlanningInput } from "./schemas";
import { createSliceId } from "./utils";

export const planningTimestamp = "2026-07-23T01:00:00.000Z";
export const healthySpecificationGovernanceReport = evaluateSpecificationGovernance(
  implementationReadySpecificationFixture,
);
export const unhealthySpecificationGovernanceReport = evaluateSpecificationGovernance(
  structurallyIncompleteSpecificationFixture,
);

const planId = "plan_governed_export";
const firstSliceId = createSliceId(planId, "requirement_export");
const placeholder = contentFingerprint({ placeholder: "plan" });
const basePlan = technicalPlanSchema.parse({
  id: planId,
  projectId: implementationReadySpecificationFixture.canonicalProject.metadata.projectId,
  title: "Governed export implementation plan",
  specificationId: healthySpecificationGovernanceReport.specificationId,
  specificationVersion: healthySpecificationGovernanceReport.specificationVersion,
  specificationFingerprint: healthySpecificationGovernanceReport.specificationFingerprint,
  constitutionFingerprint: healthySpecificationGovernanceReport.constitutionFingerprint,
  governanceReportId: healthySpecificationGovernanceReport.id,
  governanceReportFingerprint: healthySpecificationGovernanceReport.semanticFingerprint,
  architectureRefs: ["architecture:export-service"],
  componentRefs: ["component:export-service"],
  interfaceRefs: ["interface:export-command"],
  dataModelRefs: [],
  dependencyRefs: ["dependency:filesystem"],
  migrationRefs: [],
  securityRefs: ["security:no-secret-export"],
  testStrategyRefs: ["validation:npm-test"],
  rolloutRefs: ["rollout:local-first"],
  rollbackRefs: ["rollback:restore-prior-artifact"],
  scope: ["Markdown export"],
  exclusions: ["Automatic deployment"],
  riskRefs: ["risk:secret-exposure"],
  acceptanceCriterionIds: ["criterion_export"],
  implementationSequence: [firstSliceId],
  protectedScope: ["scope:canonical-state"],
  sourceRefs: ["source:governance-report"],
  evidenceRefs: ["evidence:planning"],
  approvalStatus: "approved",
  revision: {
    version: 1,
    lifecycle: "approved",
    parentVersion: null,
    parentFingerprint: null,
    createdAt: planningTimestamp,
    approvedAt: planningTimestamp,
    usedAt: null,
    supersededAt: null,
  },
  fingerprint: placeholder,
});

export const validTechnicalPlan = technicalPlanSchema.parse({
  ...basePlan,
  fingerprint: calculateTechnicalPlanFingerprint(basePlan),
});

export const validPlanningInput: PlanningInput = planningInputSchema.parse({
  parentGovernanceReport: healthySpecificationGovernanceReport,
  plan: validTechnicalPlan,
  evaluationTimestamp: planningTimestamp,
});

export const validPlanGovernanceReport = evaluatePlanGovernance(validPlanningInput);

export const derivedDraftSlices = deriveImplementationSlices(
  validTechnicalPlan,
  healthySpecificationGovernanceReport,
);

const approvedSliceBase = {
  ...derivedDraftSlices[0]!,
  approvalStatus: "approved" as const,
  lifecycle: "approved" as const,
  approvedAt: planningTimestamp,
};
export const approvedImplementationSlice = {
  ...approvedSliceBase,
  fingerprint: calculateImplementationSliceFingerprint(approvedSliceBase),
};

export function clonePlanningInput(): PlanningInput {
  return structuredClone(validPlanningInput);
}

export function refingerprintPlan(input: PlanningInput): PlanningInput {
  input.plan.fingerprint = calculateTechnicalPlanFingerprint(input.plan);
  return planningInputSchema.parse(input);
}

export const structuralBlockerPlanningInput = (() => {
  const input = clonePlanningInput();
  input.plan.acceptanceCriterionIds = [];
  return refingerprintPlan(input);
})();

export const consistencyFailurePlanningInput = (() => {
  const input = clonePlanningInput();
  input.plan.scope.push("Automatic deployment");
  return refingerprintPlan(input);
})();

export const unhealthyParentPlanningInput = planningInputSchema.parse({
  ...validPlanningInput,
  parentGovernanceReport: unhealthySpecificationGovernanceReport,
});

export const staleParentPlanningInput = (() => {
  const input = clonePlanningInput();
  input.plan.specificationFingerprint = contentFingerprint({ stale: "specification" });
  return refingerprintPlan(input);
})();

export const missingApprovalPlanningInput = (() => {
  const input = clonePlanningInput();
  input.plan.approvalStatus = "pending";
  input.plan.revision.lifecycle = "draft";
  input.plan.revision.approvedAt = null;
  return refingerprintPlan(input);
})();

const brokenSliceBase = {
  ...approvedImplementationSlice,
  technicalPlanId: technicalPlanIdSchema.parse("plan_missing"),
};
export const traceabilityFailureSlice = implementationSliceSchema.parse({
  ...brokenSliceBase,
  fingerprint: calculateImplementationSliceFingerprint(brokenSliceBase),
});

const usedPlanBase = {
  ...validTechnicalPlan,
  revision: {
    ...validTechnicalPlan.revision,
    lifecycle: "used" as const,
    usedAt: planningTimestamp,
  },
};
export const usedTechnicalPlan = technicalPlanSchema.parse({
  ...usedPlanBase,
  fingerprint: calculateTechnicalPlanFingerprint(usedPlanBase),
});

export const stableRoundTripPlanningFixture = {
  plan: validTechnicalPlan,
  slice: approvedImplementationSlice,
};
