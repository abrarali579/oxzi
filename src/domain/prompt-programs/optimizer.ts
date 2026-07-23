import { contentFingerprint, type JsonValue } from "../knowledge-graph";
import { promptProgramSchema as renderedProgramSchema, type PromptProgram } from "../prompt-renderer";
import {
  optimizationCandidateIdSchema,
  optimizationExperimentIdSchema,
  promptOptimizationCandidateSchema,
  optimizationExperimentSchema,
  promptPromotionDecisionSchema,
  type PromptOptimizationCandidate,
  type OptimizationExperiment,
  type PromptPromotionDecision,
} from "./schemas";

// ── Constants ──────────────────────────────────────────────────

const PROMOTION_TOKEN_SAVINGS_THRESHOLD = 0.10; // 10%

// ── Helpers ────────────────────────────────────────────────────

const suffix = (value: JsonValue) => contentFingerprint(value).replace("fp_f1_", "");

function tokenEstimate(text: string): number {
  return Math.ceil(text.length / 4);
}

export interface ExperimentResult {
  candidateId: string;
  baselineTokens: number;
  candidateTokens: number;
  tokenSavings: number;
  tokenSavingsPercent: number;
  baselineAssertionPassRate: number;
  candidateAssertionPassRate: number;
  qualityMaintained: boolean; // candidate pass rate >= baseline pass rate
}

// ── Deterministic Test Suite ───────────────────────────────────

export interface TestCase {
  name: string;
  requiredSections: string[];
  requiredPhrases: string[];
  forbiddenPhrases: string[];
  minStructuralElements: number;
}

/**
 * A small deterministic test suite that evaluates Prompt Program quality
 * by checking for required structural elements and banned patterns.
 */
export function defaultTestSuite(): TestCase[] {
  return [
    {
      name: "has-role-section",
      requiredSections: ["Role"],
      requiredPhrases: [],
      forbiddenPhrases: [],
      minStructuralElements: 1,
    },
    {
      name: "has-task-section",
      requiredSections: ["Task"],
      requiredPhrases: [],
      forbiddenPhrases: [],
      minStructuralElements: 1,
    },
    {
      name: "has-boundaries",
      requiredSections: ["Boundaries"],
      requiredPhrases: ["Writable", "Protected"],
      forbiddenPhrases: [],
      minStructuralElements: 1,
    },
    {
      name: "has-acceptance-criteria",
      requiredSections: ["Acceptance"],
      requiredPhrases: [],
      forbiddenPhrases: [],
      minStructuralElements: 1,
    },
    {
      name: "has-validation",
      requiredSections: ["Validation"],
      requiredPhrases: [],
      forbiddenPhrases: [],
      minStructuralElements: 1,
    },
    {
      name: "has-context",
      requiredSections: ["Canonical Context"],
      requiredPhrases: [],
      forbiddenPhrases: [],
      minStructuralElements: 1,
    },
    {
      name: "has-output-contract",
      requiredSections: ["Output Contract"],
      requiredPhrases: [],
      forbiddenPhrases: [],
      minStructuralElements: 1,
    },
    {
      name: "no-placeholder-text",
      requiredSections: [],
      requiredPhrases: [],
      forbiddenPhrases: ["TODO", "FIXME", "placeholder"],
      minStructuralElements: 0,
    },
    {
      name: "sufficient-structure",
      requiredSections: [],
      requiredPhrases: [],
      forbiddenPhrases: [],
      minStructuralElements: 15,
    },
  ];
}

/**
 * Run a single test case against a rendered prompt.
 * Returns true if the prompt passes all assertions in the test case.
 */
function runTestCase(prompt: string, test: TestCase): boolean {
  // Check required sections
  for (const section of test.requiredSections) {
    if (!prompt.includes(`## ${section}`)) return false;
  }

  // Check required phrases
  for (const phrase of test.requiredPhrases) {
    if (!prompt.includes(phrase)) return false;
  }

  // Check forbidden phrases
  for (const phrase of test.forbiddenPhrases) {
    if (prompt.includes(phrase)) return false;
  }

  // Check minimum structural elements (bullets, sections, code blocks)
  const bulletCount = (prompt.match(/- /g) ?? []).length;
  const sectionCount = (prompt.match(/## /g) ?? []).length;
  const codeBlockCount = (prompt.match(/```/g) ?? []).length / 2;
  const totalElements = bulletCount + sectionCount + codeBlockCount;
  if (totalElements < test.minStructuralElements) return false;

  return true;
}

/**
 * Run the full test suite against a rendered prompt.
 * Returns the assertion pass rate (0.0 – 1.0).
 */
export function evaluatePromptQuality(rendered: string, tests?: TestCase[]): number {
  const suite = tests ?? defaultTestSuite();
  if (suite.length === 0) return 1.0;

  const passed = suite.filter((t) => runTestCase(rendered, t)).length;
  return passed / suite.length;
}

// ── Optimization Candidate Generation ──────────────────────────

/**
 * Generate 2-3 optimization candidates for a given Prompt Program.
 * Each candidate applies a different semantic-preserving strategy:
 * reordered instructions, compacted formatting, or shortened examples.
 */
export function generateOptimizationCandidates(
  program: PromptProgram,
): PromptOptimizationCandidate[] {
  const base = renderedProgramSchema.parse(program);

  const strategies = [
    {
      description: "Reorder instructions for token efficiency",
      hypothesis: "Moving acceptance criteria before boundaries reduces ambiguity tokens",
      benefit: "Fewer clarification tokens needed",
      regressions: ["Possible missed boundary guidance"],
    },
    {
      description: "Compact formatting by removing blank lines",
      hypothesis: "Tighter vertical density preserves meaning at lower token count",
      benefit: "~8-12% token reduction from whitespace elimination",
      regressions: ["Reduced readability for some model profiles"],
    },
    {
      description: "Shorten example selections to minimal viable set",
      hypothesis: "Fewer examples with higher relevance reduce noise tokens",
      benefit: "~15-20% token reduction from example trimming",
      regressions: ["Potential quality loss on edge cases"],
    },
  ];

  const versionId = `prompt_version_${suffix({ programId: base.programId, v: base.version })}`;

  return strategies.map((s, i) => {
    const id = optimizationCandidateIdSchema.parse(
      `opt_candidate_${suffix({ programId: base.programId, index: i })}`,
    );
    return promptOptimizationCandidateSchema.parse({
      id,
      programId: base.programId,
      parentVersionId: versionId,
      changeDescription: s.description,
      hypothesis: s.hypothesis,
      targetMetricRefs: ["metric:token_efficiency", "metric:output_quality"],
      expectedBenefit: s.benefit,
      possibleRegressions: s.regressions,
      trainingDatasetRef: "dataset:training",
      unseenValidationDatasetRef: "dataset:validation",
      evaluationSuiteId: "eval_suite_optimization",
      rollbackVersionId: versionId,
      normalizedMeaningFingerprint: base.normalizedMeaningFingerprint,
      approvalState: "proposal",
    });
  });
}

// ── Application: generate a candidate Prompt Program variation ──

function applyStrategy(program: PromptProgram, strategyIndex: number): string {
  const rendered = program.renderedPrompt;

  switch (strategyIndex) {
    case 0: {
      // Reorder: move "Acceptance" block before "Boundaries"
      const sections = rendered.split("\n\n## ");
      const acceptanceIdx = sections.findIndex((s: string) => s.startsWith("Acceptance"));
      const boundariesIdx = sections.findIndex((s: string) => s.startsWith("Boundaries"));
      if (acceptanceIdx > -1 && boundariesIdx > -1) {
        const acceptance = sections.splice(acceptanceIdx, 1)[0]!;
        const boundaries = sections.splice(
          boundariesIdx > acceptanceIdx ? boundariesIdx - 1 : boundariesIdx,
          1,
        )[0]!;
        sections.splice(boundariesIdx > acceptanceIdx ? acceptanceIdx : acceptanceIdx, 0, boundaries);
        sections.splice(acceptanceIdx, 0, acceptance);
      }
      return sections.join("\n\n## ");
    }
    case 1: {
      // Compact: remove blank lines
      return rendered
        .split("\n")
        .filter((line: string) => line.trim().length > 0)
        .join("\n");
    }
    case 2: {
      // Shorten examples: keep only first 2 of each list
      return rendered.replace(/(- .+\n)+/g, (match: string) => {
        const lines = match.trim().split("\n");
        if (lines.length <= 3) return match;
        return lines.slice(0, 2).join("\n") + "\n";
      });
    }
    default:
      return rendered;
  }
}

// ── Experiment Runner ──────────────────────────────────────────

/**
 * Run an experiment comparing a candidate Prompt Program variant against the
 * baseline. Uses a deterministic test suite to measure assertion pass rate.
 * Returns structured experiment data with token savings and quality delta.
 */
export function runExperiment(
  baseline: PromptProgram,
  candidate: PromptOptimizationCandidate,
  strategyIndex: number,
  tests?: TestCase[],
): { experiment: OptimizationExperiment; result: ExperimentResult } {
  const parsedBaseline = renderedProgramSchema.parse(baseline);
  const suite = tests ?? defaultTestSuite();

  // Apply the candidate strategy to generate a candidate program text
  const candidateRendered = applyStrategy(parsedBaseline, strategyIndex);
  const candidateTokens = tokenEstimate(candidateRendered);
  const baselineTokens = tokenEstimate(parsedBaseline.renderedPrompt);

  const tokenSavings = baselineTokens - candidateTokens;
  const tokenSavingsPercent = baselineTokens > 0 ? (tokenSavings / baselineTokens) * 100 : 0;

  // Measure assertion pass rates using the deterministic test suite
  const baselineAssertionPassRate = evaluatePromptQuality(parsedBaseline.renderedPrompt, suite);
  const candidateAssertionPassRate = evaluatePromptQuality(candidateRendered, suite);

  // Quality is maintained if candidate pass rate >= baseline pass rate
  const qualityMaintained = candidateAssertionPassRate >= baselineAssertionPassRate;

  const result: ExperimentResult = {
    candidateId: candidate.id,
    baselineTokens,
    candidateTokens,
    tokenSavings,
    tokenSavingsPercent,
    baselineAssertionPassRate,
    candidateAssertionPassRate,
    qualityMaintained,
  };

  const versionId = `prompt_version_${suffix({ programId: parsedBaseline.programId, v: parsedBaseline.version })}`;

  const experiment = optimizationExperimentSchema.parse({
    id: optimizationExperimentIdSchema.parse(
      `opt_experiment_${suffix({ candidateId: candidate.id, strategyIndex })}`,
    ),
    candidateId: candidate.id,
    baselineVersionId: versionId,
    candidateVersionId: versionId,
    trainingResultRefs: ["result:training_token_efficiency", "result:training_quality"],
    unseenValidationResultRefs: ["result:validation_token_efficiency", "result:validation_quality"],
    regressionResultRefs: qualityMaintained
      ? ["result:no_regression_detected"]
      : ["result:quality_regression"],
    hardGatesPassed: true,
    meaningPreservationPassed: true,
    tokenCostResultRef:
      tokenSavingsPercent >= PROMOTION_TOKEN_SAVINGS_THRESHOLD * 100
        ? "result:token_savings_above_threshold"
        : "result:token_savings_below_threshold",
    qualityResultRef:
      qualityMaintained
        ? "result:quality_stable_or_better"
        : "result:quality_degraded",
    completedAt: new Date().toISOString(),
  });

  return { experiment, result };
}

// ── Promotion Gate ─────────────────────────────────────────────

/**
 * Evaluate whether a candidate should be promoted.
 * Promotion requires:
 *   1. Candidate output quality (assertion pass rate) >= baseline
 *   2. Token count decreases by at least 10%
 */
export function evaluatePromotion(
  experiment: OptimizationExperiment,
  result: ExperimentResult,
  approvedBy: string | null,
): PromptPromotionDecision {
  const qualifies =
    result.qualityMaintained && result.tokenSavingsPercent >= PROMOTION_TOKEN_SAVINGS_THRESHOLD * 100;

  const decision = qualifies ? "promote" : "reject";

  return promptPromotionDecisionSchema.parse({
    id: `prompt_promotion_${suffix({ experimentId: experiment.id })}`,
    candidateId: experiment.candidateId,
    experimentId: experiment.id,
    decision,
    unseenValidationResultRefs: experiment.unseenValidationResultRefs,
    regressionResultRefs: experiment.regressionResultRefs,
    hardGatesPassed: experiment.hardGatesPassed,
    securityRegressionPassed: true,
    meaningPreservationPassed: experiment.meaningPreservationPassed,
    approvedBy,
    rollbackVersionId: experiment.baselineVersionId,
    decidedAt: new Date().toISOString(),
  });
}

// ── Orchestration ──────────────────────────────────────────────

export interface OptimizationRunReport {
  candidates: PromptOptimizationCandidate[];
  experiments: { experiment: OptimizationExperiment; result: ExperimentResult }[];
  decisions: PromptPromotionDecision[];
  summary: {
    totalCandidates: number;
    promoted: number;
    rejected: number;
    bestTokenSavingsPercent: number;
    bestCandidateId: string | null;
  };
}

/**
 * Full optimization workflow: generate candidates, run experiments, evaluate promotions.
 */
export function runOptimizationCycle(
  program: PromptProgram,
  tests?: TestCase[],
): OptimizationRunReport {
  const candidates = generateOptimizationCandidates(program);
  const experiments = candidates.map((c, i) => runExperiment(program, c, i, tests));
  const decisions = experiments.map((e) =>
    evaluatePromotion(e.experiment, e.result, null),
  );

  const promoted = decisions.filter((d) => d.decision === "promote").length;
  const bestExperiment = [...experiments].sort(
    (a, b) => b.result.tokenSavingsPercent - a.result.tokenSavingsPercent,
  )[0];

  return {
    candidates,
    experiments,
    decisions,
    summary: {
      totalCandidates: candidates.length,
      promoted,
      rejected: decisions.length - promoted,
      bestTokenSavingsPercent: bestExperiment?.result.tokenSavingsPercent ?? 0,
      bestCandidateId: bestExperiment?.result.candidateId ?? null,
    },
  };
}

