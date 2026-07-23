import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { parseRepository } from "@/domain/repository-intelligence";
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
    const manifest = parseRepository({ rootPath });

    const dependencyDiagram = generateMermaidDiagram(manifest);
    const featureDiagram = generateFeatureDiagram(manifest);

    return NextResponse.json({
      projectId: id,
      dependencyDiagram,
      featureDiagram,
      fileCount: manifest.files.length,
      edgeCount: manifest.edges.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Visualization failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
