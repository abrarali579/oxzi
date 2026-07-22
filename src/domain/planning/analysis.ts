import type { GovernanceFinding, GovernanceReport } from "../governance";
import type { ImplementationSlice, TechnicalPlan } from "./schemas";
import { PLANNING_EVALUATOR_VERSIONS, createPlanningFinding, sortPlanningFindings } from "./utils";

export function analyzePlanConsistency(
  plan: TechnicalPlan,
  slices: ImplementationSlice[],
  parent: GovernanceReport,
): GovernanceFinding[] {
  const findings: GovernanceFinding[] = [];
  const specification = parent.normalization.normalizedInput.specification;
  const outsideSpecification = plan.scope.filter((scope) => !specification.scope.includes(scope));
  const scopeConflict = plan.scope.filter((scope) => plan.exclusions.includes(scope));
  if (outsideSpecification.length > 0 || scopeConflict.length > 0)
    findings.push(
      createPlanningFinding({
        ruleId: "planning.plan_scope_boundary",
        category: "consistency",
        severity: "blocking",
        message: "Technical Plan broadens or contradicts Specification scope",
        evidenceRefs: plan.evidenceRefs,
        affectedEntityIds: [plan.id, ...outsideSpecification, ...scopeConflict],
        remediation: "Narrow the Plan to approved Specification scope or amend the Specification.",
        evaluatorVersion: PLANNING_EVALUATOR_VERSIONS.planConsistencyAnalyzer,
      }),
    );
  const ids = slices.map((slice) => slice.id);
  if (new Set(ids).size !== ids.length)
    findings.push(
      createPlanningFinding({
        ruleId: "planning.unique_slice_ids",
        category: "structural",
        severity: "blocking",
        message: "Derived implementation slices contain duplicate IDs",
        evidenceRefs: plan.evidenceRefs,
        affectedEntityIds: [plan.id, ...ids],
        remediation: "Assign one stable ID to each independent slice.",
        evaluatorVersion: PLANNING_EVALUATOR_VERSIONS.planConsistencyAnalyzer,
      }),
    );
  if (JSON.stringify(plan.implementationSequence) !== JSON.stringify(ids))
    findings.push(
      createPlanningFinding({
        ruleId: "planning.slice_sequence",
        category: "consistency",
        severity: "blocking",
        message: "Plan implementation sequence does not match deterministic slice order",
        evidenceRefs: plan.evidenceRefs,
        affectedEntityIds: [plan.id, ...ids],
        remediation: "Use the deterministic dependency-safe slice order.",
        evaluatorVersion: PLANNING_EVALUATOR_VERSIONS.planConsistencyAnalyzer,
      }),
    );
  for (const slice of slices) {
    const outsidePlan = slice.scope.filter((scope) => !plan.scope.includes(scope));
    const exclusionConflict = slice.scope.filter((scope) => slice.exclusions.includes(scope));
    if (outsidePlan.length > 0 || exclusionConflict.length > 0)
      findings.push(
        createPlanningFinding({
          ruleId: "planning.slice_scope_boundary",
          category: "consistency",
          severity: "blocking",
          message: `Slice ${slice.id} broadens or contradicts its Plan scope`,
          evidenceRefs: slice.evidenceRefs,
          affectedEntityIds: [slice.id, ...outsidePlan, ...exclusionConflict],
          remediation: "Narrow the Slice or submit a reverse proposal for parent approval.",
          evaluatorVersion: PLANNING_EVALUATOR_VERSIONS.planConsistencyAnalyzer,
        }),
      );
    if (slice.prerequisiteSliceIds.some((id) => !ids.includes(id)))
      findings.push(
        createPlanningFinding({
          ruleId: "planning.slice_prerequisite_exists",
          category: "consistency",
          severity: "blocking",
          message: `Slice ${slice.id} has an unknown prerequisite`,
          evidenceRefs: slice.evidenceRefs,
          affectedEntityIds: [slice.id, ...slice.prerequisiteSliceIds],
          remediation: "Link only existing prerequisite slices in this Plan version.",
          evaluatorVersion: PLANNING_EVALUATOR_VERSIONS.planConsistencyAnalyzer,
        }),
      );
  }
  return sortPlanningFindings(findings);
}

export function analyzeSliceTraceability(
  slice: ImplementationSlice,
  plan: TechnicalPlan,
  parent: GovernanceReport,
  allSlices: ImplementationSlice[],
): GovernanceFinding[] {
  const findings: GovernanceFinding[] = [];
  const criteria = new Set(
    parent.normalization.normalizedInput.specification.acceptanceCriteria.map(
      (criterion) => criterion.id,
    ),
  );
  if (
    plan.governanceReportId !== parent.id ||
    plan.governanceReportFingerprint !== parent.semanticFingerprint ||
    slice.technicalPlanId !== plan.id ||
    slice.specificationId !== parent.specificationId ||
    slice.technicalPlanFingerprint !== plan.fingerprint ||
    slice.specificationFingerprint !== parent.specificationFingerprint
  )
    findings.push(
      createPlanningFinding({
        ruleId: "planning.slice_parent_traceability",
        category: "traceability",
        severity: "blocking",
        message: `Slice ${slice.id} is orphaned from an exact parent artifact`,
        evidenceRefs: slice.evidenceRefs,
        affectedEntityIds: [slice.id, plan.id, parent.specificationId],
        remediation: "Bind the Slice to exact parent versions and fingerprints.",
        evaluatorVersion: PLANNING_EVALUATOR_VERSIONS.sliceTraceabilityAnalyzer,
      }),
    );
  const brokenCriteria = slice.acceptanceCriterionIds.filter((id) => !criteria.has(id));
  const availableSlices = new Set(allSlices.map((candidate) => candidate.id));
  const brokenPrerequisites = slice.prerequisiteSliceIds.filter((id) => !availableSlices.has(id));
  if (brokenCriteria.length > 0 || brokenPrerequisites.length > 0)
    findings.push(
      createPlanningFinding({
        ruleId: "planning.slice_reference_exists",
        category: "traceability",
        severity: "blocking",
        message: `Slice ${slice.id} contains broken traceability references`,
        evidenceRefs: slice.evidenceRefs,
        affectedEntityIds: [slice.id, ...brokenCriteria, ...brokenPrerequisites],
        remediation: "Restore the exact referenced criteria and prerequisite slice versions.",
        evaluatorVersion: PLANNING_EVALUATOR_VERSIONS.sliceTraceabilityAnalyzer,
      }),
    );
  if (slice.evidenceRefs.length === 0)
    findings.push(
      createPlanningFinding({
        ruleId: "planning.slice_evidence",
        category: "traceability",
        severity: "blocking",
        message: `Slice ${slice.id} has no required evidence`,
        evidenceRefs: [],
        affectedEntityIds: [slice.id],
        remediation: "Attach Specification, decision, and verification evidence.",
        evaluatorVersion: PLANNING_EVALUATOR_VERSIONS.sliceTraceabilityAnalyzer,
      }),
    );
  return sortPlanningFindings(findings);
}
