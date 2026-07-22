import { canonicalProjectFingerprint } from "../knowledge-graph";
import {
  freshnessEvaluationSchema,
  type FreshnessEvaluation,
  type NormalizationResult,
  type ResolvedConstitution,
} from "./runtime-schemas";
import {
  GOVERNANCE_EVALUATOR_VERSIONS,
  createGovernanceFinding,
  sortFindings,
} from "./runtime-utils";

export function evaluateSpecificationFreshness(
  normalization: NormalizationResult,
  constitution: ResolvedConstitution,
): FreshnessEvaluation {
  const input = normalization.normalizedInput;
  const findings = [];
  const passedCheckIds: string[] = [];
  const failedCheckIds: string[] = [];
  const unknownCheckIds: string[] = [];
  const actualCanonicalFingerprint = canonicalProjectFingerprint(input.canonicalProject);

  const checks = [
    ["freshness.specification_fingerprint", normalization.declaredFingerprintMatches],
    [
      "freshness.canonical_version",
      input.revision.canonicalVersionId === input.canonicalProject.metadata.version.id,
    ],
    [
      "freshness.canonical_fingerprint",
      input.revision.canonicalFingerprint === actualCanonicalFingerprint,
    ],
    ["freshness.not_marked_stale", input.revision.staleSince === null],
    ["freshness.not_superseded", input.revision.lifecycle !== "superseded"],
  ] as const;
  for (const [ruleId, passed] of checks) {
    (passed ? passedCheckIds : failedCheckIds).push(ruleId);
    if (!passed)
      findings.push(
        createGovernanceFinding({
          ruleId,
          category: "freshness",
          severity: "blocking",
          message: `Authoritative freshness check ${ruleId} failed`,
          evidenceRefs: input.specification.evidenceRefs,
          affectedEntityIds: [input.specification.id],
          remediation: "Re-evaluate the exact current authoritative versions and fingerprints.",
          evaluatorVersion: GOVERNANCE_EVALUATOR_VERSIONS.freshnessEvaluator,
        }),
      );
  }

  if (input.revision.sourceFingerprints.length === 0) unknownCheckIds.push("freshness.sources");
  else passedCheckIds.push("freshness.sources");
  if (input.revision.dependencyFingerprints.length === 0)
    unknownCheckIds.push("freshness.dependencies");
  else passedCheckIds.push("freshness.dependencies");
  if (constitution.rules.some((binding) => binding.rule.freshness === "unknown"))
    unknownCheckIds.push("freshness.constitution_rules");
  else passedCheckIds.push("freshness.constitution_rules");

  return freshnessEvaluationSchema.parse({
    status:
      failedCheckIds.length > 0 ? "stale" : unknownCheckIds.length > 0 ? "unknown" : "current",
    specificationVersion: input.specification.version,
    constitutionVersion: constitution.constitutionVersion,
    canonicalVersionId: input.revision.canonicalVersionId,
    inputFingerprints: {
      specification: normalization.fingerprint,
      constitution: constitution.fingerprint,
      canonical: actualCanonicalFingerprint,
    },
    passedCheckIds: passedCheckIds.sort(),
    failedCheckIds: failedCheckIds.sort(),
    unknownCheckIds: unknownCheckIds.sort(),
    findings: sortFindings(findings),
    evaluatorVersion: GOVERNANCE_EVALUATOR_VERSIONS.freshnessEvaluator,
  });
}
