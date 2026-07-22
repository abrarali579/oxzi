import { contentFingerprint, type ContentFingerprint, type JsonValue } from "../knowledge-graph";
import {
  clarificationNeedIdSchema,
  constitutionResolutionIdSchema,
  governanceFindingIdSchema,
  governanceReportIdSchema,
  type GovernanceFinding,
} from "./runtime-schemas";

export const GOVERNANCE_EVALUATOR_VERSIONS = {
  normalizer: "spec-normalizer-1.0.0",
  constitutionResolver: "constitution-resolver-1.0.0",
  structuralValidator: "structural-validator-1.0.0",
  clarificationAnalyzer: "clarification-analyzer-1.0.0",
  complianceEvaluator: "constitution-compliance-1.0.0",
  consistencyAnalyzer: "consistency-analyzer-1.0.0",
  traceabilityAnalyzer: "traceability-analyzer-1.0.0",
  healthCalculator: "spec-health-1.0.0",
  readinessPolicy: "implementation-readiness-1.0.0",
  reportCompiler: "governance-report-1.0.0",
} as const;

function slug(prefix: string, value: JsonValue): string {
  return `${prefix}_${contentFingerprint(value).replace("fp_f1_", "")}`;
}

export function createGovernanceFinding(input: Omit<GovernanceFinding, "id">): GovernanceFinding {
  return {
    ...input,
    id: governanceFindingIdSchema.parse(
      slug("governance_finding", {
        ruleId: input.ruleId,
        category: input.category,
        severity: input.severity,
        affectedEntityIds: [...input.affectedEntityIds].sort(),
      }),
    ),
    evidenceRefs: [...new Set(input.evidenceRefs)].sort(),
    affectedEntityIds: [...new Set(input.affectedEntityIds)].sort(),
  };
}

export function sortFindings(findings: GovernanceFinding[]): GovernanceFinding[] {
  const severity = { blocking: 0, warning: 1, info: 2 } as const;
  return [...findings].sort(
    (left, right) =>
      severity[left.severity] - severity[right.severity] ||
      left.ruleId.localeCompare(right.ruleId) ||
      left.id.localeCompare(right.id),
  );
}

export function createClarificationNeedId(value: JsonValue) {
  return clarificationNeedIdSchema.parse(slug("clarification_need", value));
}

export function createConstitutionResolutionId(value: JsonValue) {
  return constitutionResolutionIdSchema.parse(slug("constitution_resolution", value));
}

export function createGovernanceReportId(value: JsonValue) {
  return governanceReportIdSchema.parse(slug("governance_report", value));
}

export function asFingerprint(value: JsonValue): ContentFingerprint {
  return contentFingerprint(value);
}

export function normalizedText(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US");
}
