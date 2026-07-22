import { contentFingerprint, stableJson, type JsonValue } from "../knowledge-graph";
import { implementationSliceSchema, type GovernanceFinding } from "../governance";
import {
  planNormalizationResultSchema,
  sliceNormalizationResultSchema,
  technicalPlanSchema,
  type ImplementationSlice,
  type PlanNormalizationResult,
  type SliceNormalizationResult,
  type TechnicalPlan,
} from "./schemas";
import { PLANNING_EVALUATOR_VERSIONS, createPlanningFinding, sortPlanningFindings } from "./utils";

function sortedUnique<T extends string>(values: T[], actions: string[], path: string): T[] {
  const result = [...new Set(values)].sort();
  if (result.length !== values.length) actions.push(`deduplicated:${path}`);
  if (JSON.stringify(result) !== JSON.stringify(values)) actions.push(`sorted:${path}`);
  return result as T[];
}

function orderedUnique<T extends string>(values: T[], actions: string[], path: string): T[] {
  const result = [...new Set(values)];
  if (result.length !== values.length) actions.push(`deduplicated:${path}`);
  return result;
}

export function calculateTechnicalPlanFingerprint(plan: TechnicalPlan) {
  const semantic = Object.fromEntries(
    Object.entries(plan).filter(([key]) => key !== "fingerprint"),
  ) as JsonValue;
  return contentFingerprint(semantic);
}

export function calculateImplementationSliceFingerprint(slice: ImplementationSlice) {
  const semantic = Object.fromEntries(
    Object.entries(slice).filter(([key]) => key !== "fingerprint"),
  ) as JsonValue;
  return contentFingerprint(semantic);
}

export function normalizeTechnicalPlan(input: unknown): PlanNormalizationResult {
  const parsed = technicalPlanSchema.parse(input);
  const actions: string[] = [];
  const normalized = {
    ...parsed,
    architectureRefs: sortedUnique(parsed.architectureRefs, actions, "architectureRefs"),
    componentRefs: sortedUnique(parsed.componentRefs, actions, "componentRefs"),
    interfaceRefs: sortedUnique(parsed.interfaceRefs, actions, "interfaceRefs"),
    dataModelRefs: sortedUnique(parsed.dataModelRefs, actions, "dataModelRefs"),
    dependencyRefs: sortedUnique(parsed.dependencyRefs, actions, "dependencyRefs"),
    migrationRefs: sortedUnique(parsed.migrationRefs, actions, "migrationRefs"),
    securityRefs: sortedUnique(parsed.securityRefs, actions, "securityRefs"),
    testStrategyRefs: sortedUnique(parsed.testStrategyRefs, actions, "testStrategyRefs"),
    rolloutRefs: sortedUnique(parsed.rolloutRefs, actions, "rolloutRefs"),
    rollbackRefs: sortedUnique(parsed.rollbackRefs, actions, "rollbackRefs"),
    scope: sortedUnique(parsed.scope, actions, "scope"),
    exclusions: sortedUnique(parsed.exclusions, actions, "exclusions"),
    riskRefs: sortedUnique(parsed.riskRefs, actions, "riskRefs"),
    acceptanceCriterionIds: sortedUnique(
      parsed.acceptanceCriterionIds,
      actions,
      "acceptanceCriterionIds",
    ),
    implementationSequence: orderedUnique(
      parsed.implementationSequence,
      actions,
      "implementationSequence",
    ),
    protectedScope: sortedUnique(parsed.protectedScope, actions, "protectedScope"),
    sourceRefs: sortedUnique(parsed.sourceRefs, actions, "sourceRefs"),
    evidenceRefs: sortedUnique(parsed.evidenceRefs, actions, "evidenceRefs"),
  };
  const fingerprint = calculateTechnicalPlanFingerprint(normalized);
  const declaredFingerprintMatches = parsed.fingerprint === fingerprint;
  const blockingErrors: GovernanceFinding[] = [];
  if (!declaredFingerprintMatches)
    blockingErrors.push(
      createPlanningFinding({
        ruleId: "planning.plan_fingerprint",
        category: "freshness",
        severity: "blocking",
        message: "Declared Technical Plan fingerprint does not match normalized content",
        evidenceRefs: parsed.evidenceRefs,
        affectedEntityIds: [parsed.id],
        remediation: "Create a new plan version with the normalized content fingerprint.",
        evaluatorVersion: PLANNING_EVALUATOR_VERSIONS.planNormalizer,
      }),
    );
  if (new Set(parsed.implementationSequence).size !== parsed.implementationSequence.length)
    blockingErrors.push(
      createPlanningFinding({
        ruleId: "planning.unique_slice_ids",
        category: "structural",
        severity: "blocking",
        message: "Technical Plan implementation sequence contains duplicate slice IDs",
        evidenceRefs: parsed.evidenceRefs,
        affectedEntityIds: [parsed.id, ...parsed.implementationSequence],
        remediation: "Reference each independent Slice exactly once.",
        evaluatorVersion: PLANNING_EVALUATOR_VERSIONS.planNormalizer,
      }),
    );
  return planNormalizationResultSchema.parse({
    plan: { ...normalized, fingerprint },
    fingerprint,
    declaredFingerprintMatches,
    actions: [...new Set(actions)].sort(),
    warnings: [],
    blockingErrors: sortPlanningFindings(blockingErrors),
  });
}

export function normalizeImplementationSlice(input: unknown): SliceNormalizationResult {
  const parsed = implementationSliceSchema.parse(input);
  const actions: string[] = [];
  const normalized = {
    ...parsed,
    prerequisiteSliceIds: sortedUnique(
      parsed.prerequisiteSliceIds,
      actions,
      "prerequisiteSliceIds",
    ),
    acceptanceCriterionIds: sortedUnique(
      parsed.acceptanceCriterionIds,
      actions,
      "acceptanceCriterionIds",
    ),
    scope: sortedUnique(parsed.scope, actions, "scope"),
    exclusions: sortedUnique(parsed.exclusions, actions, "exclusions"),
    riskRefs: sortedUnique(parsed.riskRefs, actions, "riskRefs"),
    evidenceRefs: sortedUnique(parsed.evidenceRefs, actions, "evidenceRefs"),
    validationCommands: orderedUnique(parsed.validationCommands, actions, "validationCommands"),
    artifactOutputRefs: sortedUnique(parsed.artifactOutputRefs, actions, "artifactOutputRefs"),
    editableScope: sortedUnique(parsed.editableScope, actions, "editableScope"),
    protectedScope: sortedUnique(parsed.protectedScope, actions, "protectedScope"),
  };
  const fingerprint = calculateImplementationSliceFingerprint(normalized);
  const declaredFingerprintMatches = parsed.fingerprint === fingerprint;
  const blockingErrors: GovernanceFinding[] = declaredFingerprintMatches
    ? []
    : [
        createPlanningFinding({
          ruleId: "planning.slice_fingerprint",
          category: "freshness",
          severity: "blocking",
          message: `Declared slice fingerprint does not match ${parsed.id} content`,
          evidenceRefs: parsed.evidenceRefs,
          affectedEntityIds: [parsed.id],
          remediation: "Create a new slice version with the normalized content fingerprint.",
          evaluatorVersion: PLANNING_EVALUATOR_VERSIONS.sliceNormalizer,
        }),
      ];
  return sliceNormalizationResultSchema.parse({
    slice: { ...normalized, fingerprint },
    fingerprint,
    declaredFingerprintMatches,
    actions: [...new Set(actions)].sort(),
    warnings: [],
    blockingErrors: sortPlanningFindings(blockingErrors),
  });
}

export function serializeTechnicalPlan(plan: TechnicalPlan): string {
  return stableJson(technicalPlanSchema.parse(plan) as unknown as JsonValue);
}

export function serializeImplementationSlice(slice: ImplementationSlice): string {
  return stableJson(implementationSliceSchema.parse(slice) as unknown as JsonValue);
}
