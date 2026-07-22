import type { GovernanceFinding, GovernanceReport } from "../governance";
import type { ContentFingerprint } from "../knowledge-graph";
import {
  planningHealthResultSchema,
  planningReadinessDecisionSchema,
  type PlanGovernanceReport,
  type PlanNormalizationResult,
  type PlanningHealthResult,
  type PlanningReadinessDecision,
  type SliceNormalizationResult,
} from "./schemas";
import { PLANNING_EVALUATOR_VERSIONS, createPlanningFinding } from "./utils";

const blocking = (findings: GovernanceFinding[]) =>
  findings.filter((finding) => finding.severity === "blocking");

function dimension(
  name:
    | "parent_governance"
    | "structural_completeness"
    | "internal_consistency"
    | "traceability"
    | "approval_completeness"
    | "freshness",
  findings: GovernanceFinding[],
  evaluatorVersion: string,
  passId: string,
) {
  const failures = blocking(findings);
  return {
    dimension: name,
    result:
      failures.length > 0
        ? ("fail" as const)
        : findings.length > 0
          ? ("warning" as const)
          : ("pass" as const),
    passedCheckIds: failures.length === 0 ? [passId] : [],
    failedCheckIds: failures.map((finding) => finding.ruleId),
    unknownCheckIds: [],
    blockingFindingIds: failures.map((finding) => finding.id),
    evaluatorVersion,
  };
}

export function calculatePlanHealth(
  normalization: PlanNormalizationResult,
  structural: GovernanceFinding[],
  consistency: GovernanceFinding[],
  traceability: GovernanceFinding[],
): PlanningHealthResult {
  const plan = normalization.plan;
  const parentFindings = structural.filter(
    (finding) => finding.ruleId === "planning.parent_specification_ready",
  );
  const freshnessFindings = structural.filter((finding) => finding.category === "freshness");
  const approvalFindings = structural.filter((finding) => finding.ruleId.includes("approval"));
  const structuralOnly = structural.filter(
    (finding) =>
      !parentFindings.includes(finding) &&
      !freshnessFindings.includes(finding) &&
      !approvalFindings.includes(finding) &&
      finding.category !== "traceability" &&
      finding.category !== "consistency",
  );
  const dimensions = [
    dimension(
      "parent_governance",
      parentFindings,
      PLANNING_EVALUATOR_VERSIONS.planHealthCalculator,
      "planning.parent_healthy",
    ),
    dimension(
      "structural_completeness",
      structuralOnly,
      PLANNING_EVALUATOR_VERSIONS.planHealthCalculator,
      "planning.structure_complete",
    ),
    dimension(
      "internal_consistency",
      consistency,
      PLANNING_EVALUATOR_VERSIONS.planHealthCalculator,
      "planning.consistent",
    ),
    dimension(
      "traceability",
      [...traceability, ...structural.filter((finding) => finding.category === "traceability")],
      PLANNING_EVALUATOR_VERSIONS.planHealthCalculator,
      "planning.traceable",
    ),
    dimension(
      "approval_completeness",
      approvalFindings,
      PLANNING_EVALUATOR_VERSIONS.planHealthCalculator,
      "planning.approved",
    ),
    dimension(
      "freshness",
      freshnessFindings,
      PLANNING_EVALUATOR_VERSIONS.planHealthCalculator,
      "planning.current",
    ),
  ];
  const all = [...structural, ...consistency, ...traceability];
  const blockers = blocking(all);
  const stale = freshnessFindings.some((finding) => finding.severity === "blocking");
  const conflicted = consistency.some((finding) => finding.severity === "blocking");
  return planningHealthResultSchema.parse({
    subjectId: plan.id,
    status: stale
      ? "stale"
      : conflicted
        ? "conflicted"
        : blockers.length > 0
          ? "blocked"
          : "healthy",
    dimensions,
    blockingReasons: blockers.map((finding) => finding.id).sort(),
    recommendations: all
      .filter((finding) => finding.severity !== "blocking")
      .map((finding) => finding.remediation)
      .sort(),
    evaluatorVersion: PLANNING_EVALUATOR_VERSIONS.planHealthCalculator,
    inputFingerprint: normalization.fingerprint,
  });
}

export function calculateSliceHealth(
  normalization: SliceNormalizationResult,
  planReport: PlanGovernanceReport,
  structural: GovernanceFinding[],
  traceability: GovernanceFinding[],
): PlanningHealthResult {
  const slice = normalization.slice;
  const parentFindings: GovernanceFinding[] =
    planReport.health.status === "healthy" &&
    planReport.readiness.decision === "readiness_recommended"
      ? []
      : [
          createPlanningFinding({
            ruleId: "planning.parent_plan_ready",
            category: "structural",
            severity: "blocking",
            message: "Slice readiness requires a healthy readiness-recommended Plan",
            evidenceRefs: slice.evidenceRefs,
            affectedEntityIds: [slice.id, planReport.plan.id],
            remediation: "Repair and approve the parent Plan before Slice readiness.",
            evaluatorVersion: PLANNING_EVALUATOR_VERSIONS.sliceHealthCalculator,
          }),
        ];
  const approvalFindings = structural.filter((finding) => finding.ruleId.includes("approval"));
  const freshnessFindings = structural.filter((finding) => finding.category === "freshness");
  const structuralOnly = structural.filter(
    (finding) =>
      !approvalFindings.includes(finding) &&
      !freshnessFindings.includes(finding) &&
      finding.category !== "consistency" &&
      finding.category !== "traceability",
  );
  const dimensions = [
    dimension(
      "parent_governance",
      parentFindings,
      PLANNING_EVALUATOR_VERSIONS.sliceHealthCalculator,
      "planning.parent_plan_healthy",
    ),
    dimension(
      "structural_completeness",
      structuralOnly,
      PLANNING_EVALUATOR_VERSIONS.sliceHealthCalculator,
      "planning.slice_structure_complete",
    ),
    dimension(
      "internal_consistency",
      structural.filter((finding) => finding.category === "consistency"),
      PLANNING_EVALUATOR_VERSIONS.sliceHealthCalculator,
      "planning.slice_consistent",
    ),
    dimension(
      "traceability",
      traceability,
      PLANNING_EVALUATOR_VERSIONS.sliceHealthCalculator,
      "planning.slice_traceable",
    ),
    dimension(
      "approval_completeness",
      approvalFindings,
      PLANNING_EVALUATOR_VERSIONS.sliceHealthCalculator,
      "planning.slice_approved",
    ),
    dimension(
      "freshness",
      freshnessFindings,
      PLANNING_EVALUATOR_VERSIONS.sliceHealthCalculator,
      "planning.slice_current",
    ),
  ];
  const all = [...parentFindings, ...structural, ...traceability];
  const blockers = blocking(all);
  return planningHealthResultSchema.parse({
    subjectId: slice.id,
    status: freshnessFindings.some((finding) => finding.severity === "blocking")
      ? "stale"
      : blockers.length > 0
        ? "blocked"
        : "healthy",
    dimensions,
    blockingReasons: blockers.map((finding) => finding.id).sort(),
    recommendations: all
      .filter((finding) => finding.severity !== "blocking")
      .map((finding) => finding.remediation)
      .sort(),
    evaluatorVersion: PLANNING_EVALUATOR_VERSIONS.sliceHealthCalculator,
    inputFingerprint: normalization.fingerprint,
  });
}

function readiness(
  health: PlanningHealthResult,
  subjectId: string,
  subjectVersion: number,
  approved: boolean,
  parentFingerprints: Record<string, ContentFingerprint>,
  policyVersion: string,
): PlanningReadinessDecision {
  const ready = health.status === "healthy";
  return planningReadinessDecisionSchema.parse({
    decision:
      health.status === "stale"
        ? "stale"
        : ready
          ? approved
            ? "readiness_recommended"
            : "human_review_required"
          : "not_ready",
    blockingReasons: health.blockingReasons,
    recommendations: health.recommendations,
    governingPolicyVersion: policyVersion,
    subjectId,
    subjectVersion,
    parentFingerprints,
    requiredNextAction:
      health.status === "stale"
        ? "Regenerate against current authoritative parent versions."
        : ready && approved
          ? "Proceed only after the configured workflow confirms this readiness recommendation."
          : ready
            ? "Obtain version-specific approval."
            : "Repair blocking planning findings and re-evaluate.",
    humanApprovalRequired: true,
  });
}

export function decidePlanReadiness(
  normalization: PlanNormalizationResult,
  parent: GovernanceReport,
  health: PlanningHealthResult,
) {
  const plan = normalization.plan;
  return readiness(
    health,
    plan.id,
    plan.revision.version,
    plan.approvalStatus === "approved",
    {
      specification: parent.specificationFingerprint,
      constitution: parent.constitutionFingerprint,
      governanceReport: parent.semanticFingerprint,
    },
    PLANNING_EVALUATOR_VERSIONS.planReadinessPolicy,
  );
}

export function decideSliceReadiness(
  normalization: SliceNormalizationResult,
  planReport: PlanGovernanceReport,
  health: PlanningHealthResult,
) {
  const slice = normalization.slice;
  return readiness(
    health,
    slice.id,
    slice.version,
    slice.approvalStatus === "approved",
    {
      specification: slice.specificationFingerprint,
      constitution: slice.constitutionFingerprint,
      technicalPlan: planReport.plan.fingerprint,
      planGovernanceReport: planReport.semanticFingerprint,
    },
    PLANNING_EVALUATOR_VERSIONS.sliceReadinessPolicy,
  );
}
