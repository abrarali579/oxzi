import type { GovernanceFinding, SpecificationGovernanceInput } from "./runtime-schemas";
import {
  GOVERNANCE_EVALUATOR_VERSIONS,
  createGovernanceFinding,
  normalizedText,
  sortFindings,
} from "./runtime-utils";

const subjectiveTerms =
  /\b(good|great|easy|intuitive|seamless|user[- ]friendly|works? well|appropriate|fast|responsive)\b/i;
const observableTerms =
  /\b(displays?|returns?|creates?|prevents?|rejects?|accepts?|passes?|fails?|exits?|stores?|deletes?|exports?|imports?|matches?|equals?|contains?|records?|redirects?|responds?)\b/i;

export function analyzeSpecificationTestability(
  input: SpecificationGovernanceInput,
): GovernanceFinding[] {
  const findings: GovernanceFinding[] = [];
  const criteria = new Map(
    input.specification.acceptanceCriteria.map((criterion) => [criterion.id, criterion]),
  );

  for (const requirement of input.requirements.filter(
    (candidate) => candidate.scopeState === "included",
  )) {
    for (const criterionId of requirement.acceptanceCriterionIds) {
      const criterion = criteria.get(criterionId);
      if (!criterion) continue;
      const statement = normalizedText(criterion.statement);
      const requirementStatement = normalizedText(requirement.statement);
      const base = {
        category: "testability" as const,
        evidenceRefs: criterion.evidenceRefs,
        affectedEntityIds: [requirement.id, criterion.id],
        evaluatorVersion: GOVERNANCE_EVALUATOR_VERSIONS.testabilityAnalyzer,
      };

      if (subjectiveTerms.test(statement))
        findings.push(
          createGovernanceFinding({
            ...base,
            ruleId: "testability.observable_result",
            severity: "blocking",
            message: `Acceptance criterion ${criterion.id} uses subjective language without a defined threshold`,
            remediation:
              "Replace subjective terms with an observable result and explicit boundary.",
          }),
        );
      if (!observableTerms.test(statement))
        findings.push(
          createGovernanceFinding({
            ...base,
            ruleId: "testability.expected_result",
            severity: "blocking",
            message: `Acceptance criterion ${criterion.id} has no deterministic expected result`,
            remediation: "State the observable result that proves the criterion passed.",
          }),
        );
      if (statement === requirementStatement)
        findings.push(
          createGovernanceFinding({
            ...base,
            ruleId: "testability.requirement_restatement",
            severity: "blocking",
            message: `Acceptance criterion ${criterion.id} only restates its requirement`,
            remediation: "Define independently observable pass and failure evidence.",
          }),
        );
      if (criterion.verificationRefs.length === 0)
        findings.push(
          createGovernanceFinding({
            ...base,
            ruleId: "testability.verification_method",
            severity: "blocking",
            message: `Acceptance criterion ${criterion.id} has no validation method`,
            remediation: "Reference a deterministic test, inspection, or validation method.",
          }),
        );
      if (criterion.evidenceRefs.length === 0)
        findings.push(
          createGovernanceFinding({
            ...base,
            ruleId: "testability.evidence_available",
            severity: "blocking",
            message: `Acceptance criterion ${criterion.id} has no available evidence reference`,
            remediation: "Attach evidence that the configured validation method can inspect.",
          }),
        );
      if (
        ["confidential", "restricted"].includes(requirement.privacyClassification ?? "") &&
        !criterion.verificationRefs.some((reference) => /security|privacy/i.test(reference))
      )
        findings.push(
          createGovernanceFinding({
            ...base,
            ruleId: "testability.security_privacy_validation",
            severity: "blocking",
            message: `Acceptance criterion ${criterion.id} lacks required security or privacy validation`,
            remediation: "Add an explicit security or privacy validation reference.",
          }),
        );
    }
  }

  return sortFindings(findings);
}
