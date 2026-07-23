import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getSession } from "@/lib/auth";
import { compileTaskCard } from "@/domain/task-card";
import { implementationReadySpecificationFixture } from "@/domain/governance";
import { approvedImplementationSlice } from "@/domain/planning";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const { candidateId } = (await request.json()) as { candidateId?: string };
    if (!candidateId) {
      return NextResponse.json({ error: "candidateId is required" }, { status: 400 });
    }

    // Compile a Task Card from the approved slice
    const card = compileTaskCard({
      slice: approvedImplementationSlice,
      constitutionRules: implementationReadySpecificationFixture.constitutionRules.map(
        (r: { rule: unknown }) => r.rule,
      ),
    });

    if (!card.taskCard) {
      return NextResponse.json({ error: "Task Card compilation failed" }, { status: 500 });
    }

    // Store the generated Task Card in the project
    await prisma.project.update({
      where: { id },
      data: {
        generatedFiles: JSON.stringify({
          "task-card.md": `# Task Card\n\n**Candidate:** ${candidateId}\n\n**Goal:** ${card.taskCard.goal}\n\n**Scope:** ${card.taskCard.scope.join(", ")}\n\n**Boundaries:**\n- Writable: ${card.taskCard.fileBoundaries.writableFiles.join(", ")}\n- Read-only: ${card.taskCard.fileBoundaries.readOnlyFiles.join(", ")}\n- Protected: ${card.taskCard.fileBoundaries.protectedFiles.join(", ")}\n\n**Validations:**\n${card.taskCard.validations.map((v) => `- ${v.command}`).join("\n")}`,
        }),
      },
    });

    return NextResponse.json({
      taskCard: {
        id: card.taskCard.taskCardId,
        goal: card.taskCard.goal,
        scope: card.taskCard.scope,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create Task Card";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
