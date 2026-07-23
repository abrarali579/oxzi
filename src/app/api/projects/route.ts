import { type NextRequest, NextResponse } from "next/server";
import { getSession, requireOrganizationAccess, AuthError } from "@/lib/auth";
import { prisma } from "@/lib/db/client";
import { listProjects as listFileProjects, createProject as createFileProject } from "@/lib/db";

export async function GET(request: NextRequest) {
  const session = await getSession();

  // Authenticated users get their org's projects from the DB
  if (session) {
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get("organizationId");
    if (orgId) {
      await requireOrganizationAccess(session.userId, orgId);
      const projects = await prisma.project.findMany({
        where: { organizationId: orgId },
        orderBy: { updatedAt: "desc" },
      });
      return NextResponse.json({ projects });
    }
    // No org specified — return file-based projects for backward compat
    const fileProjects = listFileProjects();
    return NextResponse.json({ projects: fileProjects });
  }

  // Anonymous users get file-based projects
  const projects = listFileProjects();
  return NextResponse.json({ projects });
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (session) {
      // Authenticated: create project in DB under an organization
      const body = (await request.json()) as {
        title?: string;
        brief?: string;
        organizationId?: string;
      };

      // Resolve orgId: prefer explicit, fall back to user's first membership
      let orgId = body.organizationId;
      if (!orgId) {
        const memberships = await prisma.membership.findMany({
          where: { userId: session.userId },
          take: 1,
        });
        if (memberships.length === 0) {
          return NextResponse.json(
            { error: "User does not belong to any organization. Provide an organizationId." },
            { status: 400 },
          );
        }
        orgId = memberships[0]!.organizationId;
      }
      await requireOrganizationAccess(session.userId, orgId);
      const title = body.title?.trim() || "Untitled Project";
      const brief = body.brief?.trim() || "";

      const project = await prisma.project.create({
        data: {
          id: `proj_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
          title,
          brief,
          organizationId: orgId,
          ownerId: session.userId,
        },
      });

      return NextResponse.json({ project }, { status: 201 });
    }

    // Anonymous: use file-based store
    const body = (await request.json()) as { title?: string; brief?: string };
    const title = body.title?.trim() || "Untitled Project";
    const brief = body.brief?.trim() || "";
    const id = `proj_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    const project = createFileProject({ id, title, brief });
    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    const message = error instanceof Error ? error.message : "Failed to create project";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
