import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getSession } from "@/lib/auth";
import { getProject as getFileProject, updateProject as updateFileProject } from "@/lib/db";
import { compileTaskCard } from "@/domain/task-card";
import { implementationReadySpecificationFixture } from "@/domain/governance";
import { approvedImplementationSlice } from "@/domain/planning";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const session = await getSession();

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

    const taskCardMarkdown = `# Task Card\n\n**Candidate:** ${candidateId}\n\n**Goal:** ${card.taskCard.goal}\n\n**Scope:** ${card.taskCard.scope.join(", ")}\n\n**Boundaries:**\n- Writable: ${card.taskCard.fileBoundaries.writableFiles.join(", ")}\n- Read-only: ${card.taskCard.fileBoundaries.readOnlyFiles.join(", ")}\n- Protected: ${card.taskCard.fileBoundaries.protectedFiles.join(", ")}\n\n**Validations:**\n${card.taskCard.validations.map((v) => `- ${v.command}`).join("\n")}`;

    if (session) {
      const dbProject = await prisma.project.findUnique({ where: { id } });
      if (dbProject) {
        await prisma.project.update({
          where: { id },
          data: {
            generatedFiles: JSON.stringify({ "task-card.md": taskCardMarkdown }),
          },
        });

        return NextResponse.json({
          taskCard: {
            id: card.taskCard.taskCardId,
            goal: card.taskCard.goal,
            scope: card.taskCard.scope,
          },
        });
      }
    }

    // Anonymous or file-based project: store the Task Card in the file store
    const fileProject = getFileProject(id);
    if (!fileProject) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    updateFileProject(id, {
      generatedFiles: { ...(fileProject.generatedFiles ?? {}), "task-card.md": taskCardMarkdown },
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
