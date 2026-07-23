import { type NextRequest, NextResponse } from "next/server";
import { getSession, requireOrganizationAccess } from "@/lib/auth";
import { prisma } from "@/lib/db/client";
import {
  getProject as getFileProject,
  updateProject as updateFileProject,
  deleteProject as deleteFileProject,
} from "@/lib/db";
import type { ProjectRecord } from "@/lib/db";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const session = await getSession();

  // Try DB first (for authenticated users)
  if (session) {
    const dbProject = await prisma.project.findUnique({ where: { id } });
    if (dbProject) {
      await requireOrganizationAccess(session.userId, dbProject.organizationId);
      return NextResponse.json({
        project: {
          id: dbProject.id,
          title: dbProject.title,
          brief: dbProject.brief,
          createdAt: dbProject.createdAt.toISOString(),
          updatedAt: dbProject.updatedAt.toISOString(),
          canonicalState: dbProject.canonicalState ? JSON.parse(dbProject.canonicalState) : null,
          discoveryResult: dbProject.discoveryResult ? JSON.parse(dbProject.discoveryResult) : null,
          extractionResult: dbProject.extractionResult
            ? JSON.parse(dbProject.extractionResult)
            : null,
          generatedFiles: dbProject.generatedFiles ? JSON.parse(dbProject.generatedFiles) : null,
        },
      });
    }
  }

  // Fall back to file store
  const project = getFileProject(id);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }
  return NextResponse.json({ project });
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const session = await getSession();

  // Try DB update (for authenticated users)
  if (session) {
    const dbProject = await prisma.project.findUnique({ where: { id } });
    if (dbProject) {
      await requireOrganizationAccess(session.userId, dbProject.organizationId);
      const body = (await request.json()) as Record<string, unknown>;
      const updateData: Record<string, unknown> = {};
      if (body.title !== undefined) updateData.title = body.title as string;
      if (body.brief !== undefined) updateData.brief = body.brief as string;
      if (body.canonicalState !== undefined)
        updateData.canonicalState = JSON.stringify(body.canonicalState);
      if (body.discoveryResult !== undefined)
        updateData.discoveryResult = JSON.stringify(body.discoveryResult);
      if (body.extractionResult !== undefined)
        updateData.extractionResult = JSON.stringify(body.extractionResult);
      if (body.generatedFiles !== undefined)
        updateData.generatedFiles = JSON.stringify(body.generatedFiles);

      const updated = await prisma.project.update({
        where: { id },
        data: updateData,
      });

      return NextResponse.json({
        project: {
          id: updated.id,
          title: updated.title,
          brief: updated.brief,
          createdAt: updated.createdAt.toISOString(),
          updatedAt: updated.updatedAt.toISOString(),
          canonicalState: updated.canonicalState ? JSON.parse(updated.canonicalState) : null,
          discoveryResult: updated.discoveryResult ? JSON.parse(updated.discoveryResult) : null,
          extractionResult: updated.extractionResult ? JSON.parse(updated.extractionResult) : null,
          generatedFiles: updated.generatedFiles ? JSON.parse(updated.generatedFiles) : null,
        },
      });
    }
  }

  // Fall back to file store
  const existing = getFileProject(id);
  if (!existing) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const updates = body as Partial<Omit<ProjectRecord, "id" | "createdAt">>;
    const updated = updateFileProject(id, updates);
    return NextResponse.json({ project: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update project";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const session = await getSession();

  if (session) {
    const dbProject = await prisma.project.findUnique({ where: { id } });
    if (dbProject) {
      await requireOrganizationAccess(session.userId, dbProject.organizationId);
      await prisma.project.delete({ where: { id } });
      return NextResponse.json({ success: true });
    }
  }

  const deleted = deleteFileProject(id);
  if (!deleted) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
