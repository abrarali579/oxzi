import { NextResponse } from "next/server";
import { getProject } from "@/lib/db";
import { analyzeDiscovery } from "@/domain/discovery";
import { buildCanonicalProjectFromBrief } from "@/domain/project/from-brief";

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

    // Build a CanonicalProject from the brief, with extraction updates
    // already folded onto the matching fields — same builder /generate uses,
    // so the map reflects what was actually written in the brief instead of
    // only the title/one-liner.
    const { canonical } = buildCanonicalProjectFromBrief(project.title, project.brief);
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
