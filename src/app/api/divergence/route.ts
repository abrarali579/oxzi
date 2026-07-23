import { NextResponse } from "next/server";
import { runDivergence } from "@/domain/divergence";
import { divergenceRequestSchema, cognitiveFrameSchema, divergenceCostEstimateSchema } from "@/domain/divergence/schemas";
import { contentFingerprint } from "@/domain/knowledge-graph";
import { prisma } from "@/lib/db/client";
import { getSession } from "@/lib/auth";
import { getProject as getFileProject } from "@/lib/db";
import { buildCanonicalProjectFromBrief } from "@/domain/project/from-brief";
import type { JsonValue } from "@/domain/knowledge-graph/types";

export async function POST(request: Request) {
  try {
    // ── Parse projectId from request body ──────────────────────
    let body: { projectId?: string };
    try {
      body = (await request.json()) as { projectId?: string };
    } catch {
      return NextResponse.json({ error: "projectId is required" }, { status: 400 });
    }

    const { projectId } = body;
    if (!projectId) {
      return NextResponse.json({ error: "projectId is required" }, { status: 400 });
    }

    // ── Load the real project ──────────────────────────────────
    // Try DB first (for authenticated users), then fall back to the file store —
    // same dual-lookup pattern as taskcard/restore/history, so projects created
    // via the authenticated Prisma-backed flow aren't 404'd here.
    const session = await getSession();
    const dbProject = session ? await prisma.project.findUnique({ where: { id: projectId } }) : null;
    const fileProject = dbProject ? null : getFileProject(projectId);
    if (!dbProject && !fileProject) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    const projectTitle = dbProject ? dbProject.title : fileProject!.title;
    const projectBrief = dbProject ? dbProject.brief : fileProject!.brief;

    // ── Build canonical state from title + brief ───────────────
    const { canonical } = buildCanonicalProjectFromBrief(projectTitle, projectBrief);

    // ── Derive request fields from canonical + project ─────────
    const oneLiner = canonical.identity.oneLiner.status !== "missing" && canonical.identity.oneLiner.value
      ? canonical.identity.oneLiner.value
      : null;
    const briefExcerpt = oneLiner
      ? oneLiner.length > 200
        ? `${oneLiner.slice(0, 200)}…`
        : oneLiner
      : null;
    const decision = briefExcerpt
      ? `Evaluate: ${briefExcerpt}`
      : `Evaluate implementation approach for ${projectTitle}`;

    const constraints =
      canonical.scope.constraints.value && canonical.scope.constraints.value.length > 0
        ? canonical.scope.constraints.value
        : ["security", "performance", "maintainability"];

    const acceptedFacts: string[] = (() => {
      const facts: string[] = [];
      const goals = canonical.business.goals.value;
      if (goals && goals.length > 0) {
        for (const g of goals) {
          facts.push(`${g.name}: ${g.outcome}`);
        }
      }
      if (facts.length === 0) {
        return ["User authentication required", "Real-time updates needed"];
      }
      return facts;
    })();

    const fp = contentFingerprint({
      projectId,
      decision,
      constraints,
      acceptedFacts,
    } as unknown as JsonValue)
      .replace("fp_f1_", "")
      .slice(0, 16);
    // The divergence schema expects "project_" prefix, but the database stores
    // project IDs with "proj_" prefix. Normalize for schema compatibility.
    const schemaProjectId = projectId.startsWith("proj_")
      ? `project_${projectId.slice(5)}`
      : projectId;
    const request_data = divergenceRequestSchema.parse({
      id: `divergence_request_${fp}`,
      projectId: schemaProjectId,
      decisionTaskCardId: "task_card_divergence",
      decision,
      constraints,
      acceptedFacts,
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

    const report = runDivergence(request_data, frames, cost);
    return NextResponse.json({ report });
  } catch {
    return NextResponse.json({ error: "Divergence computation failed" }, { status: 500 });
  }
}
