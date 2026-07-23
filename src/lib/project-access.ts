/**
 * Multi-tenant authorization guards for API routes.
 * Every project-scoped endpoint must call requireProjectAccess before
 * returning data, ensuring the user's org matches the project's org.
 */
import { getSession, AuthError, requireOrganizationAccess } from "./auth";
import { prisma } from "./db/client";
import { apiError } from "./api-response";
import { NextResponse } from "next/server";

/**
 * Verify that the authenticated user has access to a specific project.
 * Checks organization membership and returns a standardized 403 on mismatch.
 *
 * @returns The project record if authorized
 * @throws NextResponse if unauthorized (return this directly from the route)
 */
export async function requireProjectAccess(projectId: string): Promise<{
  project: {
    id: string;
    title: string;
    organizationId: string;
    ownerId: string;
  };
  session: { userId: string; email: string; name: string };
}> {
  const session = await getSession();
  if (!session) {
    throw NextResponse.json(apiError("Not authenticated"), { status: 401 });
  }

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) {
    throw NextResponse.json(apiError("Project not found"), { status: 404 });
  }

  try {
    await requireOrganizationAccess(session.userId, project.organizationId);
  } catch (err) {
    if (err instanceof AuthError) {
      throw NextResponse.json(
        apiError("You do not have access to this project's organization"),
        { status: 403 },
      );
    }
    throw err;
  }

  return {
    project: {
      id: project.id,
      title: project.title,
      organizationId: project.organizationId,
      ownerId: project.ownerId,
    },
    session,
  };
}

/**
 * Standard auth guard that returns 401 if not authenticated.
 */
export async function requireAuthenticated() {
  const session = await getSession();
  if (!session) {
    throw NextResponse.json(apiError("Not authenticated"), { status: 401 });
  }
  return session;
}
