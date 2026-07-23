import { NextResponse } from "next/server";
import { getTrace } from "@/domain/observability";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const { trace, spans } = getTrace(id);
  if (!trace) {
    return NextResponse.json({ error: "Trace not found" }, { status: 404 });
  }

  return NextResponse.json({ trace, spans });
}
