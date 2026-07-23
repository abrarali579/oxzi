import { type NextRequest, NextResponse } from "next/server";
import { listProjects, createProject } from "@/lib/db";

export async function GET() {
  const projects = listProjects();
  return NextResponse.json({ projects });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { title?: string; brief?: string };
    const title = body.title?.trim() || "Untitled Project";
    const brief = body.brief?.trim() || "";

    const id = `proj_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

    const project = createProject({ id, title, brief });

    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create project";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
