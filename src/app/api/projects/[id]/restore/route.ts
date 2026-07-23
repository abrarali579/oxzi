import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getSession } from "@/lib/auth";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const { version } = (await request.json()) as { version?: number };

    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

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
  } catch (error) {
    const message = error instanceof Error ? error.message : "Restore failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
