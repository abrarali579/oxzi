import { canonicalProjectFingerprint } from "../knowledge-graph";
import { specificationHealthResultSchema } from "./schemas";
import {
  governanceHealthResultSchema,
  implementationReadinessDecisionSchema,
  type ClarificationNeed,
  type ConstitutionComplianceResult,
  type GovernanceFinding,
  type GovernanceHealthResult,
  type FreshnessEvaluation,
  type ImplementationReadinessDecision,
  type NormalizationResult,
  type ResolvedConstitution,
} from "./runtime-schemas";
import { GOVERNANCE_EVALUATOR_VERSIONS, asFingerprint } from "./runtime-utils";

type HealthInputs = {
  normalization: NormalizationResult;
  constitution: ResolvedConstitution;
  compliance: ConstitutionComplianceResult[];
  structural: GovernanceFinding[];
  clarifications: ClarificationNeed[];
  consistency: GovernanceFinding[];
  traceability: GovernanceFinding[];
  testability: GovernanceFinding[];
  freshness: FreshnessEvaluation;
};

const blockingIds = (findings: GovernanceFinding[]) =>
  findings.filter((finding) => finding.severity === "blocking").map((finding) => finding.id);
const resultFor = (blocking: boolean, warning: boolean, unknown = false) =>
  blocking ? "fail" : unknown ? "unknown" : warning ? "warning" : "pass";

export function calculateSpecificationHealth(inputs: HealthInputs): GovernanceHealthResult {
  const input = inputs.normalization.normalizedInput;
  const structureBlocking = [
    ...blockingIds(inputs.normalization.blockingErrors),
    ...blockingIds(inputs.structural),
  ];
  const clarificationBlocking = inputs.clarifications.filter((need) => need.blocking);
  const constitutionFindingBlocking = blockingIds(inputs.constitution.findings);
  const complianceFailures = inputs.compliance
    .filter((result) => result.status === "fail" && result.blocking)
    .map((result) => result.ruleId);
  const complianceUnknown = inputs.compliance
    .filter((result) => result.status === "unknown" && result.blocking)
    .map((result) => result.ruleId);
  const constitutionBlocking = [
    ...constitutionFindingBlocking,
    ...complianceFailures,
    ...complianceUnknown,
  ];
  const consistencyBlocking = blockingIds(inputs.consistency);
  const traceabilityBlocking = blockingIds(inputs.traceability);
  const testabilityFailures = inputs.testability.filter(
    (finding) => finding.severity === "blocking",
  );
  const nonTestabilityStructureBlocking = structureBlocking.filter(
    (findingId) => !testabilityFailures.some((finding) => finding.id === findingId),
  );
  const approvalMissing =
    input.revision.humanApprovalRequired && input.specification.approvalStatus !== "approved";
  const actualCanonicalFingerprint = canonicalProjectFingerprint(input.canonicalProject);
  const stale = inputs.freshness.status !== "current";

  const dimensions = [
    {
      dimension: "structural_completeness" as const,
      result: resultFor(
        structureBlocking.length > 0,
        inputs.structural.some((finding) => finding.severity === "warning"),
      ),
      calculationInputs: ["normalization", "structuralFindings"],
      passedCheckIds: structureBlocking.length === 0 ? ["structure.complete"] : [],
      failedCheckIds: [...inputs.normalization.blockingErrors, ...inputs.structural]
        .filter((finding) => finding.severity === "blocking")
        .map((finding) => finding.ruleId),
      unknownCheckIds: [],
      blockingFindingIds: structureBlocking,
      evaluatorVersion: GOVERNANCE_EVALUATOR_VERSIONS.healthCalculator,
    },
    {
      dimension: "clarification_completeness" as const,
      result: resultFor(clarificationBlocking.length > 0, inputs.clarifications.length > 0),
      calculationInputs: ["clarificationNeeds"],
      passedCheckIds: inputs.clarifications.length === 0 ? ["clarification.none"] : [],
      failedCheckIds: clarificationBlocking.map((need) => need.category),
      unknownCheckIds: [],
      blockingFindingIds: [],
      evaluatorVersion: GOVERNANCE_EVALUATOR_VERSIONS.healthCalculator,
    },
    {
      dimension: "constitutional_compliance" as const,
      result:
        constitutionFindingBlocking.length > 0 || complianceFailures.length > 0
          ? "fail"
          : complianceUnknown.length > 0
            ? "unknown"
            : inputs.constitution.findings.some((finding) => finding.severity === "warning")
              ? "warning"
              : "pass",
      calculationInputs: [
        inputs.constitution.id,
        ...inputs.compliance.map((result) => result.ruleId),
      ],
      passedCheckIds: inputs.compliance
        .filter((result) => result.status === "pass")
        .map((result) => result.ruleId),
      failedCheckIds: inputs.compliance
        .filter((result) => result.status === "fail")
        .map((result) => result.ruleId),
      unknownCheckIds: inputs.compliance
        .filter((result) => result.status === "unknown")
        .map((result) => result.ruleId),
      blockingFindingIds: blockingIds(inputs.constitution.findings),
      evaluatorVersion: GOVERNANCE_EVALUATOR_VERSIONS.healthCalculator,
    },
    {
      dimension: "internal_consistency" as const,
      result: resultFor(
        consistencyBlocking.length > 0,
        inputs.consistency.some((finding) => finding.severity === "warning"),
      ),
      calculationInputs: ["requirements", "criteria", "scope", "dependencies", "lifecycle"],
      passedCheckIds: consistencyBlocking.length === 0 ? ["consistency.no_blocker"] : [],
      failedCheckIds: inputs.consistency
        .filter((finding) => finding.severity === "blocking")
        .map((finding) => finding.ruleId),
      unknownCheckIds: [],
      blockingFindingIds: consistencyBlocking,
      evaluatorVersion: GOVERNANCE_EVALUATOR_VERSIONS.healthCalculator,
    },
    {
      dimension: "traceability" as const,
      result: resultFor(
        traceabilityBlocking.length > 0,
        inputs.traceability.some((finding) => finding.severity === "warning"),
      ),
      calculationInputs: ["requirements", "decisions", "availableDownstreamLinks"],
      passedCheckIds: traceabilityBlocking.length === 0 ? ["traceability.lifecycle_aware"] : [],
      failedCheckIds: inputs.traceability
        .filter((finding) => finding.severity === "blocking")
        .map((finding) => finding.ruleId),
      unknownCheckIds: [],
      blockingFindingIds: traceabilityBlocking,
      evaluatorVersion: GOVERNANCE_EVALUATOR_VERSIONS.healthCalculator,
    },
    {
      dimension: "testability" as const,
      result: resultFor(testabilityFailures.length > 0, false),
      calculationInputs: [
        ...input.specification.acceptanceCriteria.map((criterion) => criterion.id),
        GOVERNANCE_EVALUATOR_VERSIONS.testabilityAnalyzer,
      ],
      passedCheckIds: testabilityFailures.length === 0 ? ["testability.criteria_verifiable"] : [],
      failedCheckIds: testabilityFailures.map((finding) => finding.ruleId),
      unknownCheckIds: [],
      blockingFindingIds: testabilityFailures.map((finding) => finding.id),
      evaluatorVersion: GOVERNANCE_EVALUATOR_VERSIONS.healthCalculator,
    },
    {
      dimension: "approval_completeness" as const,
      result: resultFor(approvalMissing, input.specification.approvalStatus === "pending"),
      calculationInputs: [input.specification.approvalStatus],
      passedCheckIds: approvalMissing ? [] : ["approval.complete"],
      failedCheckIds: approvalMissing ? ["approval.required"] : [],
      unknownCheckIds: [],
      blockingFindingIds: [],
      evaluatorVersion: GOVERNANCE_EVALUATOR_VERSIONS.healthCalculator,
    },
    {
      dimension: "freshness" as const,
      result: inputs.freshness.status === "unknown" ? "unknown" : resultFor(stale, false),
      calculationInputs: [
        input.revision.canonicalVersionId,
        input.revision.canonicalFingerprint,
        actualCanonicalFingerprint,
      ],
      passedCheckIds: inputs.freshness.passedCheckIds,
      failedCheckIds: inputs.freshness.failedCheckIds,
      unknownCheckIds: inputs.freshness.unknownCheckIds,
      blockingFindingIds: blockingIds(inputs.freshness.findings),
      evaluatorVersion: GOVERNANCE_EVALUATOR_VERSIONS.healthCalculator,
    },
  ];

  let status: GovernanceHealthResult["status"] = "healthy";
  let readinessClass: GovernanceHealthResult["readinessClass"] = "implementation_ready";
  if (input.revision.lifecycle === "superseded") {
    status = "superseded";
    readinessClass = "stale";
  } else if (stale) {
    status = "blocked";
    readinessClass = "stale";
  } else if (constitutionBlocking.length > 0) {
    status = "blocked";
    readinessClass = "constitution_blocked";
  } else if (consistencyBlocking.length > 0) {
    status = "conflicted";
    readinessClass = "inconsistent";
  } else if (nonTestabilityStructureBlocking.length > 0 || traceabilityBlocking.length > 0) {
    status = "incomplete";
    readinessClass = "structurally_incomplete";
  } else if (testabilityFailures.length > 0) {
    status = "untestable";
    readinessClass = "untestable";
  } else if (clarificationBlocking.length > 0) {
    status = "clarification_required";
    readinessClass = "clarification_required";
  } else if (approvalMissing || input.revision.lifecycle === "draft") {
    status = "incomplete";
    readinessClass = input.revision.lifecycle === "draft" ? "draft" : "review_required";
  }

  const allFindings = [
    ...inputs.normalization.blockingErrors,
    ...inputs.constitution.findings,
    ...inputs.structural,
    ...inputs.consistency,
    ...inputs.traceability,
    ...inputs.testability,
    ...inputs.freshness.findings,
  ];
  const blockerRefs = [
    ...allFindings
      .filter((finding) => finding.severity === "blocking")
      .map((finding) => finding.id),
    ...clarificationBlocking.map((need) => need.id),
    ...inputs.compliance.filter((result) => result.blocking).map((result) => result.ruleId),
  ].sort();
  const passedCheckIds = dimensions.flatMap((dimension) => dimension.passedCheckIds).sort();
  const failedCheckIds = dimensions.flatMap((dimension) => dimension.failedCheckIds).sort();
  const baseResult = specificationHealthResultSchema.parse({
    specificationId: input.specification.id,
    status,
    passedCheckIds,
    failedCheckIds,
    missingInformation: inputs.clarifications.map((need) => need.question),
    blockerRefs,
    clarificationRefs: inputs.clarifications.map((need) => need.id),
    planningMayProceed: status === "healthy",
    policyVersion: GOVERNANCE_EVALUATOR_VERSIONS.healthCalculator,
    fingerprint: asFingerprint({
      specificationId: input.specification.id,
      status,
      passedCheckIds,
      failedCheckIds,
      blockerRefs,
    }),
  });

  return governanceHealthResultSchema.parse({
    specificationId: input.specification.id,
    status,
    readinessClass,
    dimensions,
    blockingReasons: blockerRefs,
    recommendations: [
      ...inputs.clarifications.map((need) => need.question),
      ...allFindings
        .filter((finding) => finding.severity !== "blocking")
        .map((finding) => finding.remediation),
    ].sort(),
    evaluatorVersion: GOVERNANCE_EVALUATOR_VERSIONS.healthCalculator,
    inputFingerprint: inputs.normalization.fingerprint,
    baseResult,
  });
}

export function decideImplementationReadiness(
  normalization: NormalizationResult,
  constitution: ResolvedConstitution,
  health: GovernanceHealthResult,
): ImplementationReadinessDecision {
  const input = normalization.normalizedInput;
  const stale = health.readinessClass === "stale";
  const ready = health.status === "healthy";
  const needsReview = ready && input.specification.approvalStatus !== "approved";
  return implementationReadinessDecisionSchema.parse({
    decision: stale
      ? "stale"
      : ready
        ? needsReview
          ? "human_review_required"
          : "readiness_recommended"
        : "not_ready",
    readinessClass: health.readinessClass,
    blockingReasons: health.blockingReasons,
    recommendations: health.recommendations,
    governingPolicyVersion: GOVERNANCE_EVALUATOR_VERSIONS.readinessPolicy,
    evaluatedSpecificationId: input.specification.id,
    evaluatedSpecificationVersion: input.specification.version,
    constitutionVersion: constitution.constitutionVersion,
    evaluatorVersions: GOVERNANCE_EVALUATOR_VERSIONS,
    inputFingerprints: {
      specification: normalization.fingerprint,
      constitution: constitution.fingerprint,
      canonical: canonicalProjectFingerprint(input.canonicalProject),
    },
    requiredNextAction: stale
      ? "Re-evaluate against current authoritative inputs."
      : ready
        ? "Obtain or confirm authorized human/workflow readiness approval."
        : health.readinessClass === "clarification_required"
          ? "Resolve the blocking clarification needs."
          : "Repair blocking governance findings and re-evaluate.",
    humanApprovalRequired: input.revision.humanApprovalRequired,
  });
}
