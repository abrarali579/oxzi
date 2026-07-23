import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { runDivergence } from "@/domain/divergence";
import { divergenceRequestSchema, cognitiveFrameSchema, divergenceCostEstimateSchema } from "@/domain/divergence/schemas";
import { contentFingerprint } from "@/domain/knowledge-graph";
import type { JsonValue } from "@/domain/knowledge-graph/types";

export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    // Build a divergence request for a high-risk slice — Zod validates
    // the branded types at runtime via the schema parse.
    const fp = contentFingerprint({ userId: session.userId } as unknown as JsonValue).replace("fp_f1_", "").slice(0, 16);
    const request = divergenceRequestSchema.parse({
      id: `divergence_request_${fp}`,
      projectId: "project_divergence",
      decisionTaskCardId: "task_card_divergence",
      decision: "Evaluate implementation approach for high-risk feature",
      constraints: ["security", "performance", "maintainability"],
      acceptedFacts: ["User authentication required", "Real-time updates needed"],
      prohibitedOptions: ["Third-party auth providers", "WebSocket-free fallback"],
      evaluationCriteria: ["feasibility", "security", "performance", "maintainability"],
      uncertainty: ["Optimal data sync strategy", "Scaling requirements"],
      graphContextRef: "kg:divergence",
      mode: "standard" as const,
      branchCount: 2,
      tokenBudget: 10000,
      finalDecisionFormatRef: "format:task-card",
      approvalState: "pending" as const,
    });

    // Create two cognitive frames for the analysis — Zod validates branded types
    const rawFrames = [
      {
        metadata: {
          id: "frame_security_first",
          title: "Security-First Architecture",
          activationDomains: ["security", "authentication"],
          problemTypes: ["access_control", "data_protection"],
          risk: "high" as const,
          expectedNovelty: "medium" as const,
          contextOverheadTokens: 400,
          incompatibleConditions: [],
          evaluationHistoryRefs: [],
          version: "1",
          enabled: true,
        },
        frameInstruction: "Evaluate approaches prioritizing security and data protection.",
      },
      {
        metadata: {
          id: "frame_performance_first",
          title: "Performance-First Architecture",
          activationDomains: ["scalability", "performance"],
          problemTypes: ["real_time_sync", "throughput"],
          risk: "medium" as const,
          expectedNovelty: "low" as const,
          contextOverheadTokens: 300,
          incompatibleConditions: [],
          evaluationHistoryRefs: [],
          version: "1",
          enabled: true,
        },
        frameInstruction: "Evaluate approaches prioritizing speed and scalability.",
      },
    ];
    const frames = rawFrames.map((f) => cognitiveFrameSchema.parse(f));

    const cost = divergenceCostEstimateSchema.parse({
      sharedBaseContextTokens: 500,
      contextPerBranchTokens: 300,
      branchCount: 2,
      repeatedBranchContextTokens: 600,
      expectedBranchOutputTokens: 200,
      criticTokens: 200,
      clusteringTokens: 100,
      deepeningCount: 0,
      deepeningTokens: 0,
      orchestrationOverheadTokens: 150,
      totalEstimatedTokens: 1950,
      latencyEstimateMs: null,
      expectedDecisionValue: "high" as const,
    });

    const report = runDivergence(request, frames, cost);
    return NextResponse.json({ report });
  } catch {
    return NextResponse.json({ error: "Divergence computation failed" }, { status: 500 });
  }
}
