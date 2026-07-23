import { NextResponse } from "next/server";
import { getProject } from "@/lib/db";
import { analyzeDiscovery } from "@/domain/discovery";
import {
  oxzire3dWebsiteFixture,
  parseCanonicalProject,
} from "@/domain/project";
import { evidenceIdSchema } from "@/domain/project/identifiers";
import { contentFingerprint } from "@/domain/knowledge-graph";
import type { JsonValue } from "@/domain/knowledge-graph/types";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Generates a Mermaid flowchart from discovery analysis.
 * Shows project type, lifecycle, completeness, resolved fields, and open questions.
 */
function generateDiscoveryDiagram(
  title: string,
  discovery: ReturnType<typeof analyzeDiscovery>,
): string {
  const { projectType, questions, completeness, fields } = discovery;
  const relevantFields = fields.filter((f) => f.relevant && f.sufficientlyResolved);
  const fieldList = relevantFields.slice(0, 8).map((f) => {
    const shortPath = f.path.replace(/^(\w+)\./, "");
    return `  ${shortPath}`;
  });

  return [
    "flowchart LR",
    "  %% OXZI Discovery-Driven Architecture Map",
    `  title["${title}"]`,
    `  type{{"${projectType ?? "unclassified"}"}}`,
    `  completeness["${completeness.criticalCompleteness}% critical / ${completeness.overallCompleteness}% overall"]`,
    "",
    "  subgraph Lifecycle",
    `    lifecycle["Stage: ${discovery.lifecycle}"]`,
    questions.length > 0
      ? `    questions["${questions.length} open questions"]`
      : "    ready[✅ Ready for planning]",
    "  end",
    "",
    "  subgraph Resolved",
    ...(fieldList.length > 0
      ? fieldList
      : ["    placeholder[Submit a detailed brief to populate]"]),
    "  end",
    "",
    "  title --> type",
    "  type --> completeness",
    "  completeness --> lifecycle",
    questions.length > 0 ? "  lifecycle --> questions" : "  lifecycle --> ready",
  ].filter(Boolean).join("\n");
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  try {
    const project = getProject(id);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Build minimal canonical project from stored data
    const now = new Date().toISOString();
    const fp = contentFingerprint({ projectId: id } as unknown as JsonValue);
    const evidenceId = evidenceIdSchema.parse(
      `evidence_${fp.replace("fp_f1_", "").slice(0, 16)}`,
    );
    const clone = structuredClone(oxzire3dWebsiteFixture);

    clone.metadata.lifecycle = "draft";
    clone.metadata.approvalStatus = "not_requested";
    clone.metadata.lifecycleHistory = [clone.metadata.lifecycleHistory[0]!];
    clone.metadata.version.approvalStatus = "not_requested";
    delete clone.metadata.version.approvedAt;
    delete clone.metadata.version.approvedBy;

    const groups = [
      clone.identity, clone.business, clone.scope, clone.product,
      clone.visual, clone.technical, clone.quality, clone.execution,
    ];
    for (const group of groups) {
      for (const field of Object.values(group) as Array<Record<string, unknown>>) {
        if (field && typeof field === "object" && "value" in field) {
          field.value = null;
          field.status = "missing";
          field.confidence = 0;
          field.evidenceIds = [];
          field.approval = { status: "not_requested" };
          delete field.assumption;
          delete field.conflict;
        }
      }
    }

    clone.identity.name.value = project.title;
    clone.identity.name.status = "confirmed";
    clone.identity.name.confidence = 100;
    clone.identity.name.evidenceIds = [evidenceId];
    clone.identity.name.timestamps = { createdAt: now, updatedAt: now };
    clone.identity.name.approval = { status: "not_requested" };

    clone.identity.oneLiner.value = project.brief;
    clone.identity.oneLiner.status = "inferred";
    clone.identity.oneLiner.confidence = 60;
    clone.identity.oneLiner.evidenceIds = [evidenceId];
    clone.identity.oneLiner.timestamps = { createdAt: now, updatedAt: now };
    clone.identity.oneLiner.approval = { status: "not_requested" };

    clone.meta.evidence = [
      {
        id: evidenceId,
        sourceType: "prompt" as const,
        sourceId: "source_initial_prompt",
        interpretation: project.brief.slice(0, 500),
        createdAt: now,
      },
    ];
    clone.meta.assumptions = [];
    clone.meta.decisions = [];
    clone.meta.conflicts = [];
    clone.meta.completeness = {
      criticalCompleteness: 0,
      overallCompleteness: 0,
      contradictionCount: 0,
      blockingQuestionCount: 12,
      assumptionCount: 0,
    };

    const canonical = parseCanonicalProject(clone);
    const discovery = analyzeDiscovery(canonical);
    const diagram = generateDiscoveryDiagram(project.title, discovery);

    return NextResponse.json({
      projectId: id,
      dependencyDiagram: diagram,
      featureDiagram: diagram,
      fileCount: discovery.fields.filter((f) => f.relevant).length,
      edgeCount: 0,
      source: "discovery_engine",
    });
  } catch {
    return NextResponse.json({ error: "Visualization failed" }, { status: 500 });
  }
}
