import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getSession } from "@/lib/auth";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Build history from project's version changes
  const history = [
    {
      version: 1,
      timestamp: project.createdAt.toISOString(),
      event: "Project created",
      title: project.title,
      snapshot: {
        title: project.title,
        brief: project.brief,
        canonicalState: project.canonicalState ? JSON.parse(project.canonicalState) : null,
      },
    },
  ];

  // Add update records if version > 1 (tracked via updatedAt changes)
  if (project.updatedAt > project.createdAt) {
    history.push({
      version: 2,
      timestamp: project.updatedAt.toISOString(),
      event: "Project updated",
      title: project.title,
      snapshot: {
        title: project.title,
        brief: project.brief,
        canonicalState: project.canonicalState ? JSON.parse(project.canonicalState) : null,
      },
    });
  }

  return NextResponse.json({ history, currentVersion: history.length });
}
