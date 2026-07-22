import { contentFingerprint, stableJson, type JsonValue } from "../knowledge-graph";
import {
  governanceReportSchema,
  implementationSliceSchema,
  type GovernanceReport,
} from "../governance";
import { analyzePlanConsistency, analyzeSliceTraceability } from "./analysis";
import { deriveImplementationSlices } from "./derivation";
import {
  calculatePlanHealth,
  calculateSliceHealth,
  decidePlanReadiness,
  decideSliceReadiness,
} from "./health";
import { normalizeImplementationSlice, normalizeTechnicalPlan } from "./normalization";
import {
  planGovernanceReportSchema,
  planningInputSchema,
  sliceGovernanceReportSchema,
  type ImplementationSlice,
  type PlanGovernanceReport,
  type SliceGovernanceReport,
} from "./schemas";
import {
  PLANNING_EVALUATOR_VERSIONS,
  createPlanReportId,
  createSliceReportId,
  sortPlanningFindings,
} from "./utils";
import { validateImplementationSliceStructure, validateTechnicalPlanStructure } from "./validation";

const temporal = (timestamp: string, createdAt: string, supersededAt: string | null) => ({
  observedAt: timestamp,
  sourceCreatedAt: createdAt,
  ingestedAt: timestamp,
  effectiveFrom: timestamp,
  effectiveTo: null,
  invalidatedAt: null,
  supersededAt,
  supersededBy: null,
  currentStatus: supersededAt ? ("superseded" as const) : ("current" as const),
});

function planSemantic(report: Omit<PlanGovernanceReport, "semanticFingerprint">): JsonValue {
  return {
    id: report.id,
    plan: report.plan,
    normalization: report.normalization,
    derivedSlices: report.derivedSlices,
    structuralFindings: report.structuralFindings,
    consistencyFindings: report.consistencyFindings,
    traceabilityFindings: report.traceabilityFindings,
    health: report.health,
    readiness: report.readiness,
    evaluatorVersions: report.evaluatorVersions,
  } as unknown as JsonValue;
}

function sliceSemantic(report: Omit<SliceGovernanceReport, "semanticFingerprint">): JsonValue {
  return {
    id: report.id,
    slice: report.slice,
    normalization: report.normalization,
    structuralFindings: report.structuralFindings,
    traceabilityFindings: report.traceabilityFindings,
    health: report.health,
    readiness: report.readiness,
    parentPlanReportFingerprint: report.parentPlanReportFingerprint,
    evaluatorVersions: report.evaluatorVersions,
  } as unknown as JsonValue;
}

export function evaluatePlanGovernance(input: unknown): PlanGovernanceReport {
  const parsed = planningInputSchema.parse(input);
  const normalization = normalizeTechnicalPlan(parsed.plan);
  const plan = normalization.plan;
  const structural = validateTechnicalPlanStructure(normalization, parsed.parentGovernanceReport);
  const parentReady =
    parsed.parentGovernanceReport.health.status === "healthy" &&
    parsed.parentGovernanceReport.readiness.decision === "readiness_recommended";
  const derivedSlices = parentReady
    ? deriveImplementationSlices(plan, parsed.parentGovernanceReport).map(
        (slice) => normalizeImplementationSlice(slice).slice,
      )
    : [];
  const consistency = analyzePlanConsistency(plan, derivedSlices, parsed.parentGovernanceReport);
  const traceability = sortPlanningFindings(
    derivedSlices.flatMap((slice) =>
      analyzeSliceTraceability(slice, plan, parsed.parentGovernanceReport, derivedSlices),
    ),
  );
  const health = calculatePlanHealth(normalization, structural, consistency, traceability);
  const readiness = decidePlanReadiness(normalization, parsed.parentGovernanceReport, health);
  const identity = {
    planId: plan.id,
    version: plan.revision.version,
    planFingerprint: plan.fingerprint,
    governanceReportFingerprint: parsed.parentGovernanceReport.semanticFingerprint,
  } as unknown as JsonValue;
  const partial = {
    id: createPlanReportId(identity),
    plan,
    normalization,
    derivedSlices,
    structuralFindings: structural,
    consistencyFindings: consistency,
    traceabilityFindings: traceability,
    health,
    readiness,
    evaluatorVersions: PLANNING_EVALUATOR_VERSIONS,
    evaluatedAt: parsed.evaluationTimestamp,
    temporal: temporal(
      parsed.evaluationTimestamp,
      plan.revision.createdAt,
      plan.revision.supersededAt,
    ),
  } satisfies Omit<PlanGovernanceReport, "semanticFingerprint">;
  return planGovernanceReportSchema.parse({
    ...partial,
    semanticFingerprint: contentFingerprint(planSemantic(partial)),
  });
}

export function evaluateSliceGovernance(
  input: unknown,
  planReport: PlanGovernanceReport,
  parentGovernanceReport: GovernanceReport,
  evaluationTimestamp: string,
  allSlices: ImplementationSlice[] = planReport.derivedSlices,
): SliceGovernanceReport {
  const parsedSlice = implementationSliceSchema.parse(input);
  const parsedParent = governanceReportSchema.parse(parentGovernanceReport);
  const normalization = normalizeImplementationSlice(parsedSlice);
  const slice = normalization.slice;
  const structural = validateImplementationSliceStructure(normalization, planReport.plan);
  const traceability = analyzeSliceTraceability(slice, planReport.plan, parsedParent, allSlices);
  const health = calculateSliceHealth(normalization, planReport, structural, traceability);
  const readiness = decideSliceReadiness(normalization, planReport, health);
  const partial = {
    id: createSliceReportId({
      sliceId: slice.id,
      version: slice.version,
      fingerprint: slice.fingerprint,
      planReportFingerprint: planReport.semanticFingerprint,
    }),
    slice,
    normalization,
    structuralFindings: structural,
    traceabilityFindings: traceability,
    health,
    readiness,
    parentPlanReportFingerprint: planReport.semanticFingerprint,
    evaluatorVersions: PLANNING_EVALUATOR_VERSIONS,
    evaluatedAt: evaluationTimestamp,
    temporal: temporal(evaluationTimestamp, slice.createdAt, null),
  } satisfies Omit<SliceGovernanceReport, "semanticFingerprint">;
  return sliceGovernanceReportSchema.parse({
    ...partial,
    semanticFingerprint: contentFingerprint(sliceSemantic(partial)),
  });
}

export function serializePlanGovernanceReport(report: PlanGovernanceReport): string {
  return stableJson(planGovernanceReportSchema.parse(report) as unknown as JsonValue);
}

export function serializeSliceGovernanceReport(report: SliceGovernanceReport): string {
  return stableJson(sliceGovernanceReportSchema.parse(report) as unknown as JsonValue);
}
