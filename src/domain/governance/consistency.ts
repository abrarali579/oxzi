import type {
  ClarificationNeed,
  GovernanceFinding,
  SpecificationGovernanceInput,
} from "./runtime-schemas";
import {
  GOVERNANCE_EVALUATOR_VERSIONS,
  createGovernanceFinding,
  normalizedText,
  sortFindings,
} from "./runtime-utils";

function findDependencyCycles(input: SpecificationGovernanceInput): string[][] {
  const dependencies = new Map<string, readonly string[]>(
    input.requirements.map((requirement) => [requirement.id, requirement.dependencyRequirementIds]),
  );
  const cycles: string[][] = [];
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const path: string[] = [];
  const visit = (id: string) => {
    if (visiting.has(id)) {
      const start = path.indexOf(id);
      cycles.push([...path.slice(start), id]);
      return;
    }
    if (visited.has(id)) return;
    visiting.add(id);
    path.push(id);
    for (const dependency of dependencies.get(id) ?? []) visit(dependency);
    path.pop();
    visiting.delete(id);
    visited.add(id);
  };
  [...dependencies.keys()].sort().forEach(visit);
  return cycles;
}

export function analyzeSpecificationConsistency(
  input: SpecificationGovernanceInput,
  clarifications: ClarificationNeed[],
): GovernanceFinding[] {
  const findings: GovernanceFinding[] = [];
  const byId = new Map<string, (typeof input.requirements)[number]>(
    input.requirements.map((requirement) => [requirement.id, requirement]),
  );

  for (const requirement of input.requirements) {
    for (const contradictedId of requirement.contradictsRequirementIds) {
      if (!byId.has(contradictedId)) continue;
      findings.push(
        createGovernanceFinding({
          ruleId: "consistency.direct_requirement_contradiction",
          category: "consistency",
          severity: "blocking",
          message: `Requirements ${requirement.id} and ${contradictedId} directly contradict`,
          evidenceRefs: [
            ...requirement.evidenceRefs,
            ...(byId.get(contradictedId)?.evidenceRefs ?? []),
          ],
          affectedEntityIds: [requirement.id, contradictedId],
          remediation:
            "Resolve the conflict through an explicit decision and a new specification version.",
          evaluatorVersion: GOVERNANCE_EVALUATOR_VERSIONS.consistencyAnalyzer,
        }),
      );
    }
    for (const criterionId of requirement.contradictoryCriterionIds)
      findings.push(
        createGovernanceFinding({
          ruleId: "consistency.criterion_requirement_contradiction",
          category: "consistency",
          severity: "blocking",
          message: `Criterion ${criterionId} contradicts requirement ${requirement.id}`,
          evidenceRefs: requirement.evidenceRefs,
          affectedEntityIds: [requirement.id, criterionId],
          remediation:
            "Align the criterion with the requirement or amend the requirement explicitly.",
          evaluatorVersion: GOVERNANCE_EVALUATOR_VERSIONS.consistencyAnalyzer,
        }),
      );
  }

  for (const included of input.specification.scope)
    for (const excluded of input.specification.exclusions)
      if (normalizedText(included) === normalizedText(excluded))
        findings.push(
          createGovernanceFinding({
            ruleId: "consistency.included_and_excluded",
            category: "consistency",
            severity: "blocking",
            message: `Scope item “${included}” is both included and excluded`,
            evidenceRefs: input.specification.evidenceRefs,
            affectedEntityIds: [input.specification.id],
            remediation: "Select exactly one explicit scope state.",
            evaluatorVersion: GOVERNANCE_EVALUATOR_VERSIONS.consistencyAnalyzer,
          }),
        );

  for (const cycle of findDependencyCycles(input))
    findings.push(
      createGovernanceFinding({
        ruleId: "consistency.dependency_cycle",
        category: "consistency",
        severity: "blocking",
        message: `Requirement dependency cycle detected: ${cycle.join(" → ")}`,
        evidenceRefs: cycle.flatMap((id) => byId.get(id)?.evidenceRefs ?? []),
        affectedEntityIds: cycle,
        remediation: "Break the cycle or document an allowed coupled boundary in a new version.",
        evaluatorVersion: GOVERNANCE_EVALUATOR_VERSIONS.consistencyAnalyzer,
      }),
    );

  const statements = new Map<string, string[]>();
  for (const requirement of input.requirements) {
    const key = normalizedText(requirement.statement);
    const ids = statements.get(key) ?? [];
    ids.push(requirement.id);
    statements.set(key, ids);
  }
  for (const ids of statements.values())
    if (ids.length > 1)
      findings.push(
        createGovernanceFinding({
          ruleId: "consistency.exact_duplicate_meaning",
          category: "consistency",
          severity: "warning",
          message: `Requirements ${ids.join(", ")} have exactly duplicated normalized meaning`,
          evidenceRefs: ids.flatMap((id) => byId.get(id)?.evidenceRefs ?? []),
          affectedEntityIds: ids,
          remediation: "Merge exact duplicates or document why distinct identities are required.",
          evaluatorVersion: GOVERNANCE_EVALUATOR_VERSIONS.consistencyAnalyzer,
        }),
      );

  if (
    input.revision.lifecycle === "implementation_ready" &&
    clarifications.some((clarification) => clarification.blocking)
  )
    findings.push(
      createGovernanceFinding({
        ruleId: "consistency.ready_with_blocking_clarification",
        category: "consistency",
        severity: "blocking",
        message:
          "Specification is marked implementation-ready while blocking clarification remains",
        evidenceRefs: clarifications.flatMap((clarification) => clarification.evidenceRefs),
        affectedEntityIds: [input.specification.id],
        remediation: "Return to clarification or resolve the blocking questions before readiness.",
        evaluatorVersion: GOVERNANCE_EVALUATOR_VERSIONS.consistencyAnalyzer,
      }),
    );

  if (input.revision.lifecycle === "completed" && input.revision.completedEvidenceRefs.length === 0)
    findings.push(
      createGovernanceFinding({
        ruleId: "consistency.completed_requires_evidence",
        category: "consistency",
        severity: "blocking",
        message: "Completed specification has no required completion evidence",
        evidenceRefs: [],
        affectedEntityIds: [input.specification.id],
        remediation:
          "Attach validation, review, and convergence evidence or correct the lifecycle.",
        evaluatorVersion: GOVERNANCE_EVALUATOR_VERSIONS.consistencyAnalyzer,
      }),
    );

  for (const link of input.traceabilityLinks)
    if (link.freshness !== "current")
      findings.push(
        createGovernanceFinding({
          ruleId: "consistency.stale_version_reference",
          category: "freshness",
          severity: link.freshness === "stale" ? "blocking" : "warning",
          message: `Traceability link ${link.id} is ${link.freshness}`,
          evidenceRefs: link.evidenceRefs,
          affectedEntityIds: [link.id, link.fromId, link.toId],
          remediation: "Refresh the link against current artifact versions.",
          evaluatorVersion: GOVERNANCE_EVALUATOR_VERSIONS.consistencyAnalyzer,
        }),
      );

  return sortFindings(findings);
}
