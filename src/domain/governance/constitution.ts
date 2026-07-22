import { stableJson, type JsonValue } from "../knowledge-graph";
import {
  constitutionComplianceResultSchema,
  resolvedConstitutionSchema,
  type ConstitutionComplianceResult,
  type GovernanceFinding,
  type ResolvedConstitution,
  type SpecificationGovernanceInput,
} from "./runtime-schemas";
import {
  GOVERNANCE_EVALUATOR_VERSIONS,
  asFingerprint,
  createConstitutionResolutionId,
  createGovernanceFinding,
  sortFindings,
} from "./runtime-utils";

const authorityRank = { global: 3, project: 2, specification: 1 } as const;

export function resolveProjectConstitution(
  input: SpecificationGovernanceInput,
): ResolvedConstitution {
  const findings: GovernanceFinding[] = [];
  const applicable = input.constitutionRules.filter((binding) => {
    const rule = binding.rule;
    if (rule.projectId !== input.specification.projectId) return false;
    if (rule.effectiveVersion !== input.revision.canonicalVersionId) return false;
    if (rule.temporal.currentStatus !== "current") return false;
    if (rule.applicability.includes("unknown")) {
      findings.push(
        createGovernanceFinding({
          ruleId: "constitution.applicability_unknown",
          category: "constitution",
          severity: rule.severity === "advisory" ? "warning" : "blocking",
          message: `Constitution rule ${rule.id} has unknown applicability`,
          evidenceRefs: rule.evidenceRefs,
          affectedEntityIds: [rule.id, input.specification.id],
          remediation: "Resolve applicability for this exact specification and lifecycle version.",
          evaluatorVersion: GOVERNANCE_EVALUATOR_VERSIONS.constitutionResolver,
        }),
      );
    }
    if (rule.approvalStatus !== "approved") {
      findings.push(
        createGovernanceFinding({
          ruleId: "constitution.rule_approval",
          category: "constitution",
          severity: rule.severity === "advisory" ? "warning" : "blocking",
          message: `Constitution rule ${rule.id} is not approved`,
          evidenceRefs: rule.evidenceRefs,
          affectedEntityIds: [rule.id],
          remediation: "Obtain explicit approval or remove the rule from the active snapshot.",
          evaluatorVersion: GOVERNANCE_EVALUATOR_VERSIONS.constitutionResolver,
        }),
      );
      return false;
    }
    if (rule.freshness !== "current") {
      findings.push(
        createGovernanceFinding({
          ruleId: "constitution.rule_freshness",
          category: "freshness",
          severity: rule.severity === "advisory" ? "warning" : "blocking",
          message: `Constitution rule ${rule.id} is ${rule.freshness}`,
          evidenceRefs: rule.evidenceRefs,
          affectedEntityIds: [rule.id],
          remediation: "Refresh rule evidence for the evaluated canonical version.",
          evaluatorVersion: GOVERNANCE_EVALUATOR_VERSIONS.constitutionResolver,
        }),
      );
    }
    return true;
  });

  if (applicable.length === 0)
    findings.push(
      createGovernanceFinding({
        ruleId: "constitution.context_required",
        category: "constitution",
        severity: "blocking",
        message: "No approved Constitution rules apply to this specification version",
        evidenceRefs: [],
        affectedEntityIds: [input.specification.id],
        remediation: "Supply the approved versioned Constitution snapshot before evaluation.",
        evaluatorVersion: GOVERNANCE_EVALUATOR_VERSIONS.constitutionResolver,
      }),
    );

  const byPolicySubject = new Map<string, typeof applicable>();
  for (const binding of applicable) {
    const key = `${binding.policyKey}\u0000${binding.subject}`;
    const list = byPolicySubject.get(key) ?? [];
    list.push(binding);
    byPolicySubject.set(key, list);
  }
  for (const bindings of byPolicySubject.values()) {
    const effects = new Set(bindings.map((binding) => binding.effect));
    if (effects.size < 2) continue;
    const ordered = [...bindings].sort(
      (left, right) =>
        authorityRank[right.authority] - authorityRank[left.authority] ||
        left.rule.id.localeCompare(right.rule.id),
    );
    findings.push(
      createGovernanceFinding({
        ruleId: "constitution.authority_conflict",
        category: "constitution",
        severity: "blocking",
        message: `Conflicting Constitution effects exist for ${ordered[0]?.subject}; lower authority cannot override ${ordered[0]?.authority}`,
        evidenceRefs: ordered.flatMap((binding) => binding.rule.evidenceRefs),
        affectedEntityIds: ordered.map((binding) => binding.rule.id),
        remediation:
          "Resolve the conflict through an approved version-specific exception or rule amendment.",
        evaluatorVersion: GOVERNANCE_EVALUATOR_VERSIONS.constitutionResolver,
      }),
    );
  }

  const applicableRuleIds = new Set(applicable.map((binding) => binding.rule.id));
  const appliedExceptionIds = [];
  for (const exception of input.constitutionExceptions) {
    if (!applicableRuleIds.has(exception.ruleId)) continue;
    const correctVersion =
      exception.specificationId === input.specification.id &&
      exception.specificationVersion === input.specification.version;
    const binding = applicable.find((candidate) => candidate.rule.id === exception.ruleId);
    const correctScope =
      binding !== undefined &&
      exception.scopeRefs.some((scope) =>
        [input.specification.id, binding.policyKey, binding.subject].includes(scope),
      );
    const approved =
      exception.approvalStatus === "approved" &&
      exception.approvedAt !== null &&
      exception.approvedBy !== null;
    if (correctVersion && correctScope && approved) appliedExceptionIds.push(exception.id);
    else
      findings.push(
        createGovernanceFinding({
          ruleId: "constitution.exception_authorization",
          category: "constitution",
          severity: "blocking",
          message: `Constitution exception ${exception.id} is unapproved or has invalid version/scope`,
          evidenceRefs: exception.evidenceRefs,
          affectedEntityIds: [exception.id, exception.ruleId],
          remediation:
            "Approve an exception that explicitly targets this exact specification version.",
          evaluatorVersion: GOVERNANCE_EVALUATOR_VERSIONS.constitutionResolver,
        }),
      );
  }

  const rules = [...applicable].sort(
    (left, right) =>
      authorityRank[right.authority] - authorityRank[left.authority] ||
      left.policyKey.localeCompare(right.policyKey) ||
      left.rule.id.localeCompare(right.rule.id),
  );
  const sourceFingerprint = asFingerprint({
    canonicalVersionId: input.revision.canonicalVersionId,
    constitutionVersion: input.constitutionVersion,
    rules,
    exceptions: input.constitutionExceptions,
  } as unknown as JsonValue);
  const semantic = {
    projectId: input.specification.projectId,
    canonicalVersionId: input.revision.canonicalVersionId,
    constitutionVersion: input.constitutionVersion,
    rules,
    appliedExceptionIds: [...appliedExceptionIds].sort(),
    findings: sortFindings(findings),
    sourceFingerprint,
  };
  return resolvedConstitutionSchema.parse({
    id: createConstitutionResolutionId(semantic),
    ...semantic,
    fingerprint: asFingerprint(semantic as unknown as JsonValue),
  });
}

export function evaluateConstitutionCompliance(
  input: SpecificationGovernanceInput,
  constitution: ResolvedConstitution,
): ConstitutionComplianceResult[] {
  const evidenceByRule = new Map(
    input.complianceEvidence.map((evidence) => [evidence.ruleId, evidence]),
  );
  const exceptionRuleIds = new Set(
    input.constitutionExceptions
      .filter((exception) => constitution.appliedExceptionIds.includes(exception.id))
      .map((exception) => exception.ruleId),
  );
  return constitution.rules
    .map((binding) => {
      const evidence = evidenceByRule.get(binding.rule.id);
      const excepted = exceptionRuleIds.has(binding.rule.id);
      let status: "pass" | "fail" | "unknown" | "not_applicable";
      let explanation: string;
      let evidenceRefs: string[];
      let affectedSpecificationEntityIds: string[];
      if (excepted) {
        status = "not_applicable";
        explanation = "An approved version-specific Constitution exception applies.";
        evidenceRefs = input.constitutionExceptions
          .filter((exception) => exception.ruleId === binding.rule.id)
          .flatMap((exception) => exception.evidenceRefs);
        affectedSpecificationEntityIds = [input.specification.id];
      } else if (!evidence) {
        status = "unknown";
        explanation = "Mandatory compliance evidence is unavailable.";
        evidenceRefs = [];
        affectedSpecificationEntityIds = [input.specification.id];
      } else {
        status = evidence.status;
        explanation = evidence.explanation;
        evidenceRefs = evidence.evidenceRefs;
        affectedSpecificationEntityIds = evidence.affectedEntityIds;
      }
      const blocking = binding.rule.severity !== "advisory" && ["fail", "unknown"].includes(status);
      return constitutionComplianceResultSchema.parse({
        ruleId: binding.rule.id,
        policyKey: binding.policyKey,
        status,
        evidenceRefs: [...new Set(evidenceRefs)].sort(),
        affectedSpecificationEntityIds: [...new Set(affectedSpecificationEntityIds)].sort(),
        explanation,
        remediation:
          status === "fail"
            ? binding.rule.violationConsequence
            : status === "unknown"
              ? `Provide evidence using ${binding.rule.verificationMethod}.`
              : "No remediation required.",
        evaluatorVersion: GOVERNANCE_EVALUATOR_VERSIONS.complianceEvaluator,
        blocking,
      });
    })
    .sort(
      (left, right) =>
        left.policyKey.localeCompare(right.policyKey) || left.ruleId.localeCompare(right.ruleId),
    );
}

export function serializeResolvedConstitution(constitution: ResolvedConstitution): string {
  return stableJson(constitution as unknown as JsonValue);
}
