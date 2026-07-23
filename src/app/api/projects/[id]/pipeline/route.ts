import { NextResponse } from "next/server";
import { generatePipeline } from "@/lib/pipeline/generateFromProject";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/projects/[id]/pipeline
 *
 * Full dynamic pipeline: Extraction → Discovery → Governance →
 * Planning/Slicing → Task Card compilation.
 * Uses live project data only — no hardcoded fixtures.
 */
export async function POST(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  try {
    const result = generatePipeline(id);

    if (result.errors.length > 0 && !result.canonical) {
      return NextResponse.json(
        { error: result.errors.join("; ") },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: result.errors.length === 0,
      warnings: result.errors,
      projectType: result.canonical?.identity?.projectType?.value ?? null,
      discovery: {
        completeness: result.discovery.completeness,
        lifecycle: result.discovery.lifecycle,
        questions: result.discovery.questions.length,
      },
      governance: result.governanceReport
        ? {
            health: result.governanceReport.health,
            readiness: result.governanceReport.readiness,
            findingsCount: result.governanceReport.structuralFindings.length,
          }
        : null,
      extractionUpdateCount: result.extraction?.updates?.length ?? 0,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Pipeline execution failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
