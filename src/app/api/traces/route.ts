import { NextResponse } from "next/server";
import { getAllTraces } from "@/domain/observability";

export async function GET() {
  const traces = getAllTraces();
  return NextResponse.json({ traces });
}
