import { stableJson, type JsonValue } from "../knowledge-graph";
import {
  normalizationResultSchema,
  specificationGovernanceInputSchema,
  type GovernanceFinding,
  type NormalizationResult,
  type SpecificationGovernanceInput,
  type SpecificationRequirement,
} from "./runtime-schemas";
import {
  GOVERNANCE_EVALUATOR_VERSIONS,
  asFingerprint,
  createGovernanceFinding,
  sortFindings,
} from "./runtime-utils";

function uniqueSorted<T extends string>(values: T[], actions: string[], field: string): T[] {
  const result = [...new Set(values)].sort();
  if (result.length !== values.length) actions.push(`deduplicated:${field}`);
  if (stableJson(values as JsonValue) !== stableJson(result as JsonValue))
    actions.push(`sorted:${field}`);
  return result as T[];
}

function normalizeRequirement(
  requirement: SpecificationRequirement,
  actions: string[],
): SpecificationRequirement {
  return {
    ...requirement,
    acceptanceCriterionIds: uniqueSorted(
      requirement.acceptanceCriterionIds,
      actions,
      `${requirement.id}.acceptanceCriterionIds`,
    ),
    decisionRefs: uniqueSorted(requirement.decisionRefs, actions, `${requirement.id}.decisionRefs`),
    dependencyRequirementIds: uniqueSorted(
      requirement.dependencyRequirementIds,
      actions,
      `${requirement.id}.dependencyRequirementIds`,
    ),
    externalDependencyRefs: uniqueSorted(
      requirement.externalDependencyRefs,
      actions,
      `${requirement.id}.externalDependencyRefs`,
    ),
    riskRefs: uniqueSorted(requirement.riskRefs, actions, `${requirement.id}.riskRefs`),
    contradictsRequirementIds: uniqueSorted(
      requirement.contradictsRequirementIds,
      actions,
      `${requirement.id}.contradictsRequirementIds`,
    ),
    contradictoryCriterionIds: uniqueSorted(
      requirement.contradictoryCriterionIds,
      actions,
      `${requirement.id}.contradictoryCriterionIds`,
    ),
    unresolvedQuestions: uniqueSorted(
      requirement.unresolvedQuestions,
      actions,
      `${requirement.id}.unresolvedQuestions`,
    ),
    sourceRefs: uniqueSorted(requirement.sourceRefs, actions, `${requirement.id}.sourceRefs`),
    evidenceRefs: uniqueSorted(requirement.evidenceRefs, actions, `${requirement.id}.evidenceRefs`),
  };
}

function deduplicateRequirements(
  requirements: SpecificationRequirement[],
  actions: string[],
  errors: GovernanceFinding[],
): SpecificationRequirement[] {
  const byId = new Map<string, SpecificationRequirement>();
  for (const requirement of requirements) {
    const normalized = normalizeRequirement(requirement, actions);
    const existing = byId.get(requirement.id);
    if (!existing) {
      byId.set(requirement.id, normalized);
      continue;
    }
    if (
      stableJson(existing as unknown as JsonValue) ===
      stableJson(normalized as unknown as JsonValue)
    ) {
      actions.push(`deduplicated:requirement:${requirement.id}`);
      continue;
    }
    errors.push(
      createGovernanceFinding({
        ruleId: "structure.unique_requirement_id",
        category: "structural",
        severity: "blocking",
        message: `Requirement ID ${requirement.id} has conflicting definitions`,
        evidenceRefs: [...existing.evidenceRefs, ...normalized.evidenceRefs],
        affectedEntityIds: [requirement.id],
        remediation: "Create a new stable ID or reconcile the conflicting definitions explicitly.",
        evaluatorVersion: GOVERNANCE_EVALUATOR_VERSIONS.normalizer,
      }),
    );
  }
  return [...byId.values()];
}

export function calculateNormalizedSpecificationFingerprint(input: SpecificationGovernanceInput) {
  const specification = Object.fromEntries(
    Object.entries(input.specification).filter(([key]) => key !== "fingerprint"),
  ) as JsonValue;
  return asFingerprint({
    specification,
    requirements: input.requirements,
    revision: {
      lifecycle: input.revision.lifecycle,
      canonicalVersionId: input.revision.canonicalVersionId,
      canonicalFingerprint: input.revision.canonicalFingerprint,
      parentSpecificationVersion: input.revision.parentSpecificationVersion,
      parentSpecificationFingerprint: input.revision.parentSpecificationFingerprint,
      amendmentReason: input.revision.amendmentReason,
      sourceFingerprints: input.revision.sourceFingerprints,
      dependencyFingerprints: input.revision.dependencyFingerprints,
    },
  } as unknown as JsonValue);
}

export function normalizeSpecification(input: unknown): NormalizationResult {
  const parsed = specificationGovernanceInputSchema.parse(input);
  const actions: string[] = [];
  const blockingErrors: GovernanceFinding[] = [];
  const warnings: GovernanceFinding[] = [];
  const requirements = deduplicateRequirements(parsed.requirements, actions, blockingErrors);

  const specification = {
    ...parsed.specification,
    what: uniqueSorted(parsed.specification.what, actions, "specification.what"),
    why: uniqueSorted(parsed.specification.why, actions, "specification.why"),
    actors: uniqueSorted(parsed.specification.actors, actions, "specification.actors"),
    outcomes: uniqueSorted(parsed.specification.outcomes, actions, "specification.outcomes"),
    constraints: uniqueSorted(
      parsed.specification.constraints,
      actions,
      "specification.constraints",
    ),
    scope: uniqueSorted(parsed.specification.scope, actions, "specification.scope"),
    exclusions: uniqueSorted(parsed.specification.exclusions, actions, "specification.exclusions"),
    sourceRefs: uniqueSorted(parsed.specification.sourceRefs, actions, "specification.sourceRefs"),
    evidenceRefs: uniqueSorted(
      parsed.specification.evidenceRefs,
      actions,
      "specification.evidenceRefs",
    ),
  };
  const withoutUpdatedFingerprint = { ...parsed, specification, requirements };
  const fingerprint = calculateNormalizedSpecificationFingerprint(withoutUpdatedFingerprint);
  const declaredFingerprintMatches = parsed.specification.fingerprint === fingerprint;
  if (!declaredFingerprintMatches)
    blockingErrors.push(
      createGovernanceFinding({
        ruleId: "structure.specification_fingerprint",
        category: "freshness",
        severity: "blocking",
        message: "Declared specification fingerprint does not match normalized content",
        evidenceRefs: parsed.specification.evidenceRefs,
        affectedEntityIds: [parsed.specification.id],
        remediation: "Create a new specification version with the normalized fingerprint.",
        evaluatorVersion: GOVERNANCE_EVALUATOR_VERSIONS.normalizer,
      }),
    );
  const normalizedInput = specificationGovernanceInputSchema.parse({
    ...withoutUpdatedFingerprint,
    specification: { ...specification, fingerprint },
  });

  return normalizationResultSchema.parse({
    normalizedInput,
    fingerprint,
    declaredFingerprintMatches,
    actions: [...new Set(actions)].sort(),
    warnings: sortFindings(warnings),
    blockingErrors: sortFindings(blockingErrors),
  });
}
