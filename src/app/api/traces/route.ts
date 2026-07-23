import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getAllTraces } from "@/domain/observability";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const traces = getAllTraces();
  return NextResponse.json({ traces });
}
