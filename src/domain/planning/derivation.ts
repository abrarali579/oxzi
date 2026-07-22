import { contentFingerprint } from "../knowledge-graph";
import {
  implementationSliceSchema,
  type GovernanceReport,
  type SpecificationRequirement,
} from "../governance";
import { calculateImplementationSliceFingerprint } from "./normalization";
import type { ImplementationSlice, TechnicalPlan } from "./schemas";
import { createSliceId } from "./utils";

function orderedRequirementIds(report: GovernanceReport): SpecificationRequirement["id"][] {
  const requirements = report.normalization.normalizedInput.requirements.filter(
    (requirement) => requirement.scopeState === "included",
  );
  const included = new Set(requirements.map((requirement) => requirement.id));
  const remaining = new Map(requirements.map((requirement) => [requirement.id, requirement]));
  const resolved = new Set<string>();
  const order: SpecificationRequirement["id"][] = [];
  while (remaining.size > 0) {
    const ready = [...remaining.values()]
      .filter((requirement) =>
        requirement.dependencyRequirementIds
          .filter((dependency) => included.has(dependency))
          .every((dependency) => resolved.has(dependency)),
      )
      .sort(
        (left, right) =>
          left.dependencyRequirementIds.length - right.dependencyRequirementIds.length ||
          left.id.localeCompare(right.id),
      );
    if (ready.length === 0) return [...order, ...[...remaining.keys()].sort()];
    for (const requirement of ready) {
      order.push(requirement.id);
      resolved.add(requirement.id);
      remaining.delete(requirement.id);
    }
  }
  return order;
}

export function deriveImplementationSlices(
  plan: TechnicalPlan,
  parentReport: GovernanceReport,
): ImplementationSlice[] {
  if (
    parentReport.health.status !== "healthy" ||
    parentReport.readiness.decision !== "readiness_recommended"
  )
    throw new Error("Cannot derive implementation slices from an unhealthy specification");

  const input = parentReport.normalization.normalizedInput;
  const requirements = new Map(
    input.requirements.map((requirement) => [requirement.id, requirement]),
  );
  const criteria = new Map(
    input.specification.acceptanceCriteria.map((criterion) => [criterion.id, criterion]),
  );
  const order = orderedRequirementIds(parentReport);
  const sliceIds = new Map(
    order.map((requirementId) => [requirementId, createSliceId(plan.id, requirementId)]),
  );

  return order.map((requirementId, index) => {
    const requirement = requirements.get(requirementId)!;
    const validationCommands = requirement.acceptanceCriterionIds.flatMap(
      (criterionId) => criteria.get(criterionId)?.verificationRefs ?? [],
    );
    const base = {
      id: sliceIds.get(requirementId)!,
      version: 1,
      specificationId: plan.specificationId,
      specificationVersion: plan.specificationVersion,
      specificationFingerprint: plan.specificationFingerprint,
      technicalPlanId: plan.id,
      technicalPlanVersion: plan.revision.version,
      technicalPlanFingerprint: plan.fingerprint,
      constitutionFingerprint: plan.constitutionFingerprint,
      goal: requirement.statement,
      order: index,
      kind:
        requirement.kind === "implementation_constraint"
          ? ("foundation" as const)
          : ("vertical" as const),
      prerequisiteSliceIds: requirement.dependencyRequirementIds
        .map((dependency) => sliceIds.get(dependency))
        .filter((id): id is NonNullable<typeof id> => id !== undefined),
      acceptanceCriterionIds: requirement.acceptanceCriterionIds,
      scope: plan.scope,
      exclusions: plan.exclusions,
      riskRefs: requirement.riskRefs,
      evidenceRefs: requirement.evidenceRefs,
      validationCommands,
      artifactOutputRefs: [`artifact:${sliceIds.get(requirementId)!}`],
      editableScope: plan.componentRefs,
      protectedScope: plan.protectedScope,
      rollbackStrategy: plan.rollbackRefs.join("; "),
      foundationJustification:
        requirement.kind === "implementation_constraint" ? requirement.statement : null,
      parallelGroup: null,
      approvalStatus: "pending" as const,
      lifecycle: "draft" as const,
      parentSliceVersion: null,
      parentSliceFingerprint: null,
      createdAt: plan.revision.createdAt,
      approvedAt: null,
      usedAt: null,
      fingerprint: contentFingerprint({ placeholder: requirementId }),
    };
    return implementationSliceSchema.parse({
      ...base,
      fingerprint: calculateImplementationSliceFingerprint(base as unknown as ImplementationSlice),
    });
  });
}
