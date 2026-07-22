import type { GovernanceFinding, SpecificationGovernanceInput } from "./runtime-schemas";
import {
  GOVERNANCE_EVALUATOR_VERSIONS,
  createGovernanceFinding,
  normalizedText,
  sortFindings,
} from "./runtime-utils";

export function validateSpecificationStructure(
  input: SpecificationGovernanceInput,
): GovernanceFinding[] {
  const findings: GovernanceFinding[] = [];
  const requirementIds = new Set(input.requirements.map((requirement) => requirement.id));
  const criteria = new Map(
    input.specification.acceptanceCriteria.map((criterion) => [criterion.id, criterion]),
  );
  const decisionIds = new Set(input.canonicalProject.meta.decisions.map((decision) => decision.id));

  for (const requirement of input.requirements) {
    if (requirement.specificationId !== input.specification.id)
      findings.push(
        createGovernanceFinding({
          ruleId: "structure.requirement_specification_link",
          category: "structural",
          severity: "blocking",
          message: `Requirement ${requirement.id} references another specification`,
          evidenceRefs: requirement.evidenceRefs,
          affectedEntityIds: [requirement.id, requirement.specificationId],
          remediation: "Link the requirement to the evaluated specification version.",
          evaluatorVersion: GOVERNANCE_EVALUATOR_VERSIONS.structuralValidator,
        }),
      );
    if (requirement.scopeState === "included" && requirement.acceptanceCriterionIds.length === 0)
      findings.push(
        createGovernanceFinding({
          ruleId: "structure.acceptance_criteria_required",
          category: "structural",
          severity: requirement.criticality === "low" ? "warning" : "blocking",
          message: `Included requirement ${requirement.id} has no acceptance criterion`,
          evidenceRefs: requirement.evidenceRefs,
          affectedEntityIds: [requirement.id],
          remediation:
            "Add at least one measurable acceptance criterion or explicitly defer the requirement.",
          evaluatorVersion: GOVERNANCE_EVALUATOR_VERSIONS.structuralValidator,
        }),
      );
    for (const criterionId of requirement.acceptanceCriterionIds) {
      const criterion = criteria.get(criterionId);
      if (!criterion)
        findings.push(
          createGovernanceFinding({
            ruleId: "structure.acceptance_reference_exists",
            category: "structural",
            severity: "blocking",
            message: `Requirement ${requirement.id} references missing criterion ${criterionId}`,
            evidenceRefs: requirement.evidenceRefs,
            affectedEntityIds: [requirement.id, criterionId],
            remediation: "Create the referenced criterion or remove the broken reference.",
            evaluatorVersion: GOVERNANCE_EVALUATOR_VERSIONS.structuralValidator,
          }),
        );
      else if (criterion.specificationId !== input.specification.id)
        findings.push(
          createGovernanceFinding({
            ruleId: "structure.acceptance_specification_link",
            category: "structural",
            severity: "blocking",
            message: `Criterion ${criterionId} belongs to another specification`,
            evidenceRefs: criterion.evidenceRefs,
            affectedEntityIds: [requirement.id, criterionId],
            remediation: "Link only criteria owned by this specification.",
            evaluatorVersion: GOVERNANCE_EVALUATOR_VERSIONS.structuralValidator,
          }),
        );
    }
    for (const dependencyId of requirement.dependencyRequirementIds)
      if (!requirementIds.has(dependencyId))
        findings.push(
          createGovernanceFinding({
            ruleId: "structure.dependency_reference_exists",
            category: "structural",
            severity: "blocking",
            message: `Requirement ${requirement.id} references missing dependency ${dependencyId}`,
            evidenceRefs: requirement.evidenceRefs,
            affectedEntityIds: [requirement.id, dependencyId],
            remediation: "Define the dependency or remove the broken reference.",
            evaluatorVersion: GOVERNANCE_EVALUATOR_VERSIONS.structuralValidator,
          }),
        );
    for (const decisionId of requirement.decisionRefs)
      if (!decisionIds.has(decisionId))
        findings.push(
          createGovernanceFinding({
            ruleId: "structure.decision_reference_exists",
            category: "structural",
            severity: "blocking",
            message: `Requirement ${requirement.id} references missing decision ${decisionId}`,
            evidenceRefs: requirement.evidenceRefs,
            affectedEntityIds: [requirement.id, decisionId],
            remediation:
              "Reference an existing canonical decision or create an approved decision through the canonical mutation flow.",
            evaluatorVersion: GOVERNANCE_EVALUATOR_VERSIONS.structuralValidator,
          }),
        );
    if (requirement.sourceRefs.length === 0 || requirement.evidenceRefs.length === 0)
      findings.push(
        createGovernanceFinding({
          ruleId: "structure.requirement_traceability",
          category: "structural",
          severity: requirement.criticality === "low" ? "warning" : "blocking",
          message: `Requirement ${requirement.id} lacks source or evidence traceability`,
          evidenceRefs: requirement.evidenceRefs,
          affectedEntityIds: [requirement.id],
          remediation: "Add explicit source and evidence references.",
          evaluatorVersion: GOVERNANCE_EVALUATOR_VERSIONS.structuralValidator,
        }),
      );
    if (requirement.freshness !== "current")
      findings.push(
        createGovernanceFinding({
          ruleId: "structure.requirement_freshness",
          category: "freshness",
          severity: requirement.freshness === "stale" ? "blocking" : "warning",
          message: `Requirement ${requirement.id} freshness is ${requirement.freshness}`,
          evidenceRefs: requirement.evidenceRefs,
          affectedEntityIds: [requirement.id],
          remediation: "Refresh requirement evidence against the current canonical version.",
          evaluatorVersion: GOVERNANCE_EVALUATOR_VERSIONS.structuralValidator,
        }),
      );
    if (
      requirement.criticality !== "low" &&
      requirement.scopeState === "included" &&
      requirement.riskRefs.length === 0
    )
      findings.push(
        createGovernanceFinding({
          ruleId: "structure.risk_declaration",
          category: "structural",
          severity: "warning",
          message: `Requirement ${requirement.id} has no explicit risk declaration`,
          evidenceRefs: requirement.evidenceRefs,
          affectedEntityIds: [requirement.id],
          remediation:
            "Record a risk reference or an explicit evidence-backed no-material-risk assessment.",
          evaluatorVersion: GOVERNANCE_EVALUATOR_VERSIONS.structuralValidator,
        }),
      );
  }

  const linkedCriteria = new Set(
    input.requirements.flatMap((requirement) => requirement.acceptanceCriterionIds),
  );
  for (const criterion of input.specification.acceptanceCriteria) {
    if (!linkedCriteria.has(criterion.id))
      findings.push(
        createGovernanceFinding({
          ruleId: "structure.acceptance_requirement_link",
          category: "structural",
          severity: "blocking",
          message: `Acceptance criterion ${criterion.id} is not linked to a requirement`,
          evidenceRefs: criterion.evidenceRefs,
          affectedEntityIds: [criterion.id],
          remediation: "Link the criterion to exactly the requirements it verifies.",
          evaluatorVersion: GOVERNANCE_EVALUATOR_VERSIONS.structuralValidator,
        }),
      );
    if (criterion.verificationRefs.length === 0)
      findings.push(
        createGovernanceFinding({
          ruleId: "structure.acceptance_verifiable",
          category: "structural",
          severity: "blocking",
          message: `Acceptance criterion ${criterion.id} has no verification reference`,
          evidenceRefs: criterion.evidenceRefs,
          affectedEntityIds: [criterion.id],
          remediation: "Define a deterministic test, inspection, or validation method.",
          evaluatorVersion: GOVERNANCE_EVALUATOR_VERSIONS.structuralValidator,
        }),
      );
  }

  if (
    input.specification.scope.some((included) =>
      input.specification.exclusions.some(
        (excluded) => normalizedText(included) === normalizedText(excluded),
      ),
    )
  )
    findings.push(
      createGovernanceFinding({
        ruleId: "structure.scope_boundary_conflict",
        category: "structural",
        severity: "blocking",
        message: "The same boundary appears in both scope and exclusions",
        evidenceRefs: input.specification.evidenceRefs,
        affectedEntityIds: [input.specification.id],
        remediation: "Resolve the boundary as included, excluded, deferred, or undecided.",
        evaluatorVersion: GOVERNANCE_EVALUATOR_VERSIONS.structuralValidator,
      }),
    );

  if (
    ["approved", "readiness_requested", "implementation_ready"].includes(
      input.revision.lifecycle,
    ) &&
    input.specification.approvalStatus !== "approved"
  )
    findings.push(
      createGovernanceFinding({
        ruleId: "structure.approval_state",
        category: "structural",
        severity: "blocking",
        message: "Specification lifecycle is incompatible with its approval state",
        evidenceRefs: input.specification.evidenceRefs,
        affectedEntityIds: [input.specification.id],
        remediation: "Return the lifecycle to review or obtain explicit approval.",
        evaluatorVersion: GOVERNANCE_EVALUATOR_VERSIONS.structuralValidator,
      }),
    );

  return sortFindings(findings);
}
