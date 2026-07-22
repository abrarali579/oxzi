import { stableJson, type JsonValue } from "../knowledge-graph";
import { analyzeClarifications } from "./clarification";
import { analyzeSpecificationConsistency } from "./consistency";
import { evaluateConstitutionCompliance, resolveProjectConstitution } from "./constitution";
import { calculateSpecificationHealth, decideImplementationReadiness } from "./health";
import { normalizeSpecification } from "./normalizer";
import {
  governanceReportSchema,
  specificationGovernanceInputSchema,
  type GovernanceReport,
  type SpecificationGovernanceInput,
} from "./runtime-schemas";
import {
  GOVERNANCE_EVALUATOR_VERSIONS,
  asFingerprint,
  createGovernanceReportId,
  sortFindings,
} from "./runtime-utils";
import { validateSpecificationStructure } from "./structure";
import { analyzeSpecificationTraceability } from "./traceability";

function semanticReportValue(report: Omit<GovernanceReport, "semanticFingerprint">): JsonValue {
  return {
    id: report.id,
    specificationId: report.specificationId,
    specificationVersion: report.specificationVersion,
    specificationFingerprint: report.specificationFingerprint,
    constitutionId: report.constitutionId,
    constitutionVersion: report.constitutionVersion,
    constitutionFingerprint: report.constitutionFingerprint,
    canonicalVersionId: report.canonicalVersionId,
    canonicalFingerprint: report.canonicalFingerprint,
    evaluatorVersions: report.evaluatorVersions,
    structuralFindings: report.structuralFindings,
    clarificationNeeds: report.clarificationNeeds,
    constitutionalResults: report.constitutionalResults,
    consistencyFindings: report.consistencyFindings,
    traceabilityFindings: report.traceabilityFindings,
    health: report.health,
    readiness: report.readiness,
    evidenceRefs: report.evidenceRefs,
    recommendedNextAction: report.recommendedNextAction,
  } as unknown as JsonValue;
}

export function evaluateSpecificationGovernance(input: unknown): GovernanceReport {
  const parsedInput = specificationGovernanceInputSchema.parse(input);
  const constitution = resolveProjectConstitution(parsedInput);
  const normalization = normalizeSpecification(parsedInput);
  const normalizedInput: SpecificationGovernanceInput = normalization.normalizedInput;
  const compliance = evaluateConstitutionCompliance(normalizedInput, constitution);
  const structural = sortFindings([
    ...normalization.blockingErrors,
    ...normalization.warnings,
    ...validateSpecificationStructure(normalizedInput),
  ]);
  const clarifications = analyzeClarifications(normalizedInput);
  const consistency = analyzeSpecificationConsistency(normalizedInput, clarifications);
  const traceability = analyzeSpecificationTraceability(normalizedInput);
  const health = calculateSpecificationHealth({
    normalization,
    constitution,
    compliance,
    structural,
    clarifications,
    consistency,
    traceability,
  });
  const readiness = decideImplementationReadiness(normalization, constitution, health);
  const evidenceRefs = [
    ...normalizedInput.specification.evidenceRefs,
    ...normalizedInput.requirements.flatMap((requirement) => requirement.evidenceRefs),
    ...constitution.rules.flatMap((binding) => binding.rule.evidenceRefs),
    ...compliance.flatMap((result) => result.evidenceRefs),
    ...normalizedInput.traceabilityLinks.flatMap((link) => link.evidenceRefs),
  ];
  const identity = {
    specificationId: normalizedInput.specification.id,
    specificationVersion: normalizedInput.specification.version,
    specificationFingerprint: normalization.fingerprint,
    constitutionFingerprint: constitution.fingerprint,
    canonicalFingerprint: normalizedInput.revision.canonicalFingerprint,
  } as unknown as JsonValue;
  const partial = {
    id: createGovernanceReportId(identity),
    specificationId: normalizedInput.specification.id,
    specificationVersion: normalizedInput.specification.version,
    specificationFingerprint: normalization.fingerprint,
    constitutionId: constitution.id,
    constitutionVersion: constitution.constitutionVersion,
    constitutionFingerprint: constitution.fingerprint,
    canonicalVersionId: normalizedInput.revision.canonicalVersionId,
    canonicalFingerprint: normalizedInput.revision.canonicalFingerprint,
    evaluatedAt: normalizedInput.evaluationTimestamp,
    evaluatorVersions: GOVERNANCE_EVALUATOR_VERSIONS,
    structuralFindings: structural,
    clarificationNeeds: clarifications,
    constitutionalResults: compliance,
    consistencyFindings: consistency,
    traceabilityFindings: traceability,
    health,
    readiness,
    evidenceRefs: [...new Set(evidenceRefs)].sort(),
    recommendedNextAction: readiness.requiredNextAction,
    temporal: {
      observedAt: normalizedInput.evaluationTimestamp,
      sourceCreatedAt: normalizedInput.revision.createdAt,
      ingestedAt: normalizedInput.evaluationTimestamp,
      effectiveFrom: normalizedInput.evaluationTimestamp,
      effectiveTo: null,
      invalidatedAt: null,
      supersededAt: normalizedInput.revision.supersededAt,
      supersededBy: null,
      currentStatus: normalizedInput.revision.lifecycle === "superseded" ? "superseded" : "current",
    },
  } satisfies Omit<GovernanceReport, "semanticFingerprint">;
  return governanceReportSchema.parse({
    ...partial,
    semanticFingerprint: asFingerprint(semanticReportValue(partial)),
  });
}

export function serializeGovernanceReport(report: GovernanceReport): string {
  return stableJson(governanceReportSchema.parse(report) as unknown as JsonValue);
}

export function serializeGovernanceReportSemantic(report: GovernanceReport): string {
  const parsed = governanceReportSchema.parse(report);
  return stableJson(semanticReportValue(parsed));
}

export function renderGovernanceSummary(report: GovernanceReport): string {
  const parsed = governanceReportSchema.parse(report);
  return [
    `Specification ${parsed.specificationId} v${parsed.specificationVersion}`,
    `Health: ${parsed.health.status}`,
    `Readiness: ${parsed.readiness.decision}`,
    `Blocking reasons: ${parsed.readiness.blockingReasons.length}`,
    `Next action: ${parsed.recommendedNextAction}`,
  ].join("\n");
}
