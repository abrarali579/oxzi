import type {
  ClarificationNeed,
  SpecificationGovernanceInput,
  SpecificationRequirement,
} from "./runtime-schemas";
import { GOVERNANCE_EVALUATOR_VERSIONS, createClarificationNeedId } from "./runtime-utils";

type Candidate = Omit<ClarificationNeed, "id" | "evaluatorVersion">;

function severityFor(requirements: SpecificationRequirement[]) {
  return requirements.some((requirement) => ["blocking", "high"].includes(requirement.criticality))
    ? ("blocking" as const)
    : ("warning" as const);
}

function groupedNeed(
  category: Candidate["category"],
  requirements: SpecificationRequirement[],
  question: string,
): Candidate | null {
  if (requirements.length === 0) return null;
  const severity = severityFor(requirements);
  return {
    category,
    severity,
    affectedRequirementIds: requirements.map((requirement) => requirement.id).sort(),
    evidenceRefs: [
      ...new Set(requirements.flatMap((requirement) => requirement.evidenceRefs)),
    ].sort(),
    question,
    blocking: severity === "blocking",
  };
}

export function analyzeClarifications(input: SpecificationGovernanceInput): ClarificationNeed[] {
  const candidates: Candidate[] = [];
  const included = input.requirements.filter(
    (requirement) => requirement.scopeState === "included",
  );
  const incompleteCore = included.filter(
    (requirement) => !requirement.actor || !requirement.action || !requirement.object,
  );
  if (incompleteCore.length > 0) {
    const missing = new Set<string>();
    incompleteCore.forEach((requirement) => {
      if (!requirement.actor) missing.add("actor");
      if (!requirement.action) missing.add("action");
      if (!requirement.object) missing.add("object");
    });
    const first = ["actor", "action", "object"].find((field) => missing.has(field)) ?? "actor";
    const need = groupedNeed(
      `ambiguous_${first}` as Candidate["category"],
      incompleteCore,
      `Who performs what action on which object for requirements ${incompleteCore.map((requirement) => requirement.id).join(", ")}?`,
    );
    if (need) candidates.push(need);
  }

  const missingSuccess = included.filter((requirement) => !requirement.successCondition);
  const successNeed = groupedNeed(
    "undefined_success_condition",
    missingSuccess,
    `What observable outcome proves success for requirements ${missingSuccess.map((requirement) => requirement.id).join(", ")}?`,
  );
  if (successNeed) candidates.push(successNeed);

  const missingFailure = included.filter((requirement) => !requirement.failureBehavior);
  const failureNeed = groupedNeed(
    "missing_failure_behavior",
    missingFailure,
    `What should happen when requirements ${missingFailure.map((requirement) => requirement.id).join(", ")} cannot complete successfully?`,
  );
  if (failureNeed) candidates.push(failureNeed);

  const missingEdge = included.filter((requirement) => !requirement.edgeCaseBehavior);
  const edgeNeed = groupedNeed(
    "missing_edge_case_behavior",
    missingEdge,
    `Which boundary or edge-case behavior is required for ${missingEdge.map((requirement) => requirement.id).join(", ")}?`,
  );
  if (edgeNeed) candidates.push(edgeNeed);

  const unknownScope = input.requirements.filter(
    (requirement) => requirement.scopeState === "undecided",
  );
  const scopeNeed = groupedNeed(
    "unclear_scope_inclusion",
    unknownScope,
    `Should ${unknownScope.map((requirement) => requirement.id).join(", ")} be included now, deferred, or excluded?`,
  );
  if (scopeNeed) candidates.push(scopeNeed);

  const missingAuthority = included.filter((requirement) => !requirement.authorityRef);
  const authorityNeed = groupedNeed(
    "undefined_authority",
    missingAuthority,
    `Who has decision authority for ${missingAuthority.map((requirement) => requirement.id).join(", ")}?`,
  );
  if (authorityNeed) candidates.push(authorityNeed);

  const missingOwnership = included.filter(
    (requirement) => requirement.privacyClassification !== null && !requirement.dataOwner,
  );
  const ownershipNeed = groupedNeed(
    "unclear_data_ownership",
    missingOwnership,
    `Who owns the data handled by ${missingOwnership.map((requirement) => requirement.id).join(", ")}?`,
  );
  if (ownershipNeed) candidates.push(ownershipNeed);

  const missingPrivacy = included.filter(
    (requirement) => requirement.privacyClassification === null,
  );
  const privacyNeed = groupedNeed(
    "missing_privacy_classification",
    missingPrivacy,
    `What privacy classification applies to ${missingPrivacy.map((requirement) => requirement.id).join(", ")}?`,
  );
  if (privacyNeed) candidates.push(privacyNeed);

  const missingApproval = included.filter((requirement) => !requirement.approvalBoundaryRef);
  const approvalNeed = groupedNeed(
    "missing_approval_boundary",
    missingApproval,
    `What approval boundary governs ${missingApproval.map((requirement) => requirement.id).join(", ")}?`,
  );
  if (approvalNeed) candidates.push(approvalNeed);

  const missingCriteria = included.filter(
    (requirement) => requirement.acceptanceCriterionIds.length === 0,
  );
  const criteriaNeed = groupedNeed(
    "missing_acceptance_criterion",
    missingCriteria,
    `What measurable acceptance criterion verifies ${missingCriteria.map((requirement) => requirement.id).join(", ")}?`,
  );
  if (criteriaNeed) candidates.push(criteriaNeed);

  const vagueCriterionPattern =
    /\b(?:fast|good|appropriate|user[- ]friendly|seamless|works? well)\b/i;
  const unverifiableRequirementIds = new Set(
    input.specification.acceptanceCriteria
      .filter(
        (criterion) =>
          criterion.verificationRefs.length === 0 ||
          vagueCriterionPattern.test(criterion.statement),
      )
      .flatMap((criterion) =>
        input.requirements
          .filter((requirement) => requirement.acceptanceCriterionIds.includes(criterion.id))
          .map((requirement) => requirement.id),
      ),
  );
  const unverifiable = included.filter((requirement) =>
    unverifiableRequirementIds.has(requirement.id),
  );
  const verifyNeed = groupedNeed(
    "unverifiable_acceptance_criterion",
    unverifiable,
    `What deterministic measurement or inspection verifies ${unverifiable.map((requirement) => requirement.id).join(", ")}?`,
  );
  if (verifyNeed) candidates.push(verifyNeed);

  const implementationDetail = included.filter(
    (requirement) =>
      requirement.kind === "product_requirement" &&
      /^(?:use|build using|implement with|store in)\b/i.test(requirement.statement.trim()),
  );
  const implementationNeed = groupedNeed(
    "implementation_detail_as_product_requirement",
    implementationDetail,
    `Is the implementation choice in ${implementationDetail.map((requirement) => requirement.id).join(", ")} a required product constraint or should it move to the Technical Plan?`,
  );
  if (implementationNeed) candidates.push(implementationNeed);

  return candidates
    .map((candidate) => ({
      ...candidate,
      id: createClarificationNeedId({
        category: candidate.category,
        requirementIds: candidate.affectedRequirementIds,
      }),
      evaluatorVersion: GOVERNANCE_EVALUATOR_VERSIONS.clarificationAnalyzer,
    }))
    .sort(
      (left, right) =>
        Number(right.blocking) - Number(left.blocking) ||
        left.category.localeCompare(right.category) ||
        left.id.localeCompare(right.id),
    );
}
