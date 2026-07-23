import { NextResponse } from "next/server";
import { scanForDrift, type ConvergenceFinding } from "@/domain/convergence";
import { taskCardSchema, type TaskCard } from "@/domain/task-card";

type RouteContext = { params: Promise<{ projectId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { projectId } = await context.params;

  // In a real implementation, we'd load Task Cards from the project store.
  // For now, we build a default scan using the project's src/ directory.
  // The repo root is the current working directory.
  const repoRoot = process.cwd();
  const srcDir = "src";

  // Try to load project data to get task cards
  let taskCards: TaskCard[] = [];
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/projects/${projectId}`);
    if (res.ok) {
      const { project } = await res.json() as { project: { taskCards?: unknown[] } };
      if (project?.taskCards) {
        taskCards = project.taskCards.map((tc: unknown) => taskCardSchema.parse(tc)) as TaskCard[];
      }
    }
  } catch {
    // If we can't load project data, proceed with empty task cards
  }

  // If no task cards loaded, create a minimal one from project boundaries
  if (taskCards.length === 0) {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/projects/${projectId}`);
      if (res.ok) {
        // We have the project but no structured task cards — create a default scan
        // that at least detects overbuilt files
      }
    } catch {
      // proceed with empty
    }
  }

  const result = scanForDrift(projectId, taskCards, repoRoot, srcDir);

  return NextResponse.json({
    findings: result.findings,
    scanTimestamp: result.scanTimestamp,
    scanDurationMs: result.scanDurationMs,
    summary: {
      total: result.findings.length,
      overbuilt: result.findings.filter((f: ConvergenceFinding) => f.drift === "overbuilt").length,
      missing: result.findings.filter((f: ConvergenceFinding) => f.drift === "missing_implementation").length,
      architectureDrift: result.findings.filter((f: ConvergenceFinding) => f.drift === "architecture_drift").length,
      outOfScope: result.findings.filter((f: ConvergenceFinding) => f.drift === "out_of_scope" || f.drift === "protected_file").length,
      autoFixable: result.findings.filter((f: ConvergenceFinding) => f.autoFixable).length,
    },
  });
}
