import type { GovernanceFinding, GovernanceReport, ImplementationSlice } from "../governance";
import type { PlanNormalizationResult, SliceNormalizationResult, TechnicalPlan } from "./schemas";
import { PLANNING_EVALUATOR_VERSIONS, createPlanningFinding, sortPlanningFindings } from "./utils";

export function validateTechnicalPlanStructure(
  normalization: PlanNormalizationResult,
  parent: GovernanceReport,
): GovernanceFinding[] {
  const plan = normalization.plan;
  const findings = [...normalization.blockingErrors];
  const exactParentIdentity =
    plan.projectId === parent.normalization.normalizedInput.canonicalProject.metadata.projectId &&
    plan.specificationId === parent.specificationId &&
    plan.specificationVersion === parent.specificationVersion &&
    plan.governanceReportId === parent.id;
  if (!exactParentIdentity)
    findings.push(
      createPlanningFinding({
        ruleId: "planning.exact_parent_governance",
        category: "traceability",
        severity: "blocking",
        message: "Technical Plan does not reference the exact parent governance result",
        evidenceRefs: plan.evidenceRefs,
        affectedEntityIds: [plan.id, parent.id],
        remediation:
          "Bind the Plan to the exact Specification, Constitution, and report fingerprints.",
        evaluatorVersion: PLANNING_EVALUATOR_VERSIONS.planStructuralValidator,
      }),
    );
  if (
    plan.specificationFingerprint !== parent.specificationFingerprint ||
    plan.constitutionFingerprint !== parent.constitutionFingerprint ||
    plan.governanceReportFingerprint !== parent.semanticFingerprint
  )
    findings.push(
      createPlanningFinding({
        ruleId: "planning.parent_fingerprint_freshness",
        category: "freshness",
        severity: "blocking",
        message: "Technical Plan parent fingerprints are stale",
        evidenceRefs: plan.evidenceRefs,
        affectedEntityIds: [plan.id, parent.id],
        remediation: "Regenerate the Plan against the current governance report.",
        evaluatorVersion: PLANNING_EVALUATOR_VERSIONS.planStructuralValidator,
      }),
    );
  if (parent.health.status !== "healthy" || parent.readiness.decision !== "readiness_recommended")
    findings.push(
      createPlanningFinding({
        ruleId: "planning.parent_specification_ready",
        category: "structural",
        severity: "blocking",
        message: "Technical planning requires a healthy readiness-recommended Specification",
        evidenceRefs: parent.evidenceRefs,
        affectedEntityIds: [plan.id, parent.specificationId],
        remediation: "Repair and approve the parent Specification before planning.",
        evaluatorVersion: PLANNING_EVALUATOR_VERSIONS.planStructuralValidator,
      }),
    );
  const criteria = new Set(
    parent.normalization.normalizedInput.specification.acceptanceCriteria.map(
      (criterion) => criterion.id,
    ),
  );
  const missingCriteria = [...criteria].filter(
    (criterionId) => !plan.acceptanceCriterionIds.includes(criterionId),
  );
  if (missingCriteria.length > 0)
    findings.push(
      createPlanningFinding({
        ruleId: "planning.acceptance_coverage",
        category: "structural",
        severity: "blocking",
        message: `Technical Plan omits acceptance criteria: ${missingCriteria.join(", ")}`,
        evidenceRefs: plan.evidenceRefs,
        affectedEntityIds: [plan.id, ...missingCriteria],
        remediation: "Trace every planned acceptance criterion into the Plan.",
        evaluatorVersion: PLANNING_EVALUATOR_VERSIONS.planStructuralValidator,
      }),
    );
  if (plan.approvalStatus !== "approved")
    findings.push(
      createPlanningFinding({
        ruleId: "planning.plan_approval_required",
        category: "structural",
        severity: "blocking",
        message: "Technical Plan lacks version-specific approval",
        evidenceRefs: plan.evidenceRefs,
        affectedEntityIds: [plan.id],
        remediation: "Obtain external human or workflow approval for this exact Plan version.",
        evaluatorVersion: PLANNING_EVALUATOR_VERSIONS.planStructuralValidator,
      }),
    );
  else if (!plan.revision.approvedAt)
    findings.push(
      createPlanningFinding({
        ruleId: "planning.plan_approval_evidence",
        category: "structural",
        severity: "blocking",
        message: "Approved Technical Plan has no approval timestamp",
        evidenceRefs: plan.evidenceRefs,
        affectedEntityIds: [plan.id],
        remediation: "Record version-specific approval evidence or return the Plan to draft.",
        evaluatorVersion: PLANNING_EVALUATOR_VERSIONS.planStructuralValidator,
      }),
    );
  return sortPlanningFindings(findings);
}

export function validateImplementationSliceStructure(
  normalization: SliceNormalizationResult,
  plan: TechnicalPlan,
): GovernanceFinding[] {
  const slice = normalization.slice;
  const findings = [...normalization.blockingErrors];
  if (
    slice.technicalPlanId !== plan.id ||
    slice.technicalPlanVersion !== plan.revision.version ||
    slice.specificationId !== plan.specificationId ||
    slice.specificationVersion !== plan.specificationVersion
  )
    findings.push(
      createPlanningFinding({
        ruleId: "planning.slice_exact_parent",
        category: "traceability",
        severity: "blocking",
        message: `Slice ${slice.id} does not reference the exact parent Plan and Specification`,
        evidenceRefs: slice.evidenceRefs,
        affectedEntityIds: [slice.id, plan.id],
        remediation: "Regenerate the Slice against the exact current parent fingerprints.",
        evaluatorVersion: PLANNING_EVALUATOR_VERSIONS.sliceStructuralValidator,
      }),
    );
  if (
    slice.technicalPlanFingerprint !== plan.fingerprint ||
    slice.specificationFingerprint !== plan.specificationFingerprint ||
    slice.constitutionFingerprint !== plan.constitutionFingerprint
  )
    findings.push(
      createPlanningFinding({
        ruleId: "planning.slice_parent_freshness",
        category: "freshness",
        severity: "blocking",
        message: `Slice ${slice.id} has stale parent fingerprints`,
        evidenceRefs: slice.evidenceRefs,
        affectedEntityIds: [slice.id, plan.id],
        remediation: "Regenerate the Slice against the exact current parent fingerprints.",
        evaluatorVersion: PLANNING_EVALUATOR_VERSIONS.sliceStructuralValidator,
      }),
    );
  const unknownCriteria = slice.acceptanceCriterionIds.filter(
    (criterionId) => !plan.acceptanceCriterionIds.includes(criterionId),
  );
  if (unknownCriteria.length > 0)
    findings.push(
      createPlanningFinding({
        ruleId: "planning.slice_acceptance_scope",
        category: "structural",
        severity: "blocking",
        message: `Slice ${slice.id} references criteria outside its Plan`,
        evidenceRefs: slice.evidenceRefs,
        affectedEntityIds: [slice.id, ...unknownCriteria],
        remediation: "Use only acceptance criteria owned by the parent Plan.",
        evaluatorVersion: PLANNING_EVALUATOR_VERSIONS.sliceStructuralValidator,
      }),
    );
  if (slice.editableScope.some((entry) => slice.protectedScope.includes(entry)))
    findings.push(
      createPlanningFinding({
        ruleId: "planning.slice_protected_scope",
        category: "consistency",
        severity: "blocking",
        message: `Slice ${slice.id} marks the same boundary editable and protected`,
        evidenceRefs: slice.evidenceRefs,
        affectedEntityIds: [slice.id],
        remediation: "Remove the overlap or create an explicitly approved scope amendment.",
        evaluatorVersion: PLANNING_EVALUATOR_VERSIONS.sliceStructuralValidator,
      }),
    );
  if (slice.approvalStatus !== "approved")
    findings.push(
      createPlanningFinding({
        ruleId: "planning.slice_approval_required",
        category: "structural",
        severity: "blocking",
        message: `Slice ${slice.id} lacks version-specific approval`,
        evidenceRefs: slice.evidenceRefs,
        affectedEntityIds: [slice.id],
        remediation: "Obtain external human or workflow approval for this exact Slice version.",
        evaluatorVersion: PLANNING_EVALUATOR_VERSIONS.sliceStructuralValidator,
      }),
    );
  else if (!slice.approvedAt)
    findings.push(
      createPlanningFinding({
        ruleId: "planning.slice_approval_evidence",
        category: "structural",
        severity: "blocking",
        message: `Approved Slice ${slice.id} has no approval timestamp`,
        evidenceRefs: slice.evidenceRefs,
        affectedEntityIds: [slice.id],
        remediation: "Record version-specific approval evidence or return the Slice to draft.",
        evaluatorVersion: PLANNING_EVALUATOR_VERSIONS.sliceStructuralValidator,
      }),
    );
  return sortPlanningFindings(findings);
}

function immutableFinding(subject: TechnicalPlan | ImplementationSlice, kind: "plan" | "slice") {
  return createPlanningFinding({
    ruleId: `planning.${kind}_version_immutable`,
    category: "controlled_living",
    severity: "blocking",
    message: `Approved or used ${kind} version cannot be mutated`,
    evidenceRefs: subject.evidenceRefs,
    affectedEntityIds: [subject.id],
    remediation: `Create a new ${kind} version with exact parent linkage.`,
    evaluatorVersion: PLANNING_EVALUATOR_VERSIONS.planStructuralValidator,
  });
}

export function validateTechnicalPlanAmendment(
  previous: TechnicalPlan,
  next: PlanNormalizationResult,
): GovernanceFinding[] {
  const findings: GovernanceFinding[] = [];
  const protectedVersion = ["approved", "used"].includes(previous.revision.lifecycle);
  if (
    protectedVersion &&
    next.plan.revision.version === previous.revision.version &&
    next.fingerprint !== previous.fingerprint
  )
    findings.push(immutableFinding(previous, "plan"));
  if (
    next.plan.revision.version <= previous.revision.version ||
    next.plan.revision.parentVersion !== previous.revision.version ||
    next.plan.revision.parentFingerprint !== previous.fingerprint
  )
    findings.push(
      createPlanningFinding({
        ruleId: "planning.plan_amendment_parent",
        category: "controlled_living",
        severity: "blocking",
        message: "Technical Plan amendment lacks a new version or exact parent linkage",
        evidenceRefs: next.plan.evidenceRefs,
        affectedEntityIds: [next.plan.id],
        remediation: "Increment the Plan version and record its exact parent fingerprint.",
        evaluatorVersion: PLANNING_EVALUATOR_VERSIONS.planStructuralValidator,
      }),
    );
  return sortPlanningFindings(findings);
}

export function validateImplementationSliceAmendment(
  previous: ImplementationSlice,
  next: SliceNormalizationResult,
): GovernanceFinding[] {
  const findings: GovernanceFinding[] = [];
  const protectedVersion = ["approved", "used"].includes(previous.lifecycle);
  if (
    protectedVersion &&
    next.slice.version === previous.version &&
    next.fingerprint !== previous.fingerprint
  )
    findings.push(immutableFinding(previous, "slice"));
  if (
    next.slice.version <= previous.version ||
    next.slice.parentSliceVersion !== previous.version ||
    next.slice.parentSliceFingerprint !== previous.fingerprint
  )
    findings.push(
      createPlanningFinding({
        ruleId: "planning.slice_amendment_parent",
        category: "controlled_living",
        severity: "blocking",
        message: "Slice amendment lacks a new version or exact parent linkage",
        evidenceRefs: next.slice.evidenceRefs,
        affectedEntityIds: [next.slice.id],
        remediation: "Increment the Slice version and record its exact parent fingerprint.",
        evaluatorVersion: PLANNING_EVALUATOR_VERSIONS.sliceStructuralValidator,
      }),
    );
  return sortPlanningFindings(findings);
}
