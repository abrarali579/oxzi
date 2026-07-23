import type { Criticality, FieldId, LifecycleStatus, ProjectField } from "../project";

export const PROJECT_SECTIONS = [
  "identity",
  "business",
  "scope",
  "product",
  "visual",
  "technical",
  "quality",
  "execution",
] as const;

export type ProjectSection = (typeof PROJECT_SECTIONS)[number];
export type FieldPath = `${ProjectSection}.${string}`;
export type ProjectType =
  | "website"
  | "saas_application"
  | "mobile_app"
  | "automation_system"
  | "internal_tool"
  | "other";

export type ArchitectureImpact = "foundational" | "structural" | "local" | "cosmetic";
export type QuestionCategory =
  | "identity"
  | "business"
  | "scope"
  | "product"
  | "visual"
  | "architecture"
  | "security_privacy"
  | "quality"
  | "execution"
  | "conflict";
export type SuggestedAnswerMode =
  "single_select" | "multi_select" | "boolean" | "short_text" | "long_text";
export type TypingEffort = "none" | "low" | "medium" | "high";
export type ResolutionKind =
  | "approved"
  | "confirmed"
  | "accepted_assumption"
  | "safe_default"
  | "partial_inference"
  | "unsafe_default"
  | "unresolved";

export type FieldRule = {
  projectTypes?: readonly ProjectType[];
  relevantFrom?: LifecycleStatus;
  dependencies?: readonly FieldPath[];
  activation?: {
    field: FieldPath;
    includesAny: readonly string[];
  };
  safeDefault?: {
    description: string;
    projectTypes?: readonly ProjectType[];
  };
  assumptionAllowed?: boolean;
  architectureImpact?: ArchitectureImpact;
  category?: QuestionCategory;
  question?: string;
  answerMode?: SuggestedAnswerMode;
  options?: readonly string[];
  typingEffort?: TypingEffort;
  answerability?: number;
};

export type FieldEntry = {
  section: ProjectSection;
  key: string;
  path: FieldPath;
  field: ProjectField<unknown>;
};

export type FieldAssessment = FieldEntry & {
  relevant: boolean;
  relevanceReason: string;
  resolution: ResolutionKind;
  resolutionRatio: number;
  sufficientlyResolved: boolean;
  weight: number;
  safeDefault?: string;
  requiredApprovalMissing: boolean;
};

export type SectionCompleteness = {
  section: ProjectSection;
  relevantFieldCount: number;
  resolvedFieldCount: number;
  completeness: number;
};

export type CompletenessResult = {
  criticalCompleteness: number;
  overallCompleteness: number;
  sectionCompleteness: Record<ProjectSection, SectionCompleteness>;
  blockingGapCount: number;
  blockingFieldIds: FieldId[];
  unresolvedConflictCount: number;
  blockingConflictCount: number;
  acceptedAssumptionCount: number;
  requiredApprovalCount: number;
  requiredApprovalFieldIds: FieldId[];
  safeDefaults: Array<{ fieldId: FieldId; fieldPath: FieldPath; description: string }>;
};

export type RankFactors = {
  criticalityWeight: number;
  impactMultiplier: number;
  uncertaintyMultiplier: number;
  lifecycleMultiplier: number;
  answerabilityMultiplier: number;
  downstreamDependencyBonus: number;
  typingCostPenalty: number;
  defaultSafetyPenalty: number;
};

export type QuestionCandidate = {
  fieldId: FieldId;
  fieldPath: FieldPath;
  reason: string;
  question: string;
  rankScore: number;
  rankFactors: RankFactors;
  criticality: Criticality;
  questionCategory: QuestionCategory;
  suggestedAnswerMode: SuggestedAnswerMode;
  freeTextNecessary: boolean;
  selectableOptions: string[];
  estimatedTypingEffort: TypingEffort;
};

export type InterviewDecision = {
  skipInterview: boolean;
  reasons: string[];
  typicalQuestionTarget: { minimum: 2; maximum: 5 };
  hardMaximum: 8;
};

export type DiscoveryAnalysis = {
  lifecycle: LifecycleStatus;
  projectType: ProjectType | null;
  fields: FieldAssessment[];
  completeness: CompletenessResult;
  interview: InterviewDecision;
  rankedCandidates: QuestionCandidate[];
  questions: QuestionCandidate[];
};
