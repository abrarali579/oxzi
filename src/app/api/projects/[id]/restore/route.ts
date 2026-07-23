import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getSession } from "@/lib/auth";
import { getProject as getFileProject, updateProject as updateFileProject } from "@/lib/db";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const session = await getSession();

  try {
    const { version } = (await request.json()) as { version?: number };

    if (session) {
      const project = await prisma.project.findUnique({ where: { id } });
      if (project) {
        // Create a new project version with incremented version number
        const updated = await prisma.project.update({
          where: { id },
          data: {
            version: { increment: 1 },
            updatedAt: new Date(),
          },
        });

        return NextResponse.json({
          success: true,
          project: {
            id: updated.id,
            version: updated.version,
            restoredFrom: version ?? 1,
          },
        });
      }
    }

    // Anonymous or file-based project: bump updatedAt to mark a new version
    const fileProject = getFileProject(id);
    if (!fileProject) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    updateFileProject(id, {});

    return NextResponse.json({
      success: true,
      project: {
        id: fileProject.id,
        version: 2,
        restoredFrom: version ?? 1,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Restore failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
