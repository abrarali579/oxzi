import type { Criticality, LifecycleStatus } from "../project";

import type {
  ArchitectureImpact,
  FieldPath,
  FieldRule,
  ProjectSection,
  ProjectType,
  QuestionCategory,
  SuggestedAnswerMode,
  TypingEffort,
} from "./types";

export const COMPLETENESS_WEIGHTS: Readonly<Record<Criticality, number>> = {
  blocking: 100,
  high: 70,
  medium: 35,
  low: 10,
};

export const RANKING_WEIGHTS = {
  criticality: COMPLETENESS_WEIGHTS,
  architectureImpact: {
    foundational: 1.3,
    structural: 1.2,
    local: 1.08,
    cosmetic: 1,
  } satisfies Readonly<Record<ArchitectureImpact, number>>,
  uncertainty: {
    missing: 1.25,
    conflicted: 1.35,
    inferredMinimum: 1.05,
    inferredMaximum: 1.25,
    defaulted: 1.05,
  },
  lifecycle: {
    firstRelevantPhase: 1.15,
    laterPhase: 1.05,
  },
  answerability: {
    single_select: 1.1,
    multi_select: 1.08,
    boolean: 1.1,
    short_text: 1.03,
    long_text: 1,
  } satisfies Readonly<Record<SuggestedAnswerMode, number>>,
  downstreamDependencyBonus: 5,
  maximumDependencyBonus: 25,
  typingCost: {
    none: 0,
    low: 4,
    medium: 10,
    high: 18,
  } satisfies Readonly<Record<TypingEffort, number>>,
  conditionalDefaultPenalty: 12,
} as const;

export const LIFECYCLE_STAGE: Readonly<Record<LifecycleStatus, number>> = {
  draft: 0,
  analyzing: 0,
  discovery_required: 0,
  discovery_skipped: 0,
  understanding_review: 1,
  architecture_ready: 2,
  bible_generated: 3,
  approved: 4,
  in_build: 5,
  maintained: 6,
};

const categoryBySection: Readonly<Record<ProjectSection, QuestionCategory>> = {
  identity: "identity",
  business: "business",
  scope: "scope",
  product: "product",
  visual: "visual",
  technical: "architecture",
  quality: "quality",
  execution: "execution",
};

const impactBySection: Readonly<Record<ProjectSection, ArchitectureImpact>> = {
  identity: "local",
  business: "foundational",
  scope: "structural",
  product: "structural",
  visual: "local",
  technical: "structural",
  quality: "local",
  execution: "local",
};

const humanize = (key: string) => key.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();

export const FIELD_RULES: Readonly<Partial<Record<FieldPath, FieldRule>>> = {
  "identity.name": {
    question: "What should this project be called?",
    answerMode: "short_text",
    typingEffort: "low",
  },
  "identity.oneLiner": {
    architectureImpact: "structural",
    question: "What does this project do?",
    answerMode: "short_text",
    typingEffort: "medium",
  },
  "identity.projectType": {
    architectureImpact: "foundational",
    question: "What kind of project is this?",
    answerMode: "single_select",
    options: ["Website", "SaaS application", "Automation system", "Internal tool", "Other"],
    typingEffort: "none",
  },
  "business.problem": {
    question: "Which problem must this solve?",
    answerMode: "long_text",
    typingEffort: "high",
  },
  "business.solution": {
    dependencies: ["business.problem"],
    question: "What solution should users receive?",
    answerMode: "long_text",
    typingEffort: "high",
  },
  "business.targetUsers": {
    question: "Who is the primary user?",
    answerMode: "short_text",
    typingEffort: "medium",
  },
  "business.geography": {
    question: "Where will this product operate?",
    answerMode: "multi_select",
    options: ["Local", "National", "Regional", "Global"],
    typingEffort: "low",
  },
  "business.goals": {
    dependencies: ["business.problem", "business.targetUsers"],
    question: "What outcome matters most?",
    answerMode: "short_text",
    typingEffort: "medium",
  },
  "business.successMetrics": {
    dependencies: ["business.goals"],
    question: "How will success be measured?",
    answerMode: "short_text",
    typingEffort: "medium",
  },
  "scope.inScope": {
    dependencies: ["business.goals"],
    question: "What must the first version include?",
    answerMode: "long_text",
    typingEffort: "high",
  },
  "scope.outOfScope": {
    dependencies: ["scope.inScope"],
    question: "What must the first version exclude?",
    answerMode: "long_text",
    typingEffort: "high",
  },
  "scope.constraints": {
    question: "Which constraints cannot change?",
    answerMode: "long_text",
    typingEffort: "high",
  },
  "scope.assumptionSummaries": {
    safeDefault: { description: "No additional operating assumptions are required." },
    question: "Which assumptions should we preserve?",
  },
  "scope.dependencies": {
    question: "Which external dependencies are required?",
    answerMode: "long_text",
    typingEffort: "high",
  },
  "product.platforms": {
    dependencies: ["identity.projectType"],
    question: "Which platforms must be supported?",
    answerMode: "multi_select",
    options: ["Responsive web", "iOS", "Android", "Desktop", "Background worker"],
    typingEffort: "low",
  },
  "product.coreUserFlows": {
    dependencies: ["business.targetUsers", "business.goals"],
    architectureImpact: "foundational",
    question: "What must the primary user accomplish?",
    answerMode: "long_text",
    typingEffort: "high",
  },
  "product.features": {
    dependencies: ["product.coreUserFlows"],
    architectureImpact: "foundational",
    question: "Which capabilities are essential?",
    answerMode: "long_text",
    typingEffort: "high",
  },
  "product.roles": {
    projectTypes: ["saas_application", "automation_system", "internal_tool"],
    dependencies: ["business.targetUsers"],
    architectureImpact: "foundational",
    question: "Which user roles are required?",
    answerMode: "multi_select",
    options: ["Member", "Editor", "Manager", "Operator", "Administrator"],
    typingEffort: "low",
  },
  "product.permissions": {
    projectTypes: ["saas_application", "automation_system", "internal_tool"],
    dependencies: ["product.roles"],
    architectureImpact: "foundational",
    category: "security_privacy",
    question: "What may each role do?",
    answerMode: "long_text",
    typingEffort: "high",
  },
  "product.contentRequirements": {
    dependencies: ["product.features"],
    question: "Which content must be managed?",
    answerMode: "long_text",
    typingEffort: "high",
  },
  "visual.personality": {
    question: "How should the product feel?",
    answerMode: "multi_select",
    options: ["Calm", "Premium", "Playful", "Technical", "Editorial"],
    typingEffort: "low",
  },
  "visual.visualKeywords": {
    dependencies: ["visual.personality"],
    question: "Which visual qualities matter?",
    answerMode: "multi_select",
    typingEffort: "low",
  },
  "visual.avoidList": {
    safeDefault: { description: "No additional visual exclusions are required." },
    question: "What should the design avoid?",
    answerMode: "short_text",
    typingEffort: "medium",
  },
  "visual.themes": {
    dependencies: ["visual.personality"],
    question: "Which color modes are required?",
    answerMode: "multi_select",
    options: ["Light", "Dark", "Both", "System preference"],
    typingEffort: "none",
  },
  "visual.colors": {
    dependencies: ["visual.personality"],
    architectureImpact: "cosmetic",
    question: "Are any colors already fixed?",
    answerMode: "short_text",
    typingEffort: "medium",
  },
  "visual.typography": {
    architectureImpact: "cosmetic",
    safeDefault: { description: "Use accessible project-appropriate typography." },
    question: "Is a typeface already required?",
  },
  "visual.layoutRules": {
    dependencies: ["product.platforms", "product.features"],
    question: "Which layout behavior is essential?",
    answerMode: "long_text",
    typingEffort: "high",
  },
  "visual.motionRules": {
    safeDefault: { description: "Use restrained motion and honor reduced-motion preferences." },
    question: "Which motion behavior is essential?",
  },
  "visual.threeDRules": {
    projectTypes: ["website"],
    dependencies: ["product.features", "quality.performance"],
    activation: {
      field: "product.features",
      includesAny: ["3d", "webgl", "immersive"],
    },
    architectureImpact: "structural",
    question: "How should 3D degrade safely?",
    answerMode: "long_text",
    typingEffort: "high",
  },
  "visual.references": {
    architectureImpact: "cosmetic",
    safeDefault: { description: "No external visual reference is required." },
    question: "Which references should guide design?",
  },
  "technical.preferredStack": {
    question: "Is a technical stack mandatory?",
  },
  "technical.architectureStyle": {
    dependencies: ["scope.constraints", "product.coreUserFlows", "product.features"],
    architectureImpact: "foundational",
    question: "Which architecture constraint is mandatory?",
    answerMode: "long_text",
    typingEffort: "high",
  },
  "technical.dataEntities": {
    projectTypes: ["saas_application", "automation_system", "internal_tool"],
    dependencies: ["product.features"],
    architectureImpact: "foundational",
    question: "Which data must the system own?",
    answerMode: "long_text",
    typingEffort: "high",
  },
  "technical.integrations": {
    dependencies: ["product.features"],
    architectureImpact: "foundational",
    question: "Which external systems are required?",
    answerMode: "long_text",
    typingEffort: "high",
  },
  "technical.authentication": {
    projectTypes: ["saas_application", "automation_system", "internal_tool"],
    dependencies: ["product.roles", "product.permissions"],
    architectureImpact: "foundational",
    category: "security_privacy",
    assumptionAllowed: false,
    question: "How should users authenticate?",
    answerMode: "single_select",
    options: ["Email link", "Email and password", "Social login", "Organization SSO"],
    typingEffort: "none",
  },
  "technical.storage": {
    dependencies: ["technical.dataEntities"],
    architectureImpact: "foundational",
    question: "Where must project data live?",
    answerMode: "single_select",
    options: ["Managed cloud", "Private cloud", "On premises", "Local only"],
    typingEffort: "none",
  },
  "technical.backgroundJobs": {
    projectTypes: ["saas_application", "automation_system"],
    dependencies: ["product.features", "technical.integrations"],
    architectureImpact: "foundational",
    question: "Which work runs asynchronously?",
    answerMode: "long_text",
    typingEffort: "high",
  },
  "technical.security": {
    dependencies: ["technical.integrations"],
    architectureImpact: "foundational",
    category: "security_privacy",
    assumptionAllowed: false,
    question: "Which security constraints are mandatory?",
    answerMode: "long_text",
    typingEffort: "high",
  },
  "technical.privacy": {
    dependencies: ["technical.dataEntities", "business.targetUsers"],
    architectureImpact: "foundational",
    category: "security_privacy",
    assumptionAllowed: false,
    question: "Which privacy constraints apply?",
    answerMode: "long_text",
    typingEffort: "high",
  },
  "technical.deployment": {
    dependencies: ["technical.architectureStyle"],
    architectureImpact: "foundational",
    question: "Where must this be deployed?",
    answerMode: "single_select",
    options: ["Managed cloud", "Private cloud", "On premises", "Local only"],
    typingEffort: "none",
  },
  "technical.publicEnvironment": {
    safeDefault: { description: "No public environment values are required yet." },
    relevantFrom: "architecture_ready",
    question: "Which public settings are required?",
  },
  "quality.performance": {
    dependencies: ["product.features", "product.platforms"],
    architectureImpact: "structural",
    question: "Which performance target matters?",
    answerMode: "short_text",
    typingEffort: "medium",
  },
  "quality.accessibility": {
    dependencies: ["product.platforms"],
    architectureImpact: "structural",
    question: "Which accessibility target applies?",
    answerMode: "long_text",
    typingEffort: "high",
  },
  "quality.testing": {
    relevantFrom: "understanding_review",
    dependencies: ["product.features", "technical.architectureStyle"],
    safeDefault: { description: "Use the repository's standard validation layers." },
    question: "Which extra validation is required?",
  },
  "quality.observability": {
    relevantFrom: "understanding_review",
    dependencies: ["technical.backgroundJobs", "technical.integrations"],
    architectureImpact: "structural",
    question: "Which failures require alerts?",
    answerMode: "short_text",
    typingEffort: "medium",
  },
  "quality.localization": {
    dependencies: ["business.geography", "product.contentRequirements"],
    architectureImpact: "structural",
    question: "Which languages are required?",
    answerMode: "multi_select",
    options: ["English", "Bahasa Indonesia", "Other"],
    typingEffort: "low",
  },
  "quality.seo": {
    projectTypes: ["website", "saas_application"],
    dependencies: ["product.contentRequirements"],
    question: "Which search visibility is required?",
    answerMode: "short_text",
    typingEffort: "medium",
  },
  "execution.phases": {
    relevantFrom: "understanding_review",
    dependencies: ["scope.inScope", "product.features", "technical.architectureStyle"],
    question: "How should delivery be phased?",
    answerMode: "long_text",
    typingEffort: "high",
  },
  "execution.milestones": {
    relevantFrom: "understanding_review",
    dependencies: ["execution.phases"],
    question: "Which milestones prove progress?",
    answerMode: "long_text",
    typingEffort: "high",
  },
  "execution.acceptanceCriteria": {
    relevantFrom: "understanding_review",
    dependencies: ["business.goals", "product.features"],
    architectureImpact: "structural",
    question: "What proves the project is complete?",
    answerMode: "long_text",
    typingEffort: "high",
  },
  "execution.risks": {
    relevantFrom: "understanding_review",
    dependencies: ["scope.constraints", "technical.architectureStyle"],
    question: "Which delivery risks need mitigation?",
    answerMode: "long_text",
    typingEffort: "high",
  },
  "execution.openDecisionIds": {
    relevantFrom: "understanding_review",
    safeDefault: { description: "No additional open decisions are recorded." },
    question: "Which decisions remain open?",
  },
  "execution.currentTask": {
    relevantFrom: "architecture_ready",
    safeDefault: { description: "No implementation task is active yet." },
    question: "What is being implemented now?",
  },
  "execution.nextTask": {
    relevantFrom: "architecture_ready",
    safeDefault: { description: "Choose the next task after architecture review." },
    question: "What should be implemented next?",
  },
};

export function resolveFieldRule(
  path: FieldPath,
  section: ProjectSection,
  criticality: Criticality,
): Required<
  Pick<
    FieldRule,
    | "relevantFrom"
    | "dependencies"
    | "assumptionAllowed"
    | "architectureImpact"
    | "category"
    | "question"
    | "answerMode"
    | "typingEffort"
    | "answerability"
  >
> &
  FieldRule {
  const configured = FIELD_RULES[path] ?? {};
  const defaultMode: SuggestedAnswerMode = criticality === "low" ? "short_text" : "long_text";
  const defaultTyping: TypingEffort = defaultMode === "long_text" ? "high" : "medium";

  return {
    relevantFrom: "draft",
    dependencies: [],
    assumptionAllowed: criticality !== "blocking",
    architectureImpact: impactBySection[section],
    category: categoryBySection[section],
    question: `What should ${humanize(path.split(".")[1] ?? path)} be?`,
    answerMode: defaultMode,
    typingEffort: defaultTyping,
    answerability: 1,
    ...configured,
  };
}

export function safeDefaultApplies(rule: FieldRule, projectType: ProjectType | null): boolean {
  if (!rule.safeDefault) return false;
  if (!rule.safeDefault.projectTypes) return true;
  return projectType !== null && rule.safeDefault.projectTypes.includes(projectType);
}

export function projectTypeApplies(rule: FieldRule, projectType: ProjectType | null): boolean {
  if (!rule.projectTypes) return true;
  return projectType !== null && rule.projectTypes.includes(projectType);
}
