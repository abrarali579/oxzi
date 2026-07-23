import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getSession } from "@/lib/auth";
import { getProject as getFileProject } from "@/lib/db";

type RouteContext = { params: Promise<{ id: string }> };
type HistoryEntry = {
  version: number;
  timestamp: string;
  event: string;
  title: string;
  snapshot: { title: string; brief: string; canonicalState: unknown };
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const session = await getSession();

  if (session) {
    const project = await prisma.project.findUnique({ where: { id } });
    if (project) {
      const history: HistoryEntry[] = [
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
  }

  // Anonymous or file-based project: build history from the file store
  const fileProject = getFileProject(id);
  if (!fileProject) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const history: HistoryEntry[] = [
    {
      version: 1,
      timestamp: fileProject.createdAt,
      event: "Project created",
      title: fileProject.title,
      snapshot: {
        title: fileProject.title,
        brief: fileProject.brief,
        canonicalState: fileProject.canonicalState,
      },
    },
  ];

  if (fileProject.updatedAt > fileProject.createdAt) {
    history.push({
      version: 2,
      timestamp: fileProject.updatedAt,
      event: "Project updated",
      title: fileProject.title,
      snapshot: {
        title: fileProject.title,
        brief: fileProject.brief,
        canonicalState: fileProject.canonicalState,
      },
    });
  }

  return NextResponse.json({ history, currentVersion: history.length });
}
