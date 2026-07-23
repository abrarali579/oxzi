import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { parseRepository, isSizeBoundaryExceeded } from "@/domain/repository-intelligence";
import { generateMermaidDiagram, generateFeatureDiagram } from "@/domain/visual-architecture";
import { realpathSync } from "node:fs";
import { resolve } from "node:path";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    // Parse the current working directory as a repository
    const rootPath = realpathSync(resolve(process.cwd()));
    const result = parseRepository({ rootPath });

    if (isSizeBoundaryExceeded(result)) {
      return NextResponse.json({ error: result.message }, { status: 413 });
    }

    const dependencyDiagram = generateMermaidDiagram(result);
    const featureDiagram = generateFeatureDiagram(result);

    return NextResponse.json({
      projectId: id,
      dependencyDiagram,
      featureDiagram,
      fileCount: result.files.length,
      edgeCount: result.edges.length,
    });
  } catch {
    return NextResponse.json({ error: "Visualization failed" }, { status: 500 });
  }
}
