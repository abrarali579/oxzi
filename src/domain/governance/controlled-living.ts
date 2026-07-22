import { canonicalProjectFingerprint } from "../knowledge-graph";
import { resolveProjectConstitution } from "./constitution";
import { normalizeSpecification } from "./normalizer";
import type {
  GovernanceFinding,
  GovernanceReport,
  NormalizationResult,
  SpecificationGovernanceInput,
} from "./runtime-schemas";
import {
  GOVERNANCE_EVALUATOR_VERSIONS,
  createGovernanceFinding,
  sortFindings,
} from "./runtime-utils";

const allowedTransitions: Readonly<Record<string, readonly string[]>> = {
  draft: ["draft", "review"],
  review: ["draft", "review", "approved"],
  approved: ["approved", "readiness_requested", "superseded"],
  readiness_requested: ["review", "approved", "implementation_ready"],
  implementation_ready: ["review", "implementation_ready", "in_planning", "superseded"],
  in_planning: ["review", "in_planning", "in_implementation", "superseded"],
  in_implementation: ["in_implementation", "completed", "superseded"],
  completed: ["completed", "superseded"],
  superseded: ["superseded"],
};

export function validateSpecificationAmendment(
  previous: SpecificationGovernanceInput,
  next: NormalizationResult,
): GovernanceFinding[] {
  const findings: GovernanceFinding[] = [];
  const current = next.normalizedInput;
  const previousApproved = previous.specification.approvalStatus === "approved";
  if (
    previousApproved &&
    current.specification.version === previous.specification.version &&
    current.specification.fingerprint !== previous.specification.fingerprint
  )
    findings.push(
      createGovernanceFinding({
        ruleId: "controlled_living.approved_version_immutable",
        category: "controlled_living",
        severity: "blocking",
        message: "An approved specification version cannot be mutated",
        evidenceRefs: previous.specification.evidenceRefs,
        affectedEntityIds: [previous.specification.id],
        remediation: "Create a new amendment version and preserve the approved version unchanged.",
        evaluatorVersion: GOVERNANCE_EVALUATOR_VERSIONS.structuralValidator,
      }),
    );
  if (current.specification.version <= previous.specification.version)
    findings.push(
      createGovernanceFinding({
        ruleId: "controlled_living.amendment_version",
        category: "controlled_living",
        severity: "blocking",
        message: "A specification amendment requires a higher version number",
        evidenceRefs: current.specification.evidenceRefs,
        affectedEntityIds: [current.specification.id],
        remediation: "Increment the version and record its approved parent.",
        evaluatorVersion: GOVERNANCE_EVALUATOR_VERSIONS.structuralValidator,
      }),
    );
  if (
    current.revision.parentSpecificationVersion !== previous.specification.version ||
    current.revision.parentSpecificationFingerprint !== previous.specification.fingerprint ||
    !current.revision.amendmentReason
  )
    findings.push(
      createGovernanceFinding({
        ruleId: "controlled_living.parent_traceability",
        category: "controlled_living",
        severity: "blocking",
        message: "Amendment does not preserve exact parent version, fingerprint, and reason",
        evidenceRefs: current.specification.evidenceRefs,
        affectedEntityIds: [current.specification.id],
        remediation: "Record the prior approved version/fingerprint and amendment reason.",
        evaluatorVersion: GOVERNANCE_EVALUATOR_VERSIONS.structuralValidator,
      }),
    );
  const startsAmendmentDraft =
    current.specification.version > previous.specification.version &&
    current.revision.lifecycle === "draft" &&
    current.revision.parentSpecificationVersion === previous.specification.version;
  if (
    !startsAmendmentDraft &&
    !(allowedTransitions[previous.revision.lifecycle] ?? []).includes(current.revision.lifecycle)
  )
    findings.push(
      createGovernanceFinding({
        ruleId: "controlled_living.lifecycle_transition",
        category: "controlled_living",
        severity: "blocking",
        message: `Lifecycle transition ${previous.revision.lifecycle} → ${current.revision.lifecycle} is not allowed`,
        evidenceRefs: current.specification.evidenceRefs,
        affectedEntityIds: [current.specification.id],
        remediation: "Use an allowed reviewed lifecycle transition.",
        evaluatorVersion: GOVERNANCE_EVALUATOR_VERSIONS.structuralValidator,
      }),
    );
  return sortFindings(findings);
}

export function assessGovernanceReportFreshness(
  report: GovernanceReport,
  current: SpecificationGovernanceInput,
): { status: "current" | "stale"; reasons: string[] } {
  const reasons: string[] = [];
  const normalization = normalizeSpecification(current);
  const constitution = resolveProjectConstitution(normalization.normalizedInput);
  if (report.specificationVersion !== current.specification.version)
    reasons.push("specification_version_changed");
  if (report.specificationFingerprint !== normalization.fingerprint)
    reasons.push("specification_fingerprint_changed");
  if (report.canonicalVersionId !== current.canonicalProject.metadata.version.id)
    reasons.push("canonical_version_changed");
  if (report.canonicalFingerprint !== canonicalProjectFingerprint(current.canonicalProject))
    reasons.push("canonical_fingerprint_changed");
  if (report.constitutionVersion !== current.constitutionVersion)
    reasons.push("constitution_version_changed");
  if (report.constitutionFingerprint !== constitution.fingerprint)
    reasons.push("constitution_fingerprint_changed");
  if (
    JSON.stringify(report.normalization.normalizedInput.revision.sourceFingerprints) !==
    JSON.stringify(current.revision.sourceFingerprints)
  )
    reasons.push("source_fingerprints_changed");
  if (
    JSON.stringify(report.normalization.normalizedInput.revision.dependencyFingerprints) !==
    JSON.stringify(current.revision.dependencyFingerprints)
  )
    reasons.push("dependency_fingerprints_changed");
  return { status: reasons.length === 0 ? "current" : "stale", reasons: reasons.sort() };
}
