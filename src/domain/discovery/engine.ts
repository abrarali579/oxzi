import { parseCanonicalProject, type CanonicalProject, type ProjectField } from "../project";

import {
  COMPLETENESS_WEIGHTS,
  LIFECYCLE_STAGE,
  RANKING_WEIGHTS,
  projectTypeApplies,
  resolveFieldRule,
  safeDefaultApplies,
} from "./rules";
import {
  PROJECT_SECTIONS,
  type CompletenessResult,
  type DiscoveryAnalysis,
  type FieldAssessment,
  type FieldEntry,
  type FieldPath,
  type ProjectSection,
  type ProjectType,
  type QuestionCandidate,
  type ResolutionKind,
  type SectionCompleteness,
} from "./types";

const ROUNDING_PRECISION = 10;
const TYPICAL_MAXIMUM = 5;
const HARD_MAXIMUM = 8;

function round(value: number): number {
  return Math.round(value * ROUNDING_PRECISION) / ROUNDING_PRECISION;
}

function extractFields(project: CanonicalProject): FieldEntry[] {
  return PROJECT_SECTIONS.flatMap((section) => {
    const group = project[section] as unknown as Record<string, ProjectField<unknown>>;
    return Object.entries(group).map(([key, field]) => ({
      section,
      key,
      path: `${section}.${key}` as FieldPath,
      field,
    }));
  });
}

function readProjectType(project: CanonicalProject): ProjectType | null {
  const projectType = project.identity.projectType.value;
  return projectType ?? null;
}

function valueContainsAny(value: unknown, needles: readonly string[]): boolean {
  if (value === null || value === undefined) return false;
  const normalized = JSON.stringify(value).toLowerCase();
  return needles.some((needle) => normalized.includes(needle.toLowerCase()));
}

function hasMeaningfulValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value).length > 0;
  return true;
}

function assessRelevance(
  entry: FieldEntry,
  entriesByPath: ReadonlyMap<FieldPath, FieldEntry>,
  projectType: ProjectType | null,
  lifecycle: CanonicalProject["metadata"]["lifecycle"],
): { relevant: boolean; reason: string } {
  const rule = resolveFieldRule(entry.path, entry.section, entry.field.criticality);

  if (!projectTypeApplies(rule, projectType)) {
    return {
      relevant: false,
      reason: projectType
        ? `Not applicable to project type ${projectType}`
        : "Deferred until project type is known",
    };
  }

  if (LIFECYCLE_STAGE[lifecycle] < LIFECYCLE_STAGE[rule.relevantFrom]) {
    return { relevant: false, reason: `Relevant from ${rule.relevantFrom}` };
  }

  if (entry.field.criticality === "low" && LIFECYCLE_STAGE[lifecycle] === 0) {
    return { relevant: false, reason: "Low-impact detail deferred during initial discovery" };
  }

  if (rule.activation) {
    const activatingField = entriesByPath.get(rule.activation.field);
    const activated =
      hasMeaningfulValue(entry.field.value) ||
      valueContainsAny(activatingField?.field.value, rule.activation.includesAny);
    if (!activated) {
      return {
        relevant: false,
        reason: `Not activated by ${rule.activation.field}`,
      };
    }
  }

  return {
    relevant: true,
    reason:
      rule.dependencies.length > 0
        ? `Relevant with dependencies: ${rule.dependencies.join(", ")}`
        : "Relevant to the current project type and lifecycle",
  };
}

function resolveField(
  entry: FieldEntry,
  project: CanonicalProject,
  projectType: ProjectType | null,
  hasOpenConflict: boolean,
): {
  resolution: ResolutionKind;
  ratio: number;
  sufficientlyResolved: boolean;
  safeDefault?: string;
} {
  const rule = resolveFieldRule(entry.path, entry.section, entry.field.criticality);

  if (hasOpenConflict || entry.field.status === "conflicted") {
    return { resolution: "unresolved", ratio: 0, sufficientlyResolved: false };
  }

  if (entry.field.approval.status === "approved") {
    return { resolution: "approved", ratio: 1, sufficientlyResolved: true };
  }

  if (entry.field.status === "confirmed") {
    return { resolution: "confirmed", ratio: 1, sufficientlyResolved: true };
  }

  const assumption = entry.field.assumption
    ? project.meta.assumptions.find((item) => item.id === entry.field.assumption?.assumptionId)
    : undefined;
  if (assumption?.status === "accepted" && rule.assumptionAllowed) {
    return {
      resolution: "accepted_assumption",
      ratio: 1,
      sufficientlyResolved: true,
    };
  }

  if (
    safeDefaultApplies(rule, projectType) &&
    (entry.field.status === "missing" || entry.field.status === "defaulted")
  ) {
    return {
      resolution: "safe_default",
      ratio: 1,
      sufficientlyResolved: true,
      safeDefault: rule.safeDefault?.description,
    };
  }

  if (entry.field.status === "inferred") {
    return {
      resolution: "partial_inference",
      ratio: Math.min(0.5, entry.field.confidence / 200),
      sufficientlyResolved: false,
    };
  }

  if (entry.field.status === "defaulted") {
    return {
      resolution: "unsafe_default",
      ratio: 0.75,
      sufficientlyResolved: false,
    };
  }

  return { resolution: "unresolved", ratio: 0, sufficientlyResolved: false };
}

function approvalRequired(
  entry: FieldEntry,
  project: CanonicalProject,
  sufficientlyResolved: boolean,
): boolean {
  if (entry.field.approval.status === "approved" || entry.field.status === "confirmed") {
    return false;
  }

  const assumption = entry.field.assumption
    ? project.meta.assumptions.find((item) => item.id === entry.field.assumption?.assumptionId)
    : undefined;
  if (assumption?.status === "proposed" && assumption.impact !== "low") return true;

  return (
    !sufficientlyResolved &&
    (entry.field.criticality === "blocking" || entry.field.criticality === "high") &&
    (entry.field.status === "inferred" || entry.field.status === "defaulted")
  );
}

function scoreCompleteness(
  assessments: FieldAssessment[],
  project: CanonicalProject,
): CompletenessResult {
  const relevant = assessments.filter((assessment) => assessment.relevant);
  const critical = relevant.filter(
    (assessment) =>
      assessment.field.criticality === "blocking" || assessment.field.criticality === "high",
  );

  const weightedScore = (items: FieldAssessment[]) => {
    const denominator = items.reduce((sum, item) => sum + item.weight, 0);
    if (denominator === 0) return 100;
    const numerator = items.reduce((sum, item) => sum + item.weight * item.resolutionRatio, 0);
    return round((numerator / denominator) * 100);
  };

  const sectionCompleteness = Object.fromEntries(
    PROJECT_SECTIONS.map((section) => {
      const sectionFields = relevant.filter((assessment) => assessment.section === section);
      const result: SectionCompleteness = {
        section,
        relevantFieldCount: sectionFields.length,
        resolvedFieldCount: sectionFields.filter((field) => field.sufficientlyResolved).length,
        completeness: weightedScore(sectionFields),
      };
      return [section, result];
    }),
  ) as Record<ProjectSection, SectionCompleteness>;

  const relevantIds = new Set(relevant.map((assessment) => assessment.field.id));
  const openConflicts = project.meta.conflicts.filter(
    (conflict) =>
      conflict.status === "open" && conflict.fieldIds.some((fieldId) => relevantIds.has(fieldId)),
  );
  const requiredApprovalIds = new Set(
    relevant
      .filter((assessment) => assessment.requiredApprovalMissing)
      .map((assessment) => assessment.field.id),
  );

  for (const assumption of project.meta.assumptions) {
    if (assumption.status === "proposed" && assumption.impact !== "low") {
      for (const fieldId of assumption.fieldIds) {
        if (relevantIds.has(fieldId)) requiredApprovalIds.add(fieldId);
      }
    }
  }

  return {
    criticalCompleteness: weightedScore(critical),
    overallCompleteness: weightedScore(relevant),
    sectionCompleteness,
    blockingGapCount: relevant.filter(
      (assessment) =>
        assessment.field.criticality === "blocking" && !assessment.sufficientlyResolved,
    ).length,
    blockingFieldIds: relevant
      .filter(
        (assessment) =>
          assessment.field.criticality === "blocking" && !assessment.sufficientlyResolved,
      )
      .map((assessment) => assessment.field.id),
    unresolvedConflictCount: openConflicts.length,
    blockingConflictCount: openConflicts.filter((conflict) => conflict.severity === "blocking")
      .length,
    acceptedAssumptionCount: project.meta.assumptions.filter(
      (assumption) => assumption.status === "accepted",
    ).length,
    requiredApprovalCount: requiredApprovalIds.size,
    requiredApprovalFieldIds: [...requiredApprovalIds].sort(),
    safeDefaults: relevant
      .filter((assessment) => assessment.resolution === "safe_default" && assessment.safeDefault)
      .map((assessment) => ({
        fieldId: assessment.field.id,
        fieldPath: assessment.path,
        description: assessment.safeDefault!,
      }))
      .sort((left, right) => left.fieldPath.localeCompare(right.fieldPath)),
  };
}

function uncertaintyMultiplier(assessment: FieldAssessment): number {
  if (assessment.field.status === "conflicted") return RANKING_WEIGHTS.uncertainty.conflicted;
  if (assessment.field.status === "missing") return RANKING_WEIGHTS.uncertainty.missing;
  if (assessment.field.status === "defaulted") return RANKING_WEIGHTS.uncertainty.defaulted;
  if (assessment.field.status === "inferred") {
    const uncertainty = (100 - assessment.field.confidence) / 100;
    const range =
      RANKING_WEIGHTS.uncertainty.inferredMaximum - RANKING_WEIGHTS.uncertainty.inferredMinimum;
    return RANKING_WEIGHTS.uncertainty.inferredMinimum + range * uncertainty;
  }
  return 1;
}

function candidateReason(assessment: FieldAssessment, hasOpenConflict: boolean): string {
  if (hasOpenConflict || assessment.field.status === "conflicted") {
    return `Conflicting sources must be reconciled for ${assessment.path}.`;
  }
  if (assessment.field.status === "missing") {
    return `${assessment.path} is missing and no safe default can resolve it.`;
  }
  if (assessment.field.status === "inferred") {
    return `${assessment.path} is inferred at ${assessment.field.confidence}% confidence and needs confirmation.`;
  }
  if (assessment.field.status === "defaulted") {
    return `${assessment.path} uses a default that is not safe enough to apply silently.`;
  }
  return `${assessment.path} is not sufficiently resolved.`;
}

function rankCandidates(
  assessments: FieldAssessment[],
  project: CanonicalProject,
  projectType: ProjectType | null,
): QuestionCandidate[] {
  const relevantAssessments = assessments.filter((assessment) => assessment.relevant);
  const openConflictFieldIds = new Set(
    project.meta.conflicts
      .filter((conflict) => conflict.status === "open")
      .flatMap((conflict) => conflict.fieldIds),
  );

  const candidates = relevantAssessments
    .filter((assessment) => !assessment.sufficientlyResolved)
    .map((assessment): QuestionCandidate => {
      const rule = resolveFieldRule(
        assessment.path,
        assessment.section,
        assessment.field.criticality,
      );
      const downstreamCount = relevantAssessments.filter((possibleDependent) => {
        const dependentRule = resolveFieldRule(
          possibleDependent.path,
          possibleDependent.section,
          possibleDependent.field.criticality,
        );
        return dependentRule.dependencies.includes(assessment.path);
      }).length;
      const impactMultiplier = RANKING_WEIGHTS.architectureImpact[rule.architectureImpact];
      const lifecycleMultiplier =
        LIFECYCLE_STAGE[project.metadata.lifecycle] === LIFECYCLE_STAGE[rule.relevantFrom]
          ? RANKING_WEIGHTS.lifecycle.firstRelevantPhase
          : RANKING_WEIGHTS.lifecycle.laterPhase;
      const modeAnswerability = RANKING_WEIGHTS.answerability[rule.answerMode];
      const answerabilityMultiplier = modeAnswerability * rule.answerability;
      const dependencyBonus = Math.min(
        downstreamCount * RANKING_WEIGHTS.downstreamDependencyBonus,
        RANKING_WEIGHTS.maximumDependencyBonus,
      );
      const typingCostPenalty = RANKING_WEIGHTS.typingCost[rule.typingEffort];
      const defaultSafetyPenalty =
        rule.safeDefault && !safeDefaultApplies(rule, projectType)
          ? RANKING_WEIGHTS.conditionalDefaultPenalty
          : 0;
      const uncertainty = uncertaintyMultiplier(assessment);
      const criticalityWeight = RANKING_WEIGHTS.criticality[assessment.field.criticality];
      const rankScore = round(
        criticalityWeight *
          impactMultiplier *
          uncertainty *
          lifecycleMultiplier *
          answerabilityMultiplier +
          dependencyBonus -
          typingCostPenalty -
          defaultSafetyPenalty,
      );
      const hasOpenConflict = openConflictFieldIds.has(assessment.field.id);
      const selectableOptions = [...(rule.options ?? [])];

      return {
        fieldId: assessment.field.id,
        fieldPath: assessment.path,
        reason: candidateReason(assessment, hasOpenConflict),
        question: rule.question,
        rankScore,
        rankFactors: {
          criticalityWeight,
          impactMultiplier,
          uncertaintyMultiplier: uncertainty,
          lifecycleMultiplier,
          answerabilityMultiplier,
          downstreamDependencyBonus: dependencyBonus,
          typingCostPenalty,
          defaultSafetyPenalty,
        },
        criticality: assessment.field.criticality,
        questionCategory: hasOpenConflict ? "conflict" : rule.category,
        suggestedAnswerMode: rule.answerMode,
        freeTextNecessary: selectableOptions.length === 0,
        selectableOptions,
        estimatedTypingEffort: rule.typingEffort,
      };
    });

  return candidates.sort(
    (left, right) =>
      right.rankScore - left.rankScore || left.fieldPath.localeCompare(right.fieldPath),
  );
}

function interviewDecision(completeness: CompletenessResult) {
  const reasons: string[] = [];
  if (completeness.criticalCompleteness < 90) {
    reasons.push(`Critical completeness is ${completeness.criticalCompleteness}%, below 90%.`);
  }
  if (completeness.blockingGapCount > 0) {
    reasons.push(`${completeness.blockingGapCount} blocking field gap(s) remain.`);
  }
  if (completeness.blockingConflictCount > 0) {
    reasons.push(`${completeness.blockingConflictCount} blocking conflict(s) remain.`);
  }
  if (completeness.requiredApprovalCount > 0) {
    reasons.push(`${completeness.requiredApprovalCount} required approval(s) remain.`);
  }

  return {
    skipInterview: reasons.length === 0,
    reasons:
      reasons.length === 0
        ? ["Critical completeness is at least 90% with no blocking gaps, conflicts, or approvals."]
        : reasons,
    typicalQuestionTarget: { minimum: 2 as const, maximum: 5 as const },
    hardMaximum: 8 as const,
  };
}

function selectQuestions(
  candidates: QuestionCandidate[],
  skipInterview: boolean,
): QuestionCandidate[] {
  if (skipInterview) return [];

  const materialCandidates = candidates.filter((candidate) => candidate.criticality !== "low");
  const urgentCount = materialCandidates.filter(
    (candidate) => candidate.criticality === "blocking" || candidate.criticality === "high",
  ).length;
  const budget = urgentCount > TYPICAL_MAXIMUM ? HARD_MAXIMUM : TYPICAL_MAXIMUM;
  return materialCandidates.slice(0, budget);
}

export function analyzeDiscovery(input: unknown): DiscoveryAnalysis {
  const project = parseCanonicalProject(input);
  const projectType = readProjectType(project);
  const entries = extractFields(project);
  const entriesByPath = new Map(entries.map((entry) => [entry.path, entry]));
  const openConflictFieldIds = new Set(
    project.meta.conflicts
      .filter((conflict) => conflict.status === "open")
      .flatMap((conflict) => conflict.fieldIds),
  );

  const fields = entries.map((entry): FieldAssessment => {
    const relevance = assessRelevance(
      entry,
      entriesByPath,
      projectType,
      project.metadata.lifecycle,
    );
    const resolution = resolveField(
      entry,
      project,
      projectType,
      openConflictFieldIds.has(entry.field.id),
    );
    return {
      ...entry,
      relevant: relevance.relevant,
      relevanceReason: relevance.reason,
      resolution: resolution.resolution,
      resolutionRatio: resolution.ratio,
      sufficientlyResolved: resolution.sufficientlyResolved,
      weight: COMPLETENESS_WEIGHTS[entry.field.criticality],
      ...(resolution.safeDefault ? { safeDefault: resolution.safeDefault } : {}),
      requiredApprovalMissing: approvalRequired(entry, project, resolution.sufficientlyResolved),
    };
  });

  const completeness = scoreCompleteness(fields, project);
  const interview = interviewDecision(completeness);
  const rankedCandidates = rankCandidates(fields, project, projectType);
  const questions = selectQuestions(rankedCandidates, interview.skipInterview);

  return {
    lifecycle: project.metadata.lifecycle,
    projectType,
    fields,
    completeness,
    interview,
    rankedCandidates,
    questions,
  };
}

export const DISCOVERY_LIMITS = {
  typicalMinimum: 2,
  typicalMaximum: TYPICAL_MAXIMUM,
  hardMaximum: HARD_MAXIMUM,
} as const;
