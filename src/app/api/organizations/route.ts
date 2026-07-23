import { type NextRequest, NextResponse } from "next/server";
import { requireAuth, getOrganizationMemberships } from "@/lib/auth";
import { prisma } from "@/lib/db/client";

export async function GET() {
  const session = await requireAuth();
  const memberships = await getOrganizationMemberships(session.userId);
  return NextResponse.json({
    organizations: memberships.map((m) => ({
      id: m.organization.id,
      name: m.organization.name,
      slug: m.organization.slug,
      role: m.role,
    })),
  });
}

export async function POST(request: NextRequest) {
  const session = await requireAuth();
  const { name } = (await request.json()) as { name: string };

  if (!name?.trim()) {
    return NextResponse.json({ error: "Organization name is required" }, { status: 400 });
  }

  const org = await prisma.organization.create({
    data: {
      name: name.trim(),
      slug: `org-${Date.now().toString(36)}`,
    },
  });

  await prisma.membership.create({
    data: { userId: session.userId, organizationId: org.id, role: "owner" },
  });

  await prisma.subscription.create({
    data: { organizationId: org.id, plan: "free", status: "active" },
  });

  return NextResponse.json({ organization: org }, { status: 201 });
}
