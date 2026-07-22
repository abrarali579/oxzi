import { describe, expect, it } from "vitest";

import { contentFingerprint } from "../knowledge-graph";
import {
  acceptanceCriterionIdSchema,
  constitutionExceptionSchema,
  constitutionRuleBindingSchema,
  governanceReportSchema,
  specificationGovernanceInputSchema,
  specificationIdSchema,
} from ".";
import {
  ambiguousRequirementSpecificationFixture,
  ambiguousSuccessSpecificationFixture,
  brokenTraceabilitySpecificationFixture,
  constitutionViolationSpecificationFixture,
  contradictoryRequirementsSpecificationFixture,
  draftAmendmentSpecificationFixture,
  implementationReadySpecificationFixture,
  includeExcludeConflictSpecificationFixture,
  nonBlockingWarningSpecificationFixture,
  privacyValidationRequiredSpecificationFixture,
  staleSpecificationEvaluationFixture,
  structurallyIncompleteSpecificationFixture,
  unauthorizedExceptionSpecificationFixture,
  unknownConstitutionEvidenceSpecificationFixture,
  unverifiableAcceptanceSpecificationFixture,
} from "./fixtures";
import {
  analyzeClarifications,
  analyzeSpecificationConsistency,
  analyzeSpecificationTraceability,
  analyzeSpecificationTestability,
  assessGovernanceReportFreshness,
  calculateNormalizedSpecificationFingerprint,
  evaluateConstitutionCompliance,
  evaluateSpecificationGovernance,
  evaluateSpecificationFreshness,
  normalizeSpecification,
  resolveProjectConstitution,
  serializeGovernanceReportSemantic,
  validateSpecificationAmendment,
  validateSpecificationStructure,
} from ".";
import type { SpecificationGovernanceInput } from ".";

function clone(input: SpecificationGovernanceInput): SpecificationGovernanceInput {
  return structuredClone(input);
}

function refingerprint(input: SpecificationGovernanceInput): SpecificationGovernanceInput {
  input.specification.fingerprint = calculateNormalizedSpecificationFingerprint(input);
  return specificationGovernanceInputSchema.parse(input);
}

describe("Specification normalization", () => {
  it("1. normalizes deterministically", () => {
    const input = clone(implementationReadySpecificationFixture);
    input.specification.scope.push(input.specification.scope[0]!);
    const first = normalizeSpecification(input);
    const second = normalizeSpecification(input);
    expect(first.normalizedInput).toEqual(second.normalizedInput);
    expect(first.actions).toContain("deduplicated:specification.scope");
  });

  it("2. produces a stable fingerprint", () => {
    expect(normalizeSpecification(implementationReadySpecificationFixture).fingerprint).toBe(
      normalizeSpecification(clone(implementationReadySpecificationFixture)).fingerprint,
    );
  });

  it("3. rejects conflicting duplicate requirement IDs", () => {
    const input = clone(implementationReadySpecificationFixture);
    input.requirements.push({ ...input.requirements[0]!, statement: "Conflicting meaning" });
    const result = normalizeSpecification(input);
    expect(
      result.blockingErrors.some((finding) => finding.ruleId === "structure.unique_requirement_id"),
    ).toBe(true);
  });

  it("4. preserves unresolved state", () => {
    const input = clone(implementationReadySpecificationFixture);
    input.requirements[0]!.scopeState = "undecided";
    input.requirements[0]!.unresolvedQuestions = ["Include export now?"];
    const result = normalizeSpecification(refingerprint(input));
    expect(result.normalizedInput.requirements[0]?.scopeState).toBe("undecided");
    expect(result.normalizedInput.requirements[0]?.unresolvedQuestions).toEqual([
      "Include export now?",
    ]);
  });

  it("5. does not invent values", () => {
    const input = clone(ambiguousRequirementSpecificationFixture);
    const result = normalizeSpecification(input);
    expect(result.normalizedInput.requirements[0]?.actor).toBeNull();
    expect(result.normalizedInput.requirements).toHaveLength(input.requirements.length);
  });
});

describe("Structural validation", () => {
  it("6. blocks missing required governance fields", () => {
    expect(
      evaluateSpecificationGovernance(structurallyIncompleteSpecificationFixture).readiness
        .decision,
    ).toBe("not_ready");
  });

  it("7. rejects duplicate requirement IDs", () => {
    const input = clone(implementationReadySpecificationFixture);
    input.requirements.push({ ...input.requirements[0]!, action: "duplicates" });
    expect(
      normalizeSpecification(input).blockingErrors.some(
        (finding) => finding.ruleId === "structure.unique_requirement_id",
      ),
    ).toBe(true);
  });

  it("8. detects missing acceptance criteria", () => {
    const findings = validateSpecificationStructure(structurallyIncompleteSpecificationFixture);
    expect(
      findings.some((finding) => finding.ruleId === "structure.acceptance_criteria_required"),
    ).toBe(true);
  });

  it("9. detects broken references", () => {
    const input = clone(implementationReadySpecificationFixture);
    input.requirements[0]!.acceptanceCriterionIds = [
      acceptanceCriterionIdSchema.parse("criterion_missing"),
    ];
    const findings = validateSpecificationStructure(refingerprint(input));
    expect(
      findings.some((finding) => finding.ruleId === "structure.acceptance_reference_exists"),
    ).toBe(true);
  });

  it("10. returns stable finding order", () => {
    const first = validateSpecificationStructure(structurallyIncompleteSpecificationFixture);
    const second = validateSpecificationStructure(
      clone(structurallyIncompleteSpecificationFixture),
    );
    expect(first.map((finding) => finding.id)).toEqual(second.map((finding) => finding.id));
  });
});

describe("Project Constitution", () => {
  it("11. resolves the correct Constitution", () => {
    const resolved = resolveProjectConstitution(implementationReadySpecificationFixture);
    expect(resolved.rules.map((binding) => binding.rule.id)).toEqual(["constitution_rule_testing"]);
  });

  it("12. prevents lower authority from silently overriding higher authority", () => {
    const input = clone(implementationReadySpecificationFixture);
    input.constitutionRules.push(
      constitutionRuleBindingSchema.parse({
        ...input.constitutionRules[0],
        rule: {
          ...input.constitutionRules[0]!.rule,
          id: "constitution_rule_project_testing",
          fingerprint: contentFingerprint({ rule: "project-testing" }),
        },
        authority: "project",
        effect: "forbid",
      }),
    );
    expect(
      resolveProjectConstitution(input).findings.some(
        (finding) => finding.ruleId === "constitution.authority_conflict",
      ),
    ).toBe(true);
  });

  it("13. rejects an unapproved exception", () => {
    expect(
      resolveProjectConstitution(unauthorizedExceptionSpecificationFixture).findings.some(
        (finding) => finding.ruleId === "constitution.exception_authorization",
      ),
    ).toBe(true);
  });

  it("14. blocks readiness after mandatory rule failure", () => {
    expect(
      evaluateSpecificationGovernance(constitutionViolationSpecificationFixture).readiness.decision,
    ).toBe("not_ready");
  });

  it("15. keeps unknown mandatory evidence from passing", () => {
    const constitution = resolveProjectConstitution(
      unknownConstitutionEvidenceSpecificationFixture,
    );
    const results = evaluateConstitutionCompliance(
      unknownConstitutionEvidenceSpecificationFixture,
      constitution,
    );
    expect(results[0]?.status).toBe("unknown");
    expect(results[0]?.blocking).toBe(true);
    expect(
      evaluateSpecificationGovernance(
        unknownConstitutionEvidenceSpecificationFixture,
      ).health.dimensions.find((dimension) => dimension.dimension === "constitutional_compliance")
        ?.result,
    ).toBe("unknown");
  });

  it("16. records the exact Constitution version", () => {
    const report = evaluateSpecificationGovernance(implementationReadySpecificationFixture);
    expect(report.constitutionVersion).toBe("constitution-1.0.0");
  });
});

describe("Clarification analysis", () => {
  it("17. detects ambiguous actors", () => {
    expect(analyzeClarifications(ambiguousRequirementSpecificationFixture)[0]?.category).toBe(
      "ambiguous_actor",
    );
  });

  it("18. detects an unverifiable success condition", () => {
    expect(
      analyzeClarifications(unverifiableAcceptanceSpecificationFixture).some(
        (need) => need.category === "unverifiable_acceptance_criterion",
      ),
    ).toBe(true);
  });

  it("19. groups related issues into one useful question", () => {
    const input = clone(ambiguousRequirementSpecificationFixture);
    input.requirements[0]!.action = null;
    input.requirements[0]!.object = null;
    const core = analyzeClarifications(refingerprint(input)).filter((need) =>
      need.category.startsWith("ambiguous_"),
    );
    expect(core).toHaveLength(1);
    expect(core[0]?.question).toContain("Who performs what action");
  });

  it("20. does not let non-blocking clarification block health", () => {
    const report = evaluateSpecificationGovernance(nonBlockingWarningSpecificationFixture);
    expect(report.clarificationNeeds.some((need) => !need.blocking)).toBe(true);
    expect(report.readiness.decision).toBe("readiness_recommended");
  });
});

describe("Consistency analysis", () => {
  it("21. detects direct contradiction", () => {
    const report = evaluateSpecificationGovernance(contradictoryRequirementsSpecificationFixture);
    expect(
      report.consistencyFindings.some(
        (finding) => finding.ruleId === "consistency.direct_requirement_contradiction",
      ),
    ).toBe(true);
  });

  it("22. detects included and excluded scope conflict", () => {
    const input = clone(implementationReadySpecificationFixture);
    input.specification.exclusions.push("Markdown export");
    const report = evaluateSpecificationGovernance(refingerprint(input));
    expect(
      report.consistencyFindings.some(
        (finding) => finding.ruleId === "consistency.included_and_excluded",
      ),
    ).toBe(true);
  });

  it("23. detects stale version references", () => {
    const input = clone(implementationReadySpecificationFixture);
    input.traceabilityLinks[0]!.freshness = "stale";
    expect(
      analyzeSpecificationConsistency(refingerprint(input), []).some(
        (finding) => finding.ruleId === "consistency.stale_version_reference",
      ),
    ).toBe(true);
  });

  it("24. rejects implementation-ready state with blocking question", () => {
    const input = clone(ambiguousRequirementSpecificationFixture);
    input.revision.lifecycle = "implementation_ready";
    const report = evaluateSpecificationGovernance(refingerprint(input));
    expect(
      report.consistencyFindings.some(
        (finding) => finding.ruleId === "consistency.ready_with_blocking_clarification",
      ),
    ).toBe(true);
  });
});

describe("Traceability analysis", () => {
  it("25. detects orphan requirements", () => {
    const input = clone(implementationReadySpecificationFixture);
    input.requirements[0]!.specificationId = specificationIdSchema.parse("spec_other");
    expect(
      analyzeSpecificationTraceability(refingerprint(input)).some(
        (finding) => finding.ruleId === "traceability.orphan_requirement",
      ),
    ).toBe(true);
  });

  it("26. does not require downstream artifacts before their lifecycle stage", () => {
    expect(
      analyzeSpecificationTraceability(implementationReadySpecificationFixture).some((finding) =>
        finding.ruleId.includes("required_by_lifecycle"),
      ),
    ).toBe(false);
  });

  it("27. blocks broken mandatory links", () => {
    const report = evaluateSpecificationGovernance(brokenTraceabilitySpecificationFixture);
    expect(report.traceabilityFindings.some((finding) => finding.severity === "blocking")).toBe(
      true,
    );
    expect(report.readiness.decision).toBe("not_ready");
  });
});

describe("Health and readiness", () => {
  it("28. recommends readiness for a valid specification", () => {
    expect(
      evaluateSpecificationGovernance(implementationReadySpecificationFixture).readiness.decision,
    ).toBe("readiness_recommended");
  });

  it("29. lets a blocking issue prevent readiness", () => {
    expect(
      evaluateSpecificationGovernance(contradictoryRequirementsSpecificationFixture).health.status,
    ).not.toBe("healthy");
  });

  it("30. exposes evidence for every health dimension", () => {
    const dimensions = evaluateSpecificationGovernance(implementationReadySpecificationFixture)
      .health.dimensions;
    expect(dimensions).toHaveLength(8);
    expect(dimensions.every((dimension) => dimension.calculationInputs.length > 0)).toBe(true);
  });

  it("31. prevents stale evaluation from certifying changed input", () => {
    expect(
      evaluateSpecificationGovernance(staleSpecificationEvaluationFixture).readiness.decision,
    ).toBe("stale");
  });

  it("32. keeps human approval required", () => {
    expect(
      evaluateSpecificationGovernance(implementationReadySpecificationFixture).readiness
        .humanApprovalRequired,
    ).toBe(true);
  });
});

describe("Controlled Living Specifications", () => {
  it("33. prevents approved-version mutation", () => {
    const previous = clone(implementationReadySpecificationFixture);
    const changed = clone(previous);
    changed.specification.title = "Mutated title";
    const findings = validateSpecificationAmendment(
      previous,
      normalizeSpecification(refingerprint(changed)),
    );
    expect(
      findings.some((finding) => finding.ruleId === "controlled_living.approved_version_immutable"),
    ).toBe(true);
  });

  it("34. accepts a draft amendment as a new version", () => {
    const { previous, next } = draftAmendmentSpecificationFixture;
    expect(validateSpecificationAmendment(previous, normalizeSpecification(next))).toEqual([]);
    expect(next.specification.version).toBe(2);
  });

  it("35. keeps the previous version traceable", () => {
    const { previous, next } = draftAmendmentSpecificationFixture;
    expect(next.revision.parentSpecificationVersion).toBe(previous.specification.version);
    expect(next.revision.parentSpecificationFingerprint).toBe(previous.specification.fingerprint);
  });

  it("36. marks an old evaluation stale after authoritative change", () => {
    const report = evaluateSpecificationGovernance(implementationReadySpecificationFixture);
    expect(
      assessGovernanceReportFreshness(report, draftAmendmentSpecificationFixture.next).status,
    ).toBe("stale");
  });
});

describe("Governance report", () => {
  it("37. produces a complete normalized report", () => {
    const report = evaluateSpecificationGovernance(implementationReadySpecificationFixture);
    expect(governanceReportSchema.parse(report)).toEqual(report);
    expect(report.health.baseResult.planningMayProceed).toBe(true);
  });

  it("38. serializes semantic results deterministically across timestamps", () => {
    const first = evaluateSpecificationGovernance(implementationReadySpecificationFixture);
    const laterInput = clone(implementationReadySpecificationFixture);
    laterInput.evaluationTimestamp = "2026-07-24T00:00:00.000Z";
    const second = evaluateSpecificationGovernance(laterInput);
    expect(first.semanticFingerprint).toBe(second.semanticFingerprint);
    expect(serializeGovernanceReportSemantic(first)).toBe(
      serializeGovernanceReportSemantic(second),
    );
  });

  it("39. includes every evaluator version", () => {
    const versions = evaluateSpecificationGovernance(
      implementationReadySpecificationFixture,
    ).evaluatorVersions;
    expect(Object.values(versions)).toHaveLength(12);
    expect(Object.values(versions).every(Boolean)).toBe(true);
  });

  it("40. does not mutate canonical or governance input", () => {
    const input = clone(implementationReadySpecificationFixture);
    const before = JSON.stringify(input);
    evaluateSpecificationGovernance(input);
    expect(JSON.stringify(input)).toBe(before);
  });

  it("41. rejects invalid governance records", () => {
    expect(() =>
      governanceReportSchema.parse({
        ...evaluateSpecificationGovernance(implementationReadySpecificationFixture),
        specificationVersion: 0,
      }),
    ).toThrow();
  });
});

describe("Expanded governance runtime contract", () => {
  it("42. deduplicates exact references", () => {
    const input = clone(implementationReadySpecificationFixture);
    input.requirements[0]!.evidenceRefs.push(input.requirements[0]!.evidenceRefs[0]!);
    expect(normalizeSpecification(input).normalizedInput.requirements[0]!.evidenceRefs).toEqual([
      "evidence:export",
    ]);
  });

  it("43. normalization does not mutate canonical input", () => {
    const input = clone(implementationReadySpecificationFixture);
    const before = JSON.stringify(input.canonicalProject);
    normalizeSpecification(input);
    expect(JSON.stringify(input.canonicalProject)).toBe(before);
  });

  it("44. rejects missing specification identity", () => {
    const input = clone(implementationReadySpecificationFixture) as unknown as Record<
      string,
      unknown
    >;
    input.specification = {
      ...(input.specification as Record<string, unknown>),
      id: "",
    };
    expect(() => normalizeSpecification(input)).toThrow();
  });

  it("45. accepts an authorized exception only for its exact scope", () => {
    const input = clone(implementationReadySpecificationFixture);
    input.constitutionExceptions.push(
      constitutionExceptionSchema.parse({
        id: "constitution_exception_authorized_testing",
        ruleId: "constitution_rule_testing",
        specificationId: input.specification.id,
        specificationVersion: input.specification.version,
        scopeRefs: [input.specification.id],
        approvalStatus: "approved",
        approvedBy: "project-owner",
        approvedAt: "2026-07-23T00:00:00.000Z",
        justification: "A reviewed equivalent validation supplies the same evidence.",
        evidenceRefs: ["evidence:approved-exception"],
        fingerprint: contentFingerprint({ exception: "authorized-testing" }),
      }),
    );
    expect(resolveProjectConstitution(input).appliedExceptionIds).toEqual([
      "constitution_exception_authorized_testing",
    ]);
  });

  it("46. does not treat missing Constitution context as passing", () => {
    const input = clone(implementationReadySpecificationFixture);
    input.constitutionRules = [];
    input.complianceEvidence = [];
    expect(evaluateSpecificationGovernance(input).readiness.decision).toBe("not_ready");
  });

  it("47. generates clarification questions deterministically", () => {
    expect(analyzeClarifications(ambiguousSuccessSpecificationFixture)).toEqual(
      analyzeClarifications(clone(ambiguousSuccessSpecificationFixture)),
    );
  });

  it("48. detects include and exclude conflicts", () => {
    expect(
      analyzeSpecificationConsistency(includeExcludeConflictSpecificationFixture, []).some(
        (finding) => finding.ruleId === "consistency.included_and_excluded",
      ),
    ).toBe(true);
  });

  it("49. detects incompatible lifecycle and approval states", () => {
    const input = clone(implementationReadySpecificationFixture);
    input.revision.lifecycle = "implementation_ready";
    input.specification.approvalStatus = "pending";
    expect(
      validateSpecificationStructure(refingerprint(input)).some(
        (finding) => finding.ruleId === "structure.approval_state",
      ),
    ).toBe(true);
  });

  it("50. reports stale traceability references", () => {
    const input = clone(implementationReadySpecificationFixture);
    input.traceabilityLinks[0]!.freshness = "stale";
    expect(
      analyzeSpecificationTraceability(input).some(
        (finding) => finding.ruleId === "traceability.superseded_artifact_reference",
      ),
    ).toBe(true);
  });

  it("51. makes stale artifact references blocking", () => {
    const input = clone(implementationReadySpecificationFixture);
    input.traceabilityLinks[0]!.freshness = "stale";
    expect(
      analyzeSpecificationTraceability(input).some((finding) => finding.severity === "blocking"),
    ).toBe(true);
  });

  it("52. accepts an observable criterion", () => {
    expect(analyzeSpecificationTestability(implementationReadySpecificationFixture)).toEqual([]);
  });

  it("53. rejects a subjective criterion", () => {
    const input = clone(implementationReadySpecificationFixture);
    input.specification.acceptanceCriteria[0]!.statement = "The export works well";
    expect(
      analyzeSpecificationTestability(input).some(
        (finding) => finding.ruleId === "testability.observable_result",
      ),
    ).toBe(true);
  });

  it("54. rejects a criterion that only restates its requirement", () => {
    const input = clone(implementationReadySpecificationFixture);
    input.specification.acceptanceCriteria[0]!.statement = input.requirements[0]!.statement;
    expect(
      analyzeSpecificationTestability(input).some(
        (finding) => finding.ruleId === "testability.requirement_restatement",
      ),
    ).toBe(true);
  });

  it("55. rejects a criterion without an expected result", () => {
    const input = clone(implementationReadySpecificationFixture);
    input.specification.acceptanceCriteria[0]!.statement = "Validation documentation";
    expect(
      analyzeSpecificationTestability(input).some(
        (finding) => finding.ruleId === "testability.expected_result",
      ),
    ).toBe(true);
  });

  it("56. requires privacy validation for restricted data", () => {
    expect(
      analyzeSpecificationTestability(privacyValidationRequiredSpecificationFixture).some(
        (finding) => finding.ruleId === "testability.security_privacy_validation",
      ),
    ).toBe(true);
  });

  it("57. preserves current status for unchanged authoritative inputs", () => {
    const normalization = normalizeSpecification(implementationReadySpecificationFixture);
    expect(
      evaluateSpecificationFreshness(
        normalization,
        resolveProjectConstitution(normalization.normalizedInput),
      ).status,
    ).toBe("current");
  });

  it("58. invalidates a report after a Constitution change", () => {
    const report = evaluateSpecificationGovernance(implementationReadySpecificationFixture);
    const changed = clone(implementationReadySpecificationFixture);
    changed.constitutionRules[0]!.rule.title = "Updated verification rule";
    changed.constitutionRules[0]!.rule.fingerprint = contentFingerprint({ rule: "testing-v2" });
    expect(assessGovernanceReportFreshness(report, changed).reasons).toContain(
      "constitution_fingerprint_changed",
    );
  });

  it("59. includes normalized, testability, and freshness results", () => {
    const report = evaluateSpecificationGovernance(implementationReadySpecificationFixture);
    expect(report.normalization.fingerprint).toBe(report.specificationFingerprint);
    expect(report.testabilityFindings).toEqual([]);
    expect(report.freshness.status).toBe("current");
  });

  it("60. records exact input fingerprints in readiness", () => {
    const report = evaluateSpecificationGovernance(implementationReadySpecificationFixture);
    expect(report.readiness.inputFingerprints).toEqual(report.freshness.inputFingerprints);
  });

  it("61. exposes unweighted health dimensions with evaluator versions", () => {
    const dimensions = evaluateSpecificationGovernance(implementationReadySpecificationFixture)
      .health.dimensions;
    expect(dimensions.every((dimension) => dimension.evaluatorVersion.length > 0)).toBe(true);
    expect(dimensions.every((dimension) => !("weight" in dimension))).toBe(true);
  });

  it("62. prevents final readiness when approval is missing", () => {
    const input = clone(implementationReadySpecificationFixture);
    input.revision.lifecycle = "review";
    input.specification.approvalStatus = "pending";
    expect(evaluateSpecificationGovernance(refingerprint(input)).readiness.decision).not.toBe(
      "readiness_recommended",
    );
  });

  it("63. rejects a prohibited lifecycle transition", () => {
    const previous = clone(implementationReadySpecificationFixture);
    const next = clone(previous);
    next.specification.version = 2;
    next.revision.lifecycle = "completed";
    next.revision.parentSpecificationVersion = previous.specification.version;
    next.revision.parentSpecificationFingerprint = previous.specification.fingerprint;
    next.revision.amendmentReason = "Skip required lifecycle gates";
    expect(
      validateSpecificationAmendment(previous, normalizeSpecification(refingerprint(next))).some(
        (finding) => finding.ruleId === "controlled_living.lifecycle_transition",
      ),
    ).toBe(true);
  });

  it("64. exposes unknown Constitution applicability", () => {
    const input = clone(implementationReadySpecificationFixture);
    input.constitutionRules[0]!.rule.applicability = ["unknown"];
    expect(
      resolveProjectConstitution(input).findings.some(
        (finding) => finding.ruleId === "constitution.applicability_unknown",
      ),
    ).toBe(true);
  });

  it("65. does not carry an exception to a new specification version", () => {
    const input = clone(implementationReadySpecificationFixture);
    input.constitutionExceptions.push(
      constitutionExceptionSchema.parse({
        id: "constitution_exception_version_one",
        ruleId: "constitution_rule_testing",
        specificationId: input.specification.id,
        specificationVersion: 1,
        scopeRefs: [input.specification.id],
        approvalStatus: "approved",
        approvedBy: "project-owner",
        approvedAt: "2026-07-23T00:00:00.000Z",
        justification: "Version-one-only reviewed exception.",
        evidenceRefs: ["evidence:version-one-exception"],
        fingerprint: contentFingerprint({ exception: "version-one" }),
      }),
    );
    input.specification.version = 2;
    input.revision.parentSpecificationVersion = 1;
    input.revision.parentSpecificationFingerprint =
      implementationReadySpecificationFixture.specification.fingerprint;
    input.revision.amendmentReason = "Create version two";
    expect(resolveProjectConstitution(refingerprint(input)).appliedExceptionIds).toEqual([]);
  });
});
