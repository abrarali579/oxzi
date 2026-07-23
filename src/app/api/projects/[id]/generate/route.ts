import { NextResponse } from "next/server";
import { getProject, updateProject } from "@/lib/db";
import { createZipBuffer } from "@/lib/utils/zip";
import {
  oxzire3dWebsiteFixture,
  parseCanonicalProject,
} from "@/domain/project";
import type { CanonicalProject } from "@/domain/project";
import { evidenceIdSchema } from "@/domain/project/identifiers";
import { analyzeDiscovery } from "@/domain/discovery";
import { extractCanonicalUpdates } from "@/domain/extraction";

type RouteContext = { params: Promise<{ id: string }> };

// ── Helpers ──────────────────────────────────────────────────

function buildMinimalProject(title: string, brief: string): CanonicalProject {
  const now = new Date().toISOString();
  const clone = structuredClone(oxzire3dWebsiteFixture);

  // Reset to draft / minimal state
  clone.metadata.lifecycle = "draft";
  clone.metadata.approvalStatus = "not_requested";
  clone.metadata.lifecycleHistory = [clone.metadata.lifecycleHistory[0]!];
  clone.metadata.version.approvalStatus = "not_requested";
  delete clone.metadata.version.approvedAt;
  delete clone.metadata.version.approvedBy;

  const groups = [
    clone.identity,
    clone.business,
    clone.scope,
    clone.product,
    clone.visual,
    clone.technical,
    clone.quality,
    clone.execution,
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

  const evidenceId = evidenceIdSchema.parse("evidence_initial_prompt");

  // Set identity fields from input
  clone.identity.name.value = title;
  clone.identity.name.status = "confirmed";
  clone.identity.name.confidence = 100;
  clone.identity.name.evidenceIds = [evidenceId];
  clone.identity.name.timestamps = { createdAt: now, updatedAt: now };
  clone.identity.name.approval = { status: "not_requested" };

  clone.identity.oneLiner.value = brief;
  clone.identity.oneLiner.status = "inferred";
  clone.identity.oneLiner.confidence = 60;
  clone.identity.oneLiner.evidenceIds = [evidenceId];
  clone.identity.oneLiner.timestamps = { createdAt: now, updatedAt: now };
  clone.identity.oneLiner.approval = { status: "not_requested" };

  clone.meta.evidence = [
    {
      id: evidenceId,
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

  return parseCanonicalProject(clone);
}

function generateFilesFromAnalysis(
  title: string,
  brief: string,
  discovery: ReturnType<typeof analyzeDiscovery>,
  extraction: ReturnType<typeof extractCanonicalUpdates> | null,
): Record<string, string> {
  const now = new Date().toISOString().split("T")[0]!;
  const { completeness, projectType, questions, interview } = discovery;

  const completenessLines = [
    `- **Critical completeness:** ${completeness.criticalCompleteness}%`,
    `- **Overall completeness:** ${completeness.overallCompleteness}%`,
    `- **Blocking gaps:** ${completeness.blockingGapCount}`,
    `- **Unresolved conflicts:** ${completeness.unresolvedConflictCount}`,
    `- **Required approvals:** ${completeness.requiredApprovalCount}`,
  ];

  const questionLines = questions.slice(0, 5).map(
    (q, i) => `${i + 1}. **${q.question}** (${q.criticality}, ${q.estimatedTypingEffort} effort)`,
  );

  const extractedLines = extraction
    ? extraction.updates
        .slice(0, 15)
        .map((u) => `- \`${u.fieldPath}\`: ${JSON.stringify(u.value)}`)
        .join("\n")
    : "*Extraction pending — run discovery first.*";

  return {
    "01-project-overview.md": `# ${title}\n\n**Generated:** ${now}\n\n## Brief\n\n${brief || "No brief provided."}\n\n## Project Type\n\n${projectType ?? "Not yet classified"}\n\n## Discovery Completeness\n\n${completenessLines.join("\n")}\n\n## Status\n\nInitial project created via OXZI. ${interview.skipInterview ? "Project is well-defined and ready for planning." : `${questions.length} clarification question(s) recommended before proceeding.`}\n`,
    "02-architecture.md": `# Architecture\n\n**Project:** ${title}\n\n## Discovery Analysis\n\n- **Project type:** ${projectType ?? "unclassified"}\n- **Lifecycle stage:** ${discovery.lifecycle}\n- **Field coverage:** ${completeness.overallCompleteness}% overall, ${completeness.criticalCompleteness}% critical\n\n## Recommended Questions\n\n${questionLines.length > 0 ? questionLines.join("\n") : "No immediate questions — project is well-understood."}\n\n## High-Level Design\n\n(TBD — architecture is scoped during the planning phase after discovery is complete.)\n`,
    "03-ui-visual-context.md": `# UI / Visual Context\n\n**Project:** ${title}\n\n## Design Direction\n\n(TBD — visual direction is established during the discovery and design phase.)\n\n## Extracted Insights\n\n${extractedLines}\n`,
    "04-code-standards.md": `# Code Standards\n\n**Project:** ${title}\n\n## Guidelines\n\n- Use strict TypeScript throughout\n- Components go under \`src/\`\n- Tests co-located or in \`__tests__/\`\n- Follow the existing project conventions\n\n## Discovery Context\n\nThis project was analyzed by OXZI's discovery engine, which assessed ${discovery.fields.length} canonical fields. ${completeness.blockingGapCount} blocking gap(s) were identified.\n`,
    "05-ai-workflow-rules.md": `# AI Workflow Rules\n\n**Project:** ${title}\n\n## Agent Instructions\n\n- Never modify protected files\n- Always run validation after changes\n- Follow the project's established patterns\n\n## Project-Specific Rules\n\n- **Project type:** ${projectType ?? "unclassified"}\n- **Completeness threshold:** ${completeness.criticalCompleteness}% critical (target: 90%)\n- **Clarifications needed:** ${questions.length} question(s)\n`,
    "06-progress-tracker.md": `# Progress Tracker\n\n**Project:** ${title}\n\n| Date | Milestone | Status |\n|------|-----------|--------|\n| ${now} | Project created | ✅ |\n| ${now} | Discovery analysis | ${interview.skipInterview ? "✅ Complete" : "⏳ Needs clarification"} |\n| ${now} | Extraction | ${extraction ? `✅ ${extraction.updates.length} fields extracted` : "⏳ Pending"} |\n`,
  };
}

// ── Route Handler ─────────────────────────────────────────

export async function POST(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const project = getProject(id);

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  try {
    // 1. Build a minimal CanonicalProject from the brief
    const canonical = buildMinimalProject(project.title, project.brief);

    // 2. Run discovery analysis
    const discovery = analyzeDiscovery(canonical);

    // 3. Run extraction (if brief is non-empty)
    let extraction: ReturnType<typeof extractCanonicalUpdates> | null = null;
    if (project.brief.trim()) {
      extraction = extractCanonicalUpdates({
        sources: [
          {
            sourceId: "source_initial_prompt",
            kind: "plain_text",
            content: project.brief,
            capturedAt: new Date().toISOString().replace("Z", "+00:00"),
          },
        ],
        existingProject: canonical,
      });
    }

    // 4. Generate dynamic files from the analysis
    const files = generateFilesFromAnalysis(project.title, project.brief, discovery, extraction);

    // 5. Save to project record
    const entries = Object.entries(files).map(([name, content]) => ({
      path: name,
      content,
    }));

    const zipBuffer = await createZipBuffer(entries);
    updateProject(id, { generatedFiles: files });

    return new NextResponse(new Uint8Array(zipBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(project.title)}-oxzi-files.zip"`,
        "Content-Length": zipBuffer.length.toString(),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate files";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
