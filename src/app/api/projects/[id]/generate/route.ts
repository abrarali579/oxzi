import { NextResponse } from "next/server";
import { getProject, updateProject } from "@/lib/db";
import { createZipBuffer } from "@/lib/utils/zip";
import { buildCanonicalProjectFromBrief } from "@/domain/project/from-brief";
import { analyzeDiscovery } from "@/domain/discovery";
import type { extractCanonicalUpdates } from "@/domain/extraction";

type RouteContext = { params: Promise<{ id: string }> };

// ── Helpers ──────────────────────────────────────────────────

function generateFilesFromAnalysis(
  title: string,
  brief: string,
  discovery: ReturnType<typeof analyzeDiscovery>,
  extraction: ReturnType<typeof extractCanonicalUpdates> | null,
): Record<string, string> {
  const now = new Date().toISOString().split("T")[0]!;
  const { completeness, projectType, questions, interview, fields } = discovery;

  // ── Extract structured insights from extraction ────────────
  const extractedFields = extraction?.updates ?? [];
  const fieldMap = new Map(extractedFields.map((u) => [u.fieldPath, u.value]));

  const techStack = (fieldMap.get("technical.preferredStack") as string[] | undefined) ?? [];
  const architectureStyle = (fieldMap.get("technical.deployment") as string | undefined) ?? "Not yet classified";
  const targetPlatforms = (fieldMap.get("product.platforms") as string[] | undefined) ?? [];
  const inScope = (fieldMap.get("scope.inScope") as string[] | undefined) ?? [];
  const outOfScope = (fieldMap.get("scope.outOfScope") as string[] | undefined) ?? [];
  const features = (fieldMap.get("product.features") as Array<{ name: string; description: string; priority: string }> | undefined) ?? [];
  const goals = (fieldMap.get("business.goals") as Array<{ name: string; outcome: string; priority: string }> | undefined) ?? [];
  const targetUsers = (fieldMap.get("business.targetUsers") as Array<{ name: string; needs: string[]; painPoints: string[] }> | undefined) ?? [];
  const integrations = (fieldMap.get("technical.integrations") as Array<{ name: string; purpose: string; direction: string; required: boolean }> | undefined) ?? [];
  const visualKeywords = (fieldMap.get("visual.visualKeywords") as string[] | undefined) ?? [];
  const designThemes = (fieldMap.get("visual.themes") as string[] | undefined) ?? [];
  const colorPalette = (fieldMap.get("visual.colors") as string[] | undefined) ?? [];
  const constraints = (fieldMap.get("scope.constraints") as string[] | undefined) ?? [];
  const risks = (fieldMap.get("execution.risks") as Array<{ name: string; impact: string; mitigation: string }> | undefined) ?? [];

  // ── Section builders ──────────────────────────────────────
  const bullet = (items: string[]) =>
    items.length > 0 ? items.map((i) => `- ${i}`).join("\n") : "*(None specified — to be defined)*";

  const featureList = (feats: Array<{ name: string; description: string; priority: string }>) =>
    feats.length > 0
      ? feats.map((f) => `### ${f.name} (${f.priority})\n\n${f.description}`).join("\n\n")
      : "*(No features extracted — add more detail to the prompt)*";

  const integrationList = (ints: Array<{ name: string; purpose: string; direction: string; required: boolean }>) =>
    ints.length > 0
      ? ints.map((i) => `- **${i.name}** (${i.direction}, ${i.required ? "required" : "optional"}): ${i.purpose}`).join("\n")
      : "*(No integrations identified)*";

  const questionBlock = questions.length > 0
    ? `## Questions for Clarification\n\n${questions.slice(0, 8).map((q, i) => `${i + 1}. **${q.fieldPath}** — ${q.question} (${q.criticality})`).join("\n")}\n`
    : "## Questions for Clarification\n\nNo immediate questions — the project description is well-structured.\n";

  const constitutionRules = [
    constraints.length > 0 ? `### Constraints\n${bullet(constraints)}` : "",
    `### Blocking Policies\n- All AI agents MUST validate against canonical state before modifying files\n- Protected files (${[`context/`, `specs/`, `DECISIONS.md`, `OXZI.md`].join(", ")}) require explicit approval\n- Every change MUST be accompanied by an updated progress tracker entry`,
    interview.skipInterview
      ? "### Autonomy Level\nFull autonomy granted — discovery engine reports sufficient completeness.\n"
      : `### Autonomy Level\nRestricted autonomy — ${completeness.blockingGapCount} blocking gap(s) require resolution before autonomous execution.\n`,
  ].filter(Boolean).join("\n\n");

  return {
    "01-project-overview.md": [
      `# ${title}`,
      `**Generated:** ${now} | **OXZI Pipeline v1.0**`,
      "",
      "## Brief",
      brief || "No brief provided.",
      "",
      "## Project Classification",
      `- **Type:** ${projectType ?? "Not yet classified"}`,
      `- **Lifecycle:** ${discovery.lifecycle}`,
      `- **Completeness:** ${completeness.criticalCompleteness}% critical / ${completeness.overallCompleteness}% overall`,
      "",
      "## Key Entities",
      goals.length > 0 ? `### Goals\n${goals.map((g) => `- **${g.name}** (${g.priority}): ${g.outcome}`).join("\n")}` : "",
      targetUsers.length > 0 ? `### Target Users\n${targetUsers.map((u) => `- **${u.name}**: Needs [${u.needs.join(", ")}], Pain points [${u.painPoints.join(", ")}]`).join("\n")}` : "",
      "",
      "## Status",
      interview.skipInterview
        ? "✅ Project is well-defined and ready for planning."
        : `⏳ ${questions.length} clarification question(s) recommended. Run discovery interview to reach 90% completeness.`,
      `\n**Blocking gaps:** ${completeness.blockingGapCount} | **Conflicts:** ${completeness.unresolvedConflictCount} | **Approvals needed:** ${completeness.requiredApprovalCount}`,
    ].filter(Boolean).join("\n"),

    "02-architecture.md": [
      `# Architecture — ${title}`,
      `**Generated:** ${now}`,
      "",
      "## Architectural Decision",
      `**Style:** ${architectureStyle}`,
      techStack.length > 0 ? `**Stack:** ${techStack.join(", ")}` : "",
      "",
      "## Target Platforms",
      bullet(targetPlatforms),
      "",
      "## Scope Boundaries",
      "### In Scope",
      bullet(inScope),
      "### Out of Scope",
      bullet(outOfScope),
      "",
      "## Integrations",
      integrationList(integrations),
      "",
      "## Dependency Topology",
      "*(Generated during repository parsing phase — run Visual Architecture Map in the project workspace)*",
      "",
      questionBlock,
    ].filter(Boolean).join("\n"),

    "03-ui-visual-context.md": [
      `# UI & Visual Context — ${title}`,
      `**Generated:** ${now}`,
      "",
      "## Design Keywords",
      visualKeywords.length > 0 ? bullet(visualKeywords) : "*(Extract more detail from the brief to populate design keywords)*",
      "",
      "## Thematic Direction",
      designThemes.length > 0 ? bullet(designThemes) : "*(Not yet defined)*",
      "",
      "## Color Palette",
      colorPalette.length > 0 ? bullet(colorPalette) : "*(Not yet defined)*",
      "",
      "## Feature-Driven UI Components",
      featureList(features),
      "",
      "## Extracted Field Insights",
      extractedFields.length > 0
        ? extractedFields.slice(0, 20).map((u) => `- \`${u.fieldPath}\`: ${JSON.stringify(u.value)}`).join("\n")
        : "*(No fields extracted — enrich the project brief with more detail)*",
    ].filter(Boolean).join("\n"),

    "04-code-standards.md": [
      `# Code Standards — ${title}`,
      `**Generated:** ${now}`,
      "",
      "## Mandatory Guidelines",
      "- Use strict TypeScript throughout (`tsconfig.json` strict mode)",
      "- Components under `src/` following domain-driven directory structure",
      "- Tests co-located or in `__tests__/` with co-located naming convention",
      "- Every function MUST have explicit return types",
      "- Zod schemas MUST be in `.strict()` mode",
      "- Prisma writes MUST be awaited before any redirect or response",
      "",
      techStack.length > 0 ? `## Technology Stack\n${bullet(techStack)}` : "",
      "",
      "## Project-Specific Rules",
      `- **Project type:** ${projectType ?? "unclassified"}`,
      `- **Architecture style:** ${architectureStyle}`,
      `- **Platform targets:** ${targetPlatforms.length > 0 ? targetPlatforms.join(", ") : "TBD"}`,
      constraints.length > 0 ? `\n### Constraints\n${bullet(constraints)}` : "",
      "",
      "## File Protection Policy",
      "| Path | Protection |",
      "|------|-----------|",
      "| `context/*.md` | Read-only (AI agents may read, never write) |",
      "| `specs/*.md` | Read-only |",
      "| `DECISIONS.md` | Read-only |",
      "| `OXZI.md` | Read-only |",
      "| `PROJECT.md` | Read-only |",
      "",
      `**Analyzed fields:** ${fields.length} canonical fields assessed.`,
    ].filter(Boolean).join("\n"),

    "05-ai-workflow-rules.md": [
      `# AI Workflow Rules — ${title}`,
      `**Generated:** ${now}`,
      "",
      "## Agent Behavior Contract",
      "### Mandatory Pre-Flight",
      "1. Read `AGENTS.md` and `CURRENT.md` to understand project state",
      "2. Verify the Task Card is active and approved before any code change",
      "3. Check `context/06-progress-tracker.md` for unresolved drift or divergence",
      "",
      "### During Execution",
      "- Never modify files in protected paths (see Code Standards § File Protection Policy)",
      "- Run `npm run typecheck && npm run lint && npm run test` after every change unit",
      "- Update `CURRENT.md` and progress tracker after each completed unit",
      "- Commit only `.review/.gitkeep` by default — generated evidence stays local",
      "",
      "### Post-Execution",
      "- Report actual validation results — never claim a check passed without running it",
      "- Never commit, push, or expose secrets, private data, or generated review evidence",
      "",
      "## Project Constitution",
      constitutionRules,
      "",
      "## Risk Register",
      risks.length > 0
        ? risks.map((r) => `- **${r.name}** (${r.impact}): ${r.mitigation}`).join("\n")
        : "*(No risks identified — run discovery with more detailed input)*",
    ].filter(Boolean).join("\n"),

    "06-progress-tracker.md": [
      `# Progress Tracker — ${title}`,
      `**Generated:** ${now}`,
      "",
      "| Date | Milestone | Status |",
      "|------|-----------|--------|",
      `| ${now} | Project created via OXZI | ✅ |`,
      `| ${now} | Discovery analysis (${completeness.criticalCompleteness}% critical) | ${interview.skipInterview ? "✅ Complete" : "⏳ Needs clarification"} |`,
      `| ${now} | Canonical extraction (${extractedFields.length} fields) | ${extraction ? "✅ Complete" : "⏳ Pending"} |`,
      `| ${now} | Six-file compilation | ✅ Complete |`,
      "| — | Architecture planning | ⏳ Next |",
      "| — | Technical plan & implementation slices | ⏳ Next |",
      "| — | Task Card compilation | ⏳ Next |",
      "| — | Prompt certification | 🔒 Blocked (requires Task Card) |",
      "| — | Execution passport | 🔒 Blocked (requires certification) |",
      "",
      `**Pipeline status:** ${extraction ? "Discovery + Extraction complete" : "Discovery only"} → Planning → Compilation → Certification → Execution`,
    ].filter(Boolean).join("\n"),
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
    // 1. Build a CanonicalProject from the brief, with extraction updates
    //    already folded onto the matching fields
    const { canonical, extraction } = buildCanonicalProjectFromBrief(project.title, project.brief);

    // 2. Run discovery analysis on the enriched canonical project
    const discovery = analyzeDiscovery(canonical);

    // 3. Generate dynamic files from the analysis
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
