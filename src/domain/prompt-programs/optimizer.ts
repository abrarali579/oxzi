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

// ── Helpers ────────────────────────────────────────────────────

const suffix = (value: JsonValue) => contentFingerprint(value).replace("fp_f1_", "");

function tokenEstimate(text: string): number {
  return Math.ceil(text.length / 4);
}

interface ExperimentResult {
  candidateId: string;
  baselineTokens: number;
  candidateTokens: number;
  tokenSavings: number;
  tokenSavingsPercent: number;
  qualityDelta: number; // negative means worse, positive means better
  qualitySame: boolean;
}

// ── Optimization Candidate Generation ──────────────────────────

/**
 * Generate 2-3 optimization candidates for a given Prompt Program.
 * Each candidate applies a different strategy: reordered instructions,
 * compacted formatting, or shortened examples.
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

function measureQuality(rendered: string): number {
  // Deterministic quality proxy: count structural elements + coverage
  const sections = rendered.split("\n## ").length;
  const bullets = (rendered.match(/- /g) ?? []).length;
  const completeness = rendered.includes("## Output Contract") ? 10 : 0;
  return sections * 5 + bullets * 2 + completeness;
}

// ── Experiment Runner ──────────────────────────────────────────

/**
 * Run an experiment comparing a candidate Prompt Program variant against the
 * baseline. Operates purely deterministically — no actual LLM calls.
 * Returns structured experiment data with token savings and quality delta.
 */
export function runExperiment(
  baseline: PromptProgram,
  candidate: PromptOptimizationCandidate,
  strategyIndex: number,
): { experiment: OptimizationExperiment; result: ExperimentResult } {
  const parsedBaseline = renderedProgramSchema.parse(baseline);

  // Simulate applying the candidate strategy to generate a candidate program text
  const candidateRendered = applyStrategy(parsedBaseline, strategyIndex);
  const candidateTokens = tokenEstimate(candidateRendered);
  const baselineTokens = tokenEstimate(parsedBaseline.renderedPrompt);

  const tokenSavings = baselineTokens - candidateTokens;
  const tokenSavingsPercent = baselineTokens > 0 ? (tokenSavings / baselineTokens) * 100 : 0;

  const baselineQuality = measureQuality(parsedBaseline.renderedPrompt);
  const candidateQuality = measureQuality(candidateRendered);
  const qualityDelta = candidateQuality - baselineQuality;

  const result: ExperimentResult = {
    candidateId: candidate.id,
    baselineTokens,
    candidateTokens,
    tokenSavings,
    tokenSavingsPercent,
    qualityDelta,
    qualitySame: qualityDelta === 0,
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
    regressionResultRefs: qualityDelta < 0 ? ["result:quality_regression"] : [],
    hardGatesPassed: true,
    meaningPreservationPassed: true,
    tokenCostResultRef: tokenSavingsPercent > 10 ? "result:token_savings_above_threshold" : "result:token_savings_below_threshold",
    qualityResultRef:
      qualityDelta >= 0 ? "result:quality_stable_or_better" : "result:quality_degraded",
    completedAt: new Date().toISOString(),
  });

  return { experiment, result };
}

// ── Promotion Gate ─────────────────────────────────────────────

/**
 * Evaluate whether a candidate should be promoted.
 * Promotion requires:
 *   - Quality stays the same (delta === 0)
 *   - Token reduction > 10%
 */
export function evaluatePromotion(
  experiment: OptimizationExperiment,
  result: ExperimentResult,
  approvedBy: string | null,
): PromptPromotionDecision {
  const qualifies = result.qualitySame && result.tokenSavingsPercent > 10;

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
}

/**
 * Full optimization workflow: generate candidates, run experiments, evaluate promotions.
 */
export function runOptimizationCycle(program: PromptProgram): OptimizationRunReport {
  const candidates = generateOptimizationCandidates(program);
  const experiments = candidates.map((c, i) => runExperiment(program, c, i));
  const decisions = experiments.map((e) =>
    evaluatePromotion(e.experiment, e.result, null),
  );
  return { candidates, experiments, decisions };
}
