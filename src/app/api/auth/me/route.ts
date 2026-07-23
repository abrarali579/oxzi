import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getOrganizationMemberships } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const memberships = await getOrganizationMemberships(session.userId);

  return NextResponse.json({
    user: {
      id: session.userId,
      email: session.email,
      name: session.name,
    },
    organizations: memberships.map((m) => ({
      id: m.organization.id,
      name: m.organization.name,
      slug: m.organization.slug,
      role: m.role,
    })),
  });
}
