import { NextResponse } from "next/server";
import { getProject, updateProject } from "@/lib/db";
import { parseCanonicalProject } from "@/domain/project";
import type { ExtractionResult } from "@/domain/extraction";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * PATCH /api/projects/[id]/canonical
 *
 * Phase 2 of the Two-Phase Extraction Approval Workflow (ADR-086).
 * Accepts a list of approved extraction update IDs, validates them
 * against the stored extractionResult, merges approved values into
 * the canonicalState, and persists the updated state.
 */
export async function PATCH(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  try {
    const project = getProject(id);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Parse request body
    let body: { approvedUpdateIds?: string[] };
    try {
      body = (await _request.json()) as { approvedUpdateIds?: string[] };
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    if (!body.approvedUpdateIds || !Array.isArray(body.approvedUpdateIds) || body.approvedUpdateIds.length === 0) {
      return NextResponse.json({ error: "approvedUpdateIds must be a non-empty array" }, { status: 400 });
    }

    const approvedIds = new Set(body.approvedUpdateIds);

    // Load stored extraction result
    const extractionResult = project.extractionResult as ExtractionResult | null;
    if (!extractionResult || !extractionResult.updates) {
      return NextResponse.json({ error: "No extraction result found. Run extraction first." }, { status: 400 });
    }

    // Load current canonical state
    const currentCanonical = (project.canonicalState ?? {}) as Record<string, unknown>;
    const now = new Date().toISOString();

    // Merge approved updates into canonical state
    const appliedUpdates: string[] = [];
    const rejectedUpdates: string[] = [];
    const blockedUpdates: string[] = [];

    for (const update of extractionResult.updates) {
      if (update.disposition === "blocked_conflict" || update.disposition === "blocked_approved") {
        blockedUpdates.push(update.updateId);
        continue;
      }

      if (!approvedIds.has(update.updateId)) {
        rejectedUpdates.push(update.updateId);
        continue;
      }

      // Apply the update to canonical state
      const [group, key] = update.fieldPath.split(".") as [string, string];
      const section = (currentCanonical[group] ?? {}) as Record<string, unknown>;
      const field = (section[key] ?? {}) as Record<string, unknown>;

      field.value = update.value;
      field.status = update.status === "inferred" ? "inferred" : "confirmed";
      field.confidence = update.confidence;
      field.evidenceIds = update.evidenceIds;
      field.timestamps = { createdAt: now, updatedAt: now };
      field.approval = { status: "not_requested" };

      section[key] = field;
      currentCanonical[group] = section;
      appliedUpdates.push(update.updateId);
    }

    // Validate the merged canonical state
    try {
      parseCanonicalProject(currentCanonical);
    } catch {
      return NextResponse.json(
        { error: "Merged canonical state failed validation. Some updates may conflict." },
        { status: 422 },
      );
    }

    // Persist
    updateProject(id, { canonicalState: currentCanonical });

    return NextResponse.json({
      success: true,
      applied: appliedUpdates.length,
      rejected: rejectedUpdates.length,
      blocked: blockedUpdates.length,
      appliedUpdateIds: appliedUpdates,
      rejectedUpdateIds: rejectedUpdates,
      blockedUpdateIds: blockedUpdates,
      project: {
        id: project.id,
        title: project.title,
        canonicalState: currentCanonical,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to apply extraction updates";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
