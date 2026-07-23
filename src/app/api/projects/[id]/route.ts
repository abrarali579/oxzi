import { type NextRequest, NextResponse } from "next/server";
import { getSession, requireOrganizationAccess } from "@/lib/auth";
import { prisma } from "@/lib/db/client";
import {
  getProject as getFileProject,
  updateProject as updateFileProject,
  deleteProject as deleteFileProject,
} from "@/lib/db";
import type { ProjectRecord } from "@/lib/db";
import {
  parseCanonicalState,
  parseDiscoveryResult,
  parseExtractionResult,
  parseGeneratedFiles,
} from "@/lib/db/validation";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
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
            version: dbProject.version,
            canonicalState: parseCanonicalState(dbProject.canonicalState),
            discoveryResult: parseDiscoveryResult(dbProject.discoveryResult),
            extractionResult: parseExtractionResult(dbProject.extractionResult),
            generatedFiles: parseGeneratedFiles(dbProject.generatedFiles),
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
  } catch (err) {
    if (err instanceof NextResponse) return err;
    return NextResponse.json({ error: "Failed to load project" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as Record<string, unknown>;

    // Try DB update (for authenticated users)
    const session = await getSession();
    if (session) {
      const dbProject = await prisma.project.findUnique({ where: { id } });
      if (dbProject) {
        await requireOrganizationAccess(session.userId, dbProject.organizationId);
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
            canonicalState: parseCanonicalState(updated.canonicalState),
            discoveryResult: parseDiscoveryResult(updated.discoveryResult),
            extractionResult: parseExtractionResult(updated.extractionResult),
            generatedFiles: parseGeneratedFiles(updated.generatedFiles),
          },
        });
      }
    }

    // Fall back to file store
    const existing = getFileProject(id);
    if (!existing) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const updates = body as Partial<Omit<ProjectRecord, "id" | "createdAt">>;
    const updated = updateFileProject(id, updates);
    return NextResponse.json({ project: updated });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    const message = err instanceof Error ? err.message : "Failed to update project";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const session = await getSession();

    if (session) {
      const dbProject = await prisma.project.findUnique({ where: { id } });
      if (dbProject) {
        await requireOrganizationAccess(session.userId, dbProject.organizationId);
        await prisma.project.delete({ where: { id } });
        return NextResponse.json({ deleted: true });
      }
    }

    const deleted = deleteFileProject(id);
    if (!deleted) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    return NextResponse.json({ deleted: true });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    return NextResponse.json({ error: "Failed to delete project" }, { status: 500 });
  }
}