import type { GovernanceFinding, SpecificationGovernanceInput } from "./runtime-schemas";
import {
  GOVERNANCE_EVALUATOR_VERSIONS,
  createGovernanceFinding,
  sortFindings,
} from "./runtime-utils";

export function analyzeSpecificationTraceability(
  input: SpecificationGovernanceInput,
): GovernanceFinding[] {
  const findings: GovernanceFinding[] = [];
  const entities = new Set<string>([
    input.specification.id,
    ...input.requirements.map((requirement) => requirement.id),
    ...input.specification.acceptanceCriteria.map((criterion) => criterion.id),
    ...input.canonicalProject.meta.decisions.map((decision) => decision.id),
    ...input.technicalPlans.map((plan) => plan.id),
    ...input.implementationSlices.map((slice) => slice.id),
    ...input.taskCards.map((taskCard) => taskCard.id),
    ...input.validationRefs,
    ...input.reviewRefs,
    ...input.convergenceFindingRefs,
    ...input.artifactRefs,
  ]);

  for (const link of input.traceabilityLinks) {
    const broken = [link.fromId, link.toId].filter((entityId) => !entities.has(entityId));
    if (broken.length > 0)
      findings.push(
        createGovernanceFinding({
          ruleId: "traceability.link_target_exists",
          category: "traceability",
          severity: "blocking",
          message: `Traceability link ${link.id} references missing entities: ${broken.join(", ")}`,
          evidenceRefs: link.evidenceRefs,
          affectedEntityIds: [link.id, ...broken],
          remediation: "Restore the referenced versioned entities or remove the broken link.",
          evaluatorVersion: GOVERNANCE_EVALUATOR_VERSIONS.traceabilityAnalyzer,
        }),
      );
    if (link.approvalStatus !== "approved")
      findings.push(
        createGovernanceFinding({
          ruleId: "traceability.link_approval",
          category: "traceability",
          severity: "warning",
          message: `Traceability link ${link.id} is not approved`,
          evidenceRefs: link.evidenceRefs,
          affectedEntityIds: [link.id],
          remediation:
            "Review and approve the link before relying on it for downstream certification.",
          evaluatorVersion: GOVERNANCE_EVALUATOR_VERSIONS.traceabilityAnalyzer,
        }),
      );
    if (link.freshness !== "current")
      findings.push(
        createGovernanceFinding({
          ruleId: "traceability.superseded_artifact_reference",
          category: "traceability",
          severity: link.freshness === "stale" ? "blocking" : "warning",
          message: `Traceability link ${link.id} targets ${link.freshness} artifact evidence`,
          evidenceRefs: link.evidenceRefs,
          affectedEntityIds: [link.id, link.fromId, link.toId],
          remediation: "Link the current artifact version or retain this link as historical only.",
          evaluatorVersion: GOVERNANCE_EVALUATOR_VERSIONS.traceabilityAnalyzer,
        }),
      );
    if (link.evidenceRefs.length === 0)
      findings.push(
        createGovernanceFinding({
          ruleId: "traceability.link_evidence",
          category: "traceability",
          severity: "warning",
          message: `Traceability link ${link.id} has no supporting evidence`,
          evidenceRefs: [],
          affectedEntityIds: [link.id],
          remediation:
            "Attach the artifact, decision, validation, or source evidence proving the link.",
          evaluatorVersion: GOVERNANCE_EVALUATOR_VERSIONS.traceabilityAnalyzer,
        }),
      );
  }

  for (const requirement of input.requirements) {
    if (requirement.specificationId !== input.specification.id)
      findings.push(
        createGovernanceFinding({
          ruleId: "traceability.orphan_requirement",
          category: "traceability",
          severity: "blocking",
          message: `Requirement ${requirement.id} is orphaned from the evaluated specification`,
          evidenceRefs: requirement.evidenceRefs,
          affectedEntityIds: [requirement.id],
          remediation:
            "Link the requirement to this specification or evaluate it with its owning specification.",
          evaluatorVersion: GOVERNANCE_EVALUATOR_VERSIONS.traceabilityAnalyzer,
        }),
      );
    if (requirement.sourceRefs.length === 0)
      findings.push(
        createGovernanceFinding({
          ruleId: "traceability.upstream_justification",
          category: "traceability",
          severity: requirement.criticality === "low" ? "warning" : "blocking",
          message: `Requirement ${requirement.id} has no upstream source justification`,
          evidenceRefs: requirement.evidenceRefs,
          affectedEntityIds: [requirement.id],
          remediation: "Add an authoritative source, decision, or accepted assumption reference.",
          evaluatorVersion: GOVERNANCE_EVALUATOR_VERSIONS.traceabilityAnalyzer,
        }),
      );
  }

  const lifecycle = input.revision.lifecycle;
  const planningRequired = ["in_planning", "in_implementation", "completed"].includes(lifecycle);
  const implementationRequired = ["in_implementation", "completed"].includes(lifecycle);
  const completionRequired = lifecycle === "completed";
  if (planningRequired && input.technicalPlans.length === 0)
    findings.push(
      createGovernanceFinding({
        ruleId: "traceability.plan_required_by_lifecycle",
        category: "traceability",
        severity: "blocking",
        message: `Lifecycle ${lifecycle} requires a Technical Plan link`,
        evidenceRefs: input.specification.evidenceRefs,
        affectedEntityIds: [input.specification.id],
        remediation:
          "Create and link an approved Technical Plan for this exact specification version.",
        evaluatorVersion: GOVERNANCE_EVALUATOR_VERSIONS.traceabilityAnalyzer,
      }),
    );
  if (
    implementationRequired &&
    (input.implementationSlices.length === 0 || input.taskCards.length === 0)
  )
    findings.push(
      createGovernanceFinding({
        ruleId: "traceability.execution_chain_required_by_lifecycle",
        category: "traceability",
        severity: "blocking",
        message: `Lifecycle ${lifecycle} requires implementation-slice and Task Card links`,
        evidenceRefs: input.specification.evidenceRefs,
        affectedEntityIds: [input.specification.id],
        remediation: "Link the approved plan to slices and bounded Task Cards.",
        evaluatorVersion: GOVERNANCE_EVALUATOR_VERSIONS.traceabilityAnalyzer,
      }),
    );
  if (
    completionRequired &&
    (input.validationRefs.length === 0 ||
      input.reviewRefs.length === 0 ||
      input.convergenceFindingRefs.length === 0)
  )
    findings.push(
      createGovernanceFinding({
        ruleId: "traceability.completion_evidence_chain",
        category: "traceability",
        severity: "blocking",
        message: "Completed lifecycle requires validation, review, and convergence evidence",
        evidenceRefs: input.revision.completedEvidenceRefs,
        affectedEntityIds: [input.specification.id],
        remediation: "Attach the missing downstream evidence or correct the lifecycle.",
        evaluatorVersion: GOVERNANCE_EVALUATOR_VERSIONS.traceabilityAnalyzer,
      }),
    );

  return sortFindings(findings);
}
