/* eslint-disable @typescript-eslint/no-explicit-any */
import { z } from "zod";
import { contentFingerprint, type JsonValue } from "@/domain/knowledge-graph";
import {
  divergenceRequestSchema,
  cognitiveFrameSchema,
  candidateIdeaSchema,
  candidateScoreSchema,
  candidateClusterSchema,
  trapFindingSchema,
  divergenceReportSchema,
  divergenceActivationDecisionSchema,
  divergenceCostEstimateSchema,
  frameSelectionSchema,
} from "./schemas";

type DivergenceRequest = z.infer<typeof divergenceRequestSchema>;
type CognitiveFrame = z.infer<typeof cognitiveFrameSchema>;
type CandidateIdea = z.infer<typeof candidateIdeaSchema>;
type CandidateScore = z.infer<typeof candidateScoreSchema>;
type ActivationDecision = z.infer<typeof divergenceActivationDecisionSchema>;
type CostEstimate = z.infer<typeof divergenceCostEstimateSchema>;
type DivergenceReport = z.infer<typeof divergenceReportSchema>;
type TrapFinding = z.infer<typeof trapFindingSchema>;
type CandidateCluster = z.infer<typeof candidateClusterSchema>;

// ── Simulated AI candidate generation ──────────────────────────

function generateCandidate(
  request: DivergenceRequest,
  frame: CognitiveFrame,
  branchIndex: number,
  branchCount: number,
): CandidateIdea {
  const approach = `Branch ${branchIndex + 1}/${branchCount}: "${frame.metadata.title}" approach — ${request.decision}`;
  return candidateIdeaSchema.parse({
    id: `candidate_${contentFingerprint({
      requestId: request.id,
      branchIndex,
    } as unknown as JsonValue)
      .replace("fp_f1_", "")
      .slice(0, 16)}` as any,
    requestId: request.id,
    branchId: `branch_${branchIndex}` as any,
    frameId: frame.metadata.id,
    title: `Option ${branchIndex + 1}: ${frame.metadata.title}`,
    approach,
    assumptions: request.acceptedFacts,
    risks: [`${frame.metadata.risk} risk per frame`],
    firstValidationStep: `Validate ${request.evaluationCriteria[0] ?? "outcome"}`,
    evidenceRefs: [],
    siblingResultRefs: [],
    approvalState: "proposal" as const,
    generatorProfile: {
      profileId: "agent_profile_divergence" as any,
      revision: 1,
      fingerprint: contentFingerprint({}),
    },
    inputContextFingerprint: contentFingerprint({}),
    outputHash: `sha256:${"a".repeat(64)}`,
    createdAt: new Date().toISOString(),
    tokenUsage: null,
    privacyClassification: "internal" as const,
    version: "1.0.0",
    freshness: "current" as const,
  });
}

function scoreCandidate(candidate: CandidateIdea, cost: CostEstimate): CandidateScore {
  return candidateScoreSchema.parse({
    candidateId: candidate.id,
    dimension: "viability",
    value: Math.round(50 + Math.random() * 50),
    status: "passed",
    reason: `Score based on ${cost.totalEstimatedTokens} token cost`,
    evaluator: {
      profileId: "agent_profile_critic" as any,
      revision: 1,
      fingerprint: contentFingerprint({}),
    },
    confidence: Math.round(60 + Math.random() * 40),
    evidenceRefs: [],
    version: "1",
    hardConstraint: false,
  });
}

function detectCandidateTraps(candidates: CandidateIdea[]): TrapFinding[] {
  return candidates.map((c) =>
    trapFindingSchema.parse({
      id: `trap_${contentFingerprint({ candidateId: c.id } as unknown as JsonValue)
        .replace("fp_f1_", "")
        .slice(0, 16)}` as any,
      candidateId: c.id,
      category: "false_economy",
      severity: "low" as const,
      explanation: "Division of labor cannot reduce all sequential dependencies.",
      evidenceRefs: [],
      mitigation: "Review scope and dependencies before proceeding.",
      rejectCandidate: false,
    }),
  );
}

function clusterCandidates(candidates: CandidateIdea[]): CandidateCluster[] {
  return candidates.length > 0
    ? [
        candidateClusterSchema.parse({
          id: `cluster_${contentFingerprint({ count: candidates.length } as unknown as JsonValue)
            .replace("fp_f1_", "")
            .slice(0, 16)}` as any,
          requestId: candidates[0]!.requestId,
          label: `Cluster of ${candidates.length} candidates`,
          underlyingApproach: candidates.map((c) => c.approach).join("; "),
          candidateIds: candidates.map((c) => c.id),
          evidenceRefs: [],
          version: "1",
        }),
      ]
    : [];
}

// ── Public API ─────────────────────────────────────────────────

export function activateDivergence(
  request: DivergenceRequest,
  availableFrames: CognitiveFrame[],
  tokenLedger: { totalNet: number },
): ActivationDecision {
  const parsedRequest = divergenceRequestSchema.parse(request);
  const parsedFrames = availableFrames.map((f) => cognitiveFrameSchema.parse(f));

  const riskLevel = parsedRequest.constraints.some((c) => /security|safety|critical/i.test(c))
    ? "high"
    : parsedRequest.constraints.some((c) => /cost|performance/i.test(c))
      ? "medium"
      : "low";

  const branchCount = parsedRequest.branchCount ?? 2;
  const frameCount = parsedFrames.length;
  const sharedBase = 500;
  const perBranch = 300;
  const repeated = perBranch * branchCount;
  const expectedBranchOutput = 200;
  const critic = 200;
  const clustering = 100;
  const deepening = 0;
  const deepeningTokens = 0;
  const orchestration = 150;
  const total =
    sharedBase + repeated + expectedBranchOutput * branchCount + critic + clustering + deepening * deepeningTokens + orchestration;
  const budgetOk = total <= parsedRequest.tokenBudget;
  const tokenOk = tokenLedger.totalNet + total <= parsedRequest.tokenBudget;

  return divergenceActivationDecisionSchema.parse({
    requestId: parsedRequest.id,
    decision: budgetOk && tokenOk ? "recommended" : "blocked_by_budget",
    reason: !budgetOk
      ? `Estimated cost ${total} exceeds budget ${parsedRequest.tokenBudget}`
      : !tokenOk
        ? `Token ledger shows insufficient remaining budget`
        : `Activation recommended: ${frameCount} frames, ${branchCount} branches within budget`,
    costEstimate: divergenceCostEstimateSchema.parse({
      sharedBaseContextTokens: sharedBase,
      contextPerBranchTokens: perBranch,
      branchCount,
      repeatedBranchContextTokens: repeated,
      expectedBranchOutputTokens: expectedBranchOutput,
      criticTokens: critic,
      clusteringTokens: clustering,
      deepeningCount: deepening,
      deepeningTokens,
      orchestrationOverheadTokens: orchestration,
      totalEstimatedTokens: total,
      latencyEstimateMs: null,
      expectedDecisionValue: riskLevel === "high" ? "high" : "medium",
    }),
    availableBudgetTokens: parsedRequest.tokenBudget,
    selectedMode: parsedRequest.mode,
  });
}

export function runDivergence(
  request: DivergenceRequest,
  selectedFrames: CognitiveFrame[],
  cost: CostEstimate,
): DivergenceReport {
  const parsedRequest = divergenceRequestSchema.parse(request);
  const parsedFrames = selectedFrames.map((f) => cognitiveFrameSchema.parse(f));

  // Step 1: Select frames based on task/risk
  frameSelectionSchema.parse({
    requestId: parsedRequest.id,
    selectedFrameIds: parsedFrames.map((f) => f.metadata.id),
    reasonByFrame: Object.fromEntries(parsedFrames.map((f) => [f.metadata.id, f.metadata.title])),
    estimatedOverheadTokens: parsedFrames.reduce(
      (sum, f) => sum + (f.metadata.contextOverheadTokens ?? 0),
      0,
    ),
    evaluationSuiteId: `eval_suite_divergence` as any,
    userApprovalRequired: parsedRequest.approvalState === "pending",
  });

  // Step 2: Generate candidate ideas (simulated parallel branches)
  const candidates: CandidateIdea[] = [];
  for (let i = 0; i < parsedRequest.branchCount && i < parsedFrames.length; i++) {
    candidates.push(
      generateCandidate(parsedRequest, parsedFrames[i]!, i, parsedRequest.branchCount),
    );
  }

  // Step 3: Score each candidate
  const scores: CandidateScore[] = candidates.map((c) => scoreCandidate(c, cost));

  // Step 4: Detect traps
  const traps = detectCandidateTraps(candidates);

  // Step 5: Cluster candidates
  const clusters = clusterCandidates(candidates);

  return {
    requestId: parsedRequest.id,
    candidateIds: candidates.map((c) => c.id),
    clusters,
    scores,
    traps,
    deepenedCandidates: [],
    shortlistIds: candidates.map((c) => c.id),
    nonObviousViableCandidateId: candidates.length > 1 ? candidates[1]!.id : null,
    recommendationCandidateId: candidates[0]?.id ?? null,
    unresolvedDecision: null,
    firstValidationStep: candidates[0]?.firstValidationStep ?? "",
    status: "proposal",
    artifactRefs: [],
    version: "1.0.0",
  } as any;
}
