import { oxzire3dWebsiteFixture } from "./fixtures";
import { parseCanonicalProject, type CanonicalProject } from "./schema";
import { evidenceIdSchema } from "./identifiers";
import { extractCanonicalUpdates, type ExtractionResult } from "../extraction";
import { bootstrapDomainDefaults } from "./domain-defaults";

/**
 * Builds a draft CanonicalProject from just a title + free-text brief, then
 * runs the extraction engine over the brief and folds "proposed" updates
 * back onto the matching canonical fields (status "inferred"/"confirmed" per
 * the update itself — never silently marked "confirmed by human"). Updates
 * blocked by a conflict or an already-approved field are left untouched.
 *
 * Shared by /generate and /visualize so both reflect the same real brief
 * content instead of only carrying identity.name/oneLiner.
 */
export function buildCanonicalProjectFromBrief(
  title: string,
  brief: string,
): { canonical: CanonicalProject; extraction: ExtractionResult | null } {
  const now = new Date().toISOString();
  const clone = structuredClone(oxzire3dWebsiteFixture);

  clone.metadata.lifecycle = "draft";
  clone.metadata.approvalStatus = "not_requested";
  clone.metadata.lifecycleHistory = [clone.metadata.lifecycleHistory[0]!];
  clone.metadata.version.approvalStatus = "not_requested";
  delete clone.metadata.version.approvedAt;
  delete clone.metadata.version.approvedBy;

  const groups = [
    clone.identity, clone.business, clone.scope, clone.product,
    clone.visual, clone.technical, clone.quality, clone.execution,
  ];
  for (const group of groups) {
    for (const field of Object.values(group) as Array<Record<string, unknown>>) {
      if (field && typeof field === "object" && "value" in field) {
        field.value = null;
        field.status = "missing";
        field.confidence = 0;
        field.evidenceIds = [];
        field.approval = { status: "not_requested" };
        delete field.assumption;
        delete field.conflict;
      }
    }
  }

  const promptEvidenceId = evidenceIdSchema.parse("evidence_initial_prompt");

  clone.identity.name.value = title;
  clone.identity.name.status = "confirmed";
  clone.identity.name.confidence = 100;
  clone.identity.name.evidenceIds = [promptEvidenceId];
  clone.identity.name.timestamps = { createdAt: now, updatedAt: now };
  clone.identity.name.approval = { status: "not_requested" };

  clone.identity.oneLiner.value = brief;
  clone.identity.oneLiner.status = "inferred";
  clone.identity.oneLiner.confidence = 60;
  clone.identity.oneLiner.evidenceIds = [promptEvidenceId];
  clone.identity.oneLiner.timestamps = { createdAt: now, updatedAt: now };
  clone.identity.oneLiner.approval = { status: "not_requested" };

  clone.meta.evidence = [
    {
      id: promptEvidenceId,
      sourceType: "prompt" as const,
      sourceId: "source_initial_prompt",
      interpretation: brief.slice(0, 500),
      createdAt: now,
    },
  ];
  clone.meta.assumptions = [];
  clone.meta.decisions = [];
  clone.meta.conflicts = [];
  clone.meta.completeness = {
    criticalCompleteness: 0,
    overallCompleteness: 0,
    contradictionCount: 0,
    blockingQuestionCount: 12,
    assumptionCount: 0,
  };

  let extraction: ExtractionResult | null = null;
  if (brief.trim()) {
    extraction = extractCanonicalUpdates({
      sources: [
        {
          sourceId: "source_initial_prompt",
          kind: "plain_text",
          content: brief,
          capturedAt: now.replace("Z", "+00:00"),
        },
      ],
      existingProject: parseCanonicalProject(clone),
    });

    const seenEvidenceIds = new Set(clone.meta.evidence.map((e) => e.id));
    for (const update of extraction.updates) {
      if (update.disposition !== "proposed") continue;
      const [group, key] = update.fieldPath.split(".") as [string, string];
      const field = (clone as unknown as Record<string, Record<string, Record<string, unknown>>>)[group]?.[key];
      if (!field || typeof field !== "object") continue;

      field.value = update.value;
      field.status = update.status;
      field.confidence = update.confidence;
      field.evidenceIds = update.evidenceIds;
      field.timestamps = { createdAt: now, updatedAt: now };
      field.approval = { status: "not_requested" };
      delete field.assumption;
      delete field.conflict;

      for (const evidence of update.evidence) {
        if (seenEvidenceIds.has(evidence.id)) continue;
        seenEvidenceIds.add(evidence.id);
        clone.meta.evidence.push(evidence);
      }
    }
  }

  // ── Apply domain-aware defaults for fields still missing after extraction ──
  // Only fills fields that the brief didn't explicitly cover, using project type
  // and keyword detection (e.g. "fitness" + "pregnant" → pregnancy workout app).
  const bootstrapEvidenceId = evidenceIdSchema.parse("evidence_domain_bootstrap");
  if (!clone.meta.evidence.some((e) => e.id === bootstrapEvidenceId)) {
    clone.meta.evidence.push({
      id: bootstrapEvidenceId,
      sourceType: "prompt" as const,
      sourceId: "source_domain_bootstrap",
      excerpt: brief.slice(0, 500),
      interpretation:
        "Domain-aware defaults inferred from project type and keywords in the brief.",
      createdAt: now,
    });
  }
  bootstrapDomainDefaults(clone as CanonicalProject, brief);

  return { canonical: parseCanonicalProject(clone), extraction };
}
