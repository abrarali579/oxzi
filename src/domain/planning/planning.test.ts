import { describe, expect, it } from "vitest";

import {
  implementationSliceSchema,
  specificationIdSchema,
  technicalPlanIdSchema,
} from "../governance";
import {
  analyzePlanConsistency,
  analyzeSliceTraceability,
  approvedImplementationSlice,
  calculateImplementationSliceFingerprint,
  calculateTechnicalPlanFingerprint,
  clonePlanningInput,
  deriveImplementationSlices,
  evaluatePlanGovernance,
  evaluateSliceGovernance,
  healthySpecificationGovernanceReport,
  normalizeImplementationSlice,
  normalizeTechnicalPlan,
  planningInputSchema,
  planningTimestamp,
  refingerprintPlan,
  serializeImplementationSlice,
  serializeTechnicalPlan,
  technicalPlanSchema,
  unhealthySpecificationGovernanceReport,
  validPlanGovernanceReport,
  validPlanningInput,
  validTechnicalPlan,
  validateImplementationSliceAmendment,
  validateImplementationSliceStructure,
  validateTechnicalPlanAmendment,
  validateTechnicalPlanStructure,
  type ImplementationSlice,
  type PlanningInput,
  type TechnicalPlan,
} from ".";

const clonePlan = (): TechnicalPlan => structuredClone(validTechnicalPlan);
const cloneSlice = (): ImplementationSlice => structuredClone(approvedImplementationSlice);

function refingerprintSlice(slice: ImplementationSlice): ImplementationSlice {
  slice.fingerprint = calculateImplementationSliceFingerprint(slice);
  return implementationSliceSchema.parse(slice);
}

describe("Technical Plan and Implementation Slice runtime", () => {
  it("produces a readiness-recommended Plan", () => {
    expect(validPlanGovernanceReport.health.status).toBe("healthy");
    expect(validPlanGovernanceReport.readiness.decision).toBe("readiness_recommended");
  });

  it("derives deterministic ordered independent slices", () => {
    const first = deriveImplementationSlices(
      validTechnicalPlan,
      healthySpecificationGovernanceReport,
    );
    const second = deriveImplementationSlices(
      structuredClone(validTechnicalPlan),
      structuredClone(healthySpecificationGovernanceReport),
    );
    expect(first).toEqual(second);
    expect(first.map((slice) => slice.id)).toEqual(validTechnicalPlan.implementationSequence);
    expect(first[0]?.validationCommands).toContain("validation:npm-test");
  });

  it("recommends an externally approved Slice", () => {
    const report = evaluateSliceGovernance(
      approvedImplementationSlice,
      validPlanGovernanceReport,
      healthySpecificationGovernanceReport,
      planningTimestamp,
      [approvedImplementationSlice],
    );
    expect(report.health.status).toBe("healthy");
    expect(report.readiness.decision).toBe("readiness_recommended");
  });

  it("normalizes a Plan deterministically", () => {
    const input = clonePlan();
    input.componentRefs.push(input.componentRefs[0]!);
    expect(normalizeTechnicalPlan(input)).toEqual(normalizeTechnicalPlan(input));
    expect(normalizeTechnicalPlan(input).actions).toContain("deduplicated:componentRefs");
  });

  it("preserves meaningful implementation sequence ordering", () => {
    const plan = clonePlan();
    const additional = approvedImplementationSlice.id;
    plan.implementationSequence = [additional, ...plan.implementationSequence];
    const normalized = normalizeTechnicalPlan(plan);
    expect(normalized.plan.implementationSequence[0]).toBe(additional);
  });

  it("keeps Plan fingerprints and serialization stable", () => {
    expect(calculateTechnicalPlanFingerprint(validTechnicalPlan)).toBe(
      calculateTechnicalPlanFingerprint(structuredClone(validTechnicalPlan)),
    );
    expect(
      technicalPlanSchema.parse(JSON.parse(serializeTechnicalPlan(validTechnicalPlan))),
    ).toEqual(validTechnicalPlan);
  });

  it("keeps Slice fingerprints and serialization stable", () => {
    expect(calculateImplementationSliceFingerprint(approvedImplementationSlice)).toBe(
      approvedImplementationSlice.fingerprint,
    );
    expect(
      implementationSliceSchema.parse(
        JSON.parse(serializeImplementationSlice(approvedImplementationSlice)),
      ),
    ).toEqual(approvedImplementationSlice);
  });

  it("blocks missing acceptance-criterion coverage", () => {
    const input = clonePlanningInput();
    input.plan.acceptanceCriterionIds = [];
    const report = evaluatePlanGovernance(refingerprintPlan(input));
    expect(
      report.structuralFindings.some(
        (finding) => finding.ruleId === "planning.acceptance_coverage",
      ),
    ).toBe(true);
    expect(report.readiness.decision).not.toBe("readiness_recommended");
  });

  it("blocks broken parent Specification references", () => {
    const input = clonePlanningInput();
    input.plan.specificationId = specificationIdSchema.parse("spec_other");
    const report = evaluatePlanGovernance(refingerprintPlan(input));
    expect(report.structuralFindings.some((finding) => finding.severity === "blocking")).toBe(true);
  });

  it("blocks duplicate Slice IDs in a Plan", () => {
    const input = clonePlanningInput();
    input.plan.implementationSequence.push(input.plan.implementationSequence[0]!);
    const result = normalizeTechnicalPlan(input.plan);
    expect(
      result.blockingErrors.some((finding) => finding.ruleId === "planning.unique_slice_ids"),
    ).toBe(true);
  });

  it("blocks planning from an unhealthy Specification", () => {
    const input: PlanningInput = planningInputSchema.parse({
      ...validPlanningInput,
      parentGovernanceReport: unhealthySpecificationGovernanceReport,
    });
    const report = evaluatePlanGovernance(input);
    expect(report.derivedSlices).toEqual([]);
    expect(report.readiness.decision).not.toBe("readiness_recommended");
  });

  it("refuses direct Slice derivation from an unhealthy Specification", () => {
    expect(() =>
      deriveImplementationSlices(validTechnicalPlan, unhealthySpecificationGovernanceReport),
    ).toThrow("Cannot derive implementation slices from an unhealthy specification");
  });

  it("detects Plan scope outside Specification scope", () => {
    const plan = clonePlan();
    plan.scope.push("Automatic deployment");
    const normalized = normalizeTechnicalPlan({
      ...plan,
      fingerprint: calculateTechnicalPlanFingerprint(plan),
    }).plan;
    expect(
      analyzePlanConsistency(
        normalized,
        validPlanGovernanceReport.derivedSlices,
        healthySpecificationGovernanceReport,
      ).some((finding) => finding.ruleId === "planning.plan_scope_boundary"),
    ).toBe(true);
  });

  it("detects Plan include/exclude conflicts", () => {
    const plan = clonePlan();
    plan.exclusions.push(plan.scope[0]!);
    expect(
      analyzePlanConsistency(
        plan,
        validPlanGovernanceReport.derivedSlices,
        healthySpecificationGovernanceReport,
      ).some((finding) => finding.ruleId === "planning.plan_scope_boundary"),
    ).toBe(true);
  });

  it("detects Slice scope outside Plan scope", () => {
    const slice = cloneSlice();
    slice.scope = ["Automatic deployment"];
    const findings = analyzePlanConsistency(
      validTechnicalPlan,
      [refingerprintSlice(slice)],
      healthySpecificationGovernanceReport,
    );
    expect(findings.some((finding) => finding.ruleId === "planning.slice_scope_boundary")).toBe(
      true,
    );
  });

  it("detects an orphaned Slice", () => {
    const slice = cloneSlice();
    slice.technicalPlanId = technicalPlanIdSchema.parse("plan_other");
    const normalized = normalizeImplementationSlice(refingerprintSlice(slice));
    expect(
      validateImplementationSliceStructure(normalized, validTechnicalPlan).some(
        (finding) => finding.ruleId === "planning.slice_exact_parent",
      ),
    ).toBe(true);
  });

  it("detects broken Slice acceptance references", () => {
    const slice = cloneSlice();
    slice.acceptanceCriterionIds = ["criterion_missing" as never];
    expect(
      analyzeSliceTraceability(
        refingerprintSlice(slice),
        validTechnicalPlan,
        healthySpecificationGovernanceReport,
        [slice],
      ).some((finding) => finding.ruleId === "planning.slice_reference_exists"),
    ).toBe(true);
  });

  it("classifies stale Plan parent fingerprints", () => {
    const input = clonePlanningInput();
    input.plan.specificationFingerprint = "fp_f1_0000000000000000" as never;
    input.plan.fingerprint = calculateTechnicalPlanFingerprint(input.plan);
    const report = evaluatePlanGovernance(input);
    expect(report.health.status).toBe("stale");
    expect(report.readiness.decision).toBe("stale");
  });

  it("blocks a Plan without approval", () => {
    const input = clonePlanningInput();
    input.plan.approvalStatus = "pending";
    input.plan.revision.lifecycle = "draft";
    input.plan.revision.approvedAt = null;
    const report = evaluatePlanGovernance(refingerprintPlan(input));
    expect(report.readiness.decision).toBe("not_ready");
  });

  it("blocks a Slice without approval", () => {
    const slice = cloneSlice();
    slice.approvalStatus = "pending";
    slice.lifecycle = "draft";
    slice.approvedAt = null;
    const report = evaluateSliceGovernance(
      refingerprintSlice(slice),
      validPlanGovernanceReport,
      healthySpecificationGovernanceReport,
      planningTimestamp,
      [slice],
    );
    expect(report.readiness.decision).toBe("not_ready");
  });

  it("prevents mutation of an approved Plan version", () => {
    const changed = clonePlan();
    changed.title = "Mutated approved plan";
    const findings = validateTechnicalPlanAmendment(
      validTechnicalPlan,
      normalizeTechnicalPlan({
        ...changed,
        fingerprint: calculateTechnicalPlanFingerprint(changed),
      }),
    );
    expect(findings.some((finding) => finding.ruleId === "planning.plan_version_immutable")).toBe(
      true,
    );
  });

  it("prevents mutation of an approved Slice version", () => {
    const changed = cloneSlice();
    changed.goal = "Mutated approved slice";
    const findings = validateImplementationSliceAmendment(
      approvedImplementationSlice,
      normalizeImplementationSlice(refingerprintSlice(changed)),
    );
    expect(findings.some((finding) => finding.ruleId === "planning.slice_version_immutable")).toBe(
      true,
    );
  });

  it("accepts exact parent linkage for a new Plan version", () => {
    const next = clonePlan();
    next.revision.version = 2;
    next.revision.lifecycle = "draft";
    next.revision.parentVersion = validTechnicalPlan.revision.version;
    next.revision.parentFingerprint = validTechnicalPlan.fingerprint;
    next.approvalStatus = "pending";
    next.revision.approvedAt = null;
    next.fingerprint = calculateTechnicalPlanFingerprint(next);
    expect(
      validateTechnicalPlanAmendment(validTechnicalPlan, normalizeTechnicalPlan(next)),
    ).toEqual([]);
  });

  it("does not mutate Plan, Specification, or canonical inputs", () => {
    const input = clonePlanningInput();
    const before = JSON.stringify(input);
    evaluatePlanGovernance(input);
    expect(JSON.stringify(input)).toBe(before);
  });

  it("keeps report semantic identity stable across evaluation timestamps", () => {
    const later = clonePlanningInput();
    later.evaluationTimestamp = "2026-07-24T01:00:00.000Z";
    expect(evaluatePlanGovernance(later).semanticFingerprint).toBe(
      validPlanGovernanceReport.semanticFingerprint,
    );
  });

  it("returns stable finding order", () => {
    const input = clonePlanningInput();
    input.plan.acceptanceCriterionIds = [];
    const normalized = normalizeTechnicalPlan(refingerprintPlan(input).plan);
    expect(
      validateTechnicalPlanStructure(normalized, healthySpecificationGovernanceReport),
    ).toEqual(validateTechnicalPlanStructure(normalized, healthySpecificationGovernanceReport));
  });
});
