import { contentFingerprint, type JsonValue } from "../knowledge-graph";
import {
  governanceFindingIdSchema,
  type GovernanceFinding,
  implementationSliceIdSchema,
} from "../governance";
import { planGovernanceReportIdSchema, sliceGovernanceReportIdSchema } from "./schemas";

export const PLANNING_EVALUATOR_VERSIONS = {
  planNormalizer: "plan-normalizer-1.0.0",
  sliceNormalizer: "slice-normalizer-1.0.0",
  sliceDeriver: "slice-deriver-1.0.0",
  planStructuralValidator: "plan-structure-1.0.0",
  sliceStructuralValidator: "slice-structure-1.0.0",
  planConsistencyAnalyzer: "plan-consistency-1.0.0",
  sliceTraceabilityAnalyzer: "slice-traceability-1.0.0",
  planHealthCalculator: "plan-health-1.0.0",
  sliceHealthCalculator: "slice-health-1.0.0",
  planReadinessPolicy: "plan-readiness-1.0.0",
  sliceReadinessPolicy: "slice-readiness-1.0.0",
  reportCompiler: "planning-report-1.0.0",
} as const;

const suffix = (value: JsonValue) => contentFingerprint(value).replace("fp_f1_", "");

export function createPlanningFinding(input: Omit<GovernanceFinding, "id">): GovernanceFinding {
  return {
    ...input,
    id: governanceFindingIdSchema.parse(
      `governance_finding_${suffix({
        ruleId: input.ruleId,
        category: input.category,
        severity: input.severity,
        affectedEntityIds: [...input.affectedEntityIds].sort(),
      })}`,
    ),
    evidenceRefs: [...new Set(input.evidenceRefs)].sort(),
    affectedEntityIds: [...new Set(input.affectedEntityIds)].sort(),
  };
}

export function sortPlanningFindings(findings: GovernanceFinding[]): GovernanceFinding[] {
  const rank = { blocking: 0, warning: 1, info: 2 } as const;
  return [...findings].sort(
    (left, right) =>
      rank[left.severity] - rank[right.severity] ||
      left.ruleId.localeCompare(right.ruleId) ||
      left.id.localeCompare(right.id),
  );
}

export function createSliceId(planId: string, requirementId: string) {
  return implementationSliceIdSchema.parse(`slice_${suffix({ planId, requirementId })}`);
}

export function createPlanReportId(value: JsonValue) {
  return planGovernanceReportIdSchema.parse(`plan_report_${suffix(value)}`);
}

export function createSliceReportId(value: JsonValue) {
  return sliceGovernanceReportIdSchema.parse(`slice_report_${suffix(value)}`);
}
