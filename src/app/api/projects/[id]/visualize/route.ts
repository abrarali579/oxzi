import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
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
 * Attempt to parse the current working directory as a repository and generate
 * Mermaid diagrams. Falls back gracefully to project-level diagrams when
 * oxc-parser native bindings are unavailable (e.g. in Turbopack dev).
 */
function generateProjectDiagram(
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
    "  %% Generated from discovery analysis — no repository parsing required",
    "",
    `  title[${title}]`,
    `  type{{Project Type: ${projectType ?? "unclassified"}}}`,
    `  completeness[Completeness: ${completeness.criticalCompleteness}%]`,
    "",
    "  subgraph Discovery",
    `    lifecycle[Lifecycle: ${discovery.lifecycle}]`,
    questions.length > 0 ? `    questions[${questions.length} open questions]` : "    ready[Ready for planning ✅]",
    "  end",
    "",
    "  subgraph ResolvedFields",
    ...(fieldList.length > 0 ? fieldList : ["    placeholder[Run discovery with more detail]"]),
    "  end",
    "",
    `  title --> type`,
    `  type --> completeness`,
    `  completeness --> lifecycle`,
    questions.length > 0 ? "  lifecycle --> questions" : "  lifecycle --> ready",
  ].filter(Boolean).join("\n");
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const project = getProject(id);
    let dependencyDiagram = "";
    let featureDiagram = "";
    let fileCount = 0;
    let edgeCount = 0;

    // ── Attempt repository-level parsing ────────────────────
    let repoFailed = true;
    try {
      const { realpathSync: realpath } = await import("node:fs");
      const { resolve } = await import("node:path");
      const { parseRepository, isSizeBoundaryExceeded } = await import(
        "@/domain/repository-intelligence"
      );
      const { generateMermaidDiagram, generateFeatureDiagram } = await import(
        "@/domain/visual-architecture"
      );

      const rootPath = realpath(resolve(process.cwd()));
      const result = parseRepository({ rootPath });

      if (!isSizeBoundaryExceeded(result)) {
        dependencyDiagram = generateMermaidDiagram(result);
        featureDiagram = generateFeatureDiagram(result);
        fileCount = result.files.length;
        edgeCount = result.edges.length;
        repoFailed = false;
      }
    } catch {
      // oxc-parser native bindings unavailable — fall through to project-level diagrams
    }

    // ── Fallback: project-level discovery-driven diagrams ───
    if (repoFailed) {
      if (project) {
        const now = new Date().toISOString();
        const fp = contentFingerprint({ projectId: id } as unknown as JsonValue);
        const evidenceId = evidenceIdSchema.parse(`evidence_${fp.replace("fp_f1_", "").slice(0, 16)}`);
        const clone = structuredClone(oxzire3dWebsiteFixture);

        // Build minimal project
        clone.metadata.lifecycle = "draft";
        clone.metadata.approvalStatus = "not_requested";
        clone.metadata.lifecycleHistory = [clone.metadata.lifecycleHistory[0]!];
        clone.metadata.version.approvalStatus = "not_requested";
        delete clone.metadata.version.approvedAt;
        delete clone.metadata.version.approvedBy;

        const groups = [clone.identity, clone.business, clone.scope, clone.product, clone.visual, clone.technical, clone.quality, clone.execution];
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

        clone.meta.evidence = [{ id: evidenceId, sourceType: "prompt" as const, sourceId: "source_initial_prompt", interpretation: project.brief.slice(0, 500), createdAt: now }];
        clone.meta.assumptions = [];
        clone.meta.decisions = [];
        clone.meta.conflicts = [];
        clone.meta.completeness = { criticalCompleteness: 0, overallCompleteness: 0, contradictionCount: 0, blockingQuestionCount: 12, assumptionCount: 0 };

        const canonical = parseCanonicalProject(clone);
        const discovery = analyzeDiscovery(canonical);
        dependencyDiagram = generateProjectDiagram(project.title, discovery);
        featureDiagram = dependencyDiagram;
        fileCount = discovery.fields.filter((f) => f.relevant).length;
        edgeCount = 0;
      } else {
        dependencyDiagram = "flowchart LR\n  missing[Project not found]";
        featureDiagram = "flowchart LR\n  missing[Project not found]";
      }
    }

    return NextResponse.json({
      projectId: id,
      dependencyDiagram,
      featureDiagram,
      fileCount,
      edgeCount,
      source: repoFailed ? "discovery_engine" : "repository_parser",
    });
  } catch {
    return NextResponse.json({ error: "Visualization failed" }, { status: 500 });
  }
}
