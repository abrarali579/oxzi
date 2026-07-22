import { parseCanonicalProject, type CanonicalProject, type ProjectField } from "../project";
import {
  DEPLOYMENT_TERMS,
  INTEGRATION_TERMS,
  LANGUAGE_TERMS,
  PLATFORM_TERMS,
  PRIVACY_TERMS,
  PROJECT_TYPE_TERMS,
  SECURITY_TERMS,
  TECH_TERMS,
  THEME_TERMS,
  VISUAL_TERMS,
  type LexiconEntry,
} from "./lexicon";
import { normalizeComparison, segmentSources, stableHash, type SourceSegment } from "./parser";
import {
  canonicalFieldUpdateSchema,
  extractionRequestSchema,
  extractionResultSchema,
  type CanonicalFieldUpdate,
  type ExtractableFieldPath,
  type ExtractionExplicitness,
  type ExtractionRequest,
  type ExtractionResult,
  type ExtractionSourceKind,
} from "./types";

type RawCandidate = {
  fieldPath: ExtractableFieldPath;
  value: unknown;
  confidence: number;
  explicitness: ExtractionExplicitness;
  segment: SourceSegment;
  ruleId: string;
  reasoning: string;
};

const ARRAY_PATHS = new Set<ExtractableFieldPath>([
  "business.targetUsers",
  "business.goals",
  "scope.inScope",
  "scope.outOfScope",
  "scope.constraints",
  "scope.assumptionSummaries",
  "product.platforms",
  "product.features",
  "visual.personality",
  "visual.visualKeywords",
  "visual.avoidList",
  "visual.themes",
  "visual.colors",
  "technical.preferredStack",
  "technical.integrations",
  "technical.security",
  "technical.privacy",
  "quality.localization",
  "execution.risks",
]);

const CRITICAL_PATHS = new Set<ExtractableFieldPath>([
  "identity.projectType",
  "business.problem",
  "business.goals",
  "business.targetUsers",
  "product.features",
  "technical.security",
  "technical.deployment",
]);

const STACK_EXCLUSIVE_GROUPS = [
  ["React", "Vue", "Svelte", "Angular"],
  ["PostgreSQL", "MySQL", "MongoDB"],
] as const;

function sourceConfidence(kind: ExtractionSourceKind, speaker: SourceSegment["speaker"]): number {
  if (speaker === "assistant") return 62;
  if (kind === "master_prompt") return 96;
  if (kind === "plain_text") return 92;
  if (kind === "uploaded_notes") return 86;
  return speaker === "user" ? 90 : 72;
}

function canonicalSourceType(kind: ExtractionSourceKind) {
  if (kind === "uploaded_notes" || kind === "ai_conversation") return "upload" as const;
  return "prompt" as const;
}

function hasTerm(text: string, term: string): boolean {
  const normalizedText = ` ${normalizeComparison(text)} `;
  const normalizedTerm = normalizeComparison(term);
  return normalizedText.includes(` ${normalizedTerm} `) || normalizedText.trim() === normalizedTerm;
}

function findLexiconEntries(text: string, entries: readonly LexiconEntry[]): LexiconEntry[] {
  return entries.filter((entry) => entry.terms.some((term) => hasTerm(text, term)));
}

function cleanItem(value: string): string {
  return value
    .trim()
    .replace(/^[-*+]\s*/, "")
    .replace(/^(?:must|should|could|required|harus|wajib|optional)\s*[:\-]?\s*/i, "")
    .replace(/[.;]+$/, "")
    .trim();
}

function splitItems(value: string): string[] {
  const parts = value
    .split(/\s*(?:[,;|]|\band\b|\bdan\b)\s*/i)
    .map((item) =>
      item
        .trim()
        .replace(/^[-*+]\s*/, "")
        .replace(/[.;]+$/, "")
        .trim(),
    )
    .filter((item) => item.length > 1);
  return parts.length > 0 ? parts : [value.trim()].filter(Boolean);
}

function titleCaseStart(value: string): string {
  const cleaned = cleanItem(value);
  return cleaned ? cleaned[0]!.toLocaleUpperCase() + cleaned.slice(1) : cleaned;
}

function itemPriority(value: string): "must" | "should" | "could" {
  if (/\b(?:must|required|critical|wajib|harus|utama|p0)\b/i.test(value)) return "must";
  if (/\b(?:could|optional|nice to have|opsional|p2)\b/i.test(value)) return "could";
  return "should";
}

function goalPriority(value: string): "primary" | "secondary" {
  return /\b(?:primary|main|most important|utama|prioritas|p0)\b/i.test(value)
    ? "primary"
    : "secondary";
}

function direction(value: string): "inbound" | "outbound" | "bidirectional" {
  if (/\b(?:ingest|import|receive|fetch|read|masuk)\b/i.test(value)) return "inbound";
  if (/\b(?:publish|export|send|notify|keluar)\b/i.test(value)) return "outbound";
  return "bidirectional";
}

function riskImpact(value: string): "blocking" | "high" | "medium" | "low" {
  if (/\b(?:blocking|critical|fatal|showstopper|kritis)\b/i.test(value)) return "blocking";
  if (/\b(?:high|major|tinggi)\b/i.test(value)) return "high";
  if (/\b(?:low|minor|rendah)\b/i.test(value)) return "low";
  return "medium";
}

function makeTargetUser(value: string): { value: unknown; inferred: boolean } {
  const cleaned = cleanItem(value);
  const detailed = cleaned.match(
    /^(.+?)\s+(?:who|that|yang)\s+(?:need|needs|want|wants|membutuhkan|ingin)\s+(.+)$/i,
  );
  if (detailed) {
    return {
      value: {
        name: titleCaseStart(detailed[1] ?? cleaned),
        needs: [titleCaseStart(detailed[2] ?? cleaned)],
        painPoints: [],
      },
      inferred: false,
    };
  }
  return {
    value: {
      name: titleCaseStart(cleaned),
      needs: [`Use the proposed product as ${cleaned}`],
      painPoints: [],
    },
    inferred: true,
  };
}

function makeFeature(value: string) {
  const cleaned = titleCaseStart(value);
  return {
    name: cleaned,
    description: cleaned,
    priority: itemPriority(value),
    acceptanceCriteria: [cleaned],
  };
}

function makeGoal(value: string) {
  const cleaned = titleCaseStart(
    value.replace(/^(?:goal|objective|tujuan)\s*(?:is|adalah)?\s*/i, ""),
  );
  return {
    name: cleaned,
    outcome: cleaned,
    priority: goalPriority(value),
  };
}

function makeIntegration(name: string, context: string) {
  return {
    name: titleCaseStart(name),
    purpose: `Integration identified from source: ${cleanItem(context)}`,
    direction: direction(context),
    required: /\b(?:must|required|wajib|harus|integrate|integration|integrasi)\b/i.test(context),
  };
}

function makeRisk(value: string) {
  const [namePart, mitigationPart] = value.split(/\s*(?:->|mitigation\s*:|mitigasi\s*:)\s*/i, 2);
  const name = titleCaseStart((namePart ?? value).replace(/^risk\s*:\s*/i, ""));
  return {
    name,
    impact: riskImpact(value),
    mitigation: mitigationPart
      ? titleCaseStart(mitigationPart)
      : "No mitigation was specified in the source.",
  };
}

function addCandidate(
  candidates: RawCandidate[],
  matchedSegments: Set<string>,
  segment: SourceSegment,
  fieldPath: ExtractableFieldPath,
  value: unknown,
  ruleId: string,
  reasoning: string,
  options: { inferred?: boolean; confidenceAdjustment?: number } = {},
) {
  const assistantInference = segment.speaker === "assistant";
  const inferred = options.inferred || assistantInference;
  candidates.push({
    fieldPath,
    value,
    confidence: Math.max(
      0,
      Math.min(
        99,
        sourceConfidence(segment.source.kind, segment.speaker) +
          (segment.section === fieldPath ? 2 : 0) +
          (options.confidenceAdjustment ?? 0) -
          (inferred ? 12 : 0),
      ),
    ),
    explicitness: inferred ? "inferred" : "explicit",
    segment,
    ruleId,
    reasoning,
  });
  matchedSegments.add(segment.segmentId);
}

function extractSectionCandidate(
  segment: SourceSegment,
  candidates: RawCandidate[],
  matchedSegments: Set<string>,
) {
  if (!segment.section) return;
  const items = splitItems(segment.text);
  const reasoning = `Matched the explicit ${segment.section} section.`;

  switch (segment.section) {
    case "identity.name":
    case "identity.oneLiner":
    case "business.problem":
    case "business.solution":
    case "technical.deployment":
      addCandidate(
        candidates,
        matchedSegments,
        segment,
        segment.section,
        cleanItem(segment.text),
        "section_scalar",
        reasoning,
      );
      return;
    case "identity.projectType": {
      const type = PROJECT_TYPE_TERMS.find((entry) =>
        entry.terms.some((term) => hasTerm(segment.text, term)),
      );
      if (type) {
        addCandidate(
          candidates,
          matchedSegments,
          segment,
          segment.section,
          type.canonical,
          "section_project_type",
          reasoning,
        );
      }
      return;
    }
    case "business.goals":
      for (const item of items)
        addCandidate(
          candidates,
          matchedSegments,
          segment,
          segment.section,
          [makeGoal(item)],
          "section_goal",
          reasoning,
        );
      return;
    case "business.targetUsers":
      for (const item of items) {
        const targetUser = makeTargetUser(item);
        addCandidate(
          candidates,
          matchedSegments,
          segment,
          segment.section,
          [targetUser.value],
          "section_user",
          reasoning,
          { inferred: targetUser.inferred },
        );
      }
      return;
    case "product.features":
      for (const item of items)
        addCandidate(
          candidates,
          matchedSegments,
          segment,
          segment.section,
          [makeFeature(item)],
          "section_feature",
          reasoning,
        );
      return;
    case "technical.integrations":
      for (const item of items)
        addCandidate(
          candidates,
          matchedSegments,
          segment,
          segment.section,
          [makeIntegration(item, segment.text)],
          "section_integration",
          reasoning,
        );
      return;
    case "execution.risks":
      for (const item of items)
        addCandidate(
          candidates,
          matchedSegments,
          segment,
          segment.section,
          [makeRisk(item)],
          "section_risk",
          reasoning,
          { inferred: !/mitigation|mitigasi|->/i.test(item) },
        );
      return;
    default:
      for (const item of items)
        addCandidate(
          candidates,
          matchedSegments,
          segment,
          segment.section,
          [titleCaseStart(item)],
          "section_list",
          reasoning,
        );
  }
}

function extractDictionaryCandidates(
  segment: SourceSegment,
  candidates: RawCandidate[],
  matchedSegments: Set<string>,
) {
  for (const entry of findLexiconEntries(segment.text, TECH_TERMS)) {
    addCandidate(
      candidates,
      matchedSegments,
      segment,
      "technical.preferredStack",
      [entry.canonical],
      "dictionary_tech",
      `Matched the technology term “${entry.canonical}”.`,
    );
  }
  for (const entry of findLexiconEntries(segment.text, LANGUAGE_TERMS)) {
    addCandidate(
      candidates,
      matchedSegments,
      segment,
      "quality.localization",
      [entry.canonical],
      "dictionary_language",
      `Matched the language term “${entry.canonical}”.`,
    );
  }
  for (const entry of findLexiconEntries(segment.text, VISUAL_TERMS)) {
    addCandidate(
      candidates,
      matchedSegments,
      segment,
      "visual.visualKeywords",
      [entry.canonical],
      "dictionary_visual",
      `Matched the visual-direction term “${entry.canonical}”.`,
    );
  }

  const combinedThemes = THEME_TERMS.find((entry) => entry.canonical === "Dark and light");
  const combinedThemeMatched = combinedThemes?.terms.some((term) => hasTerm(segment.text, term));
  const themeEntries = combinedThemeMatched
    ? [combinedThemes]
    : findLexiconEntries(segment.text, THEME_TERMS).filter(
        (entry) => entry.canonical !== "Dark and light",
      );
  for (const entry of themeEntries.filter(Boolean) as LexiconEntry[]) {
    addCandidate(
      candidates,
      matchedSegments,
      segment,
      "visual.themes",
      [entry.canonical],
      "dictionary_theme",
      `Matched the theme term “${entry.canonical}”.`,
    );
  }

  for (const entry of findLexiconEntries(segment.text, PLATFORM_TERMS)) {
    addCandidate(
      candidates,
      matchedSegments,
      segment,
      "product.platforms",
      [entry.canonical],
      "dictionary_platform",
      `Matched the platform term “${entry.canonical}”.`,
    );
  }
  for (const entry of findLexiconEntries(segment.text, INTEGRATION_TERMS)) {
    addCandidate(
      candidates,
      matchedSegments,
      segment,
      "technical.integrations",
      [makeIntegration(entry.canonical, segment.text)],
      "dictionary_integration",
      `Matched the integration term “${entry.canonical}”.`,
    );
  }
  for (const entry of findLexiconEntries(segment.text, SECURITY_TERMS)) {
    addCandidate(
      candidates,
      matchedSegments,
      segment,
      "technical.security",
      [entry.canonical],
      "dictionary_security",
      `Matched the security requirement “${entry.canonical}”.`,
    );
  }
  for (const entry of findLexiconEntries(segment.text, PRIVACY_TERMS)) {
    addCandidate(
      candidates,
      matchedSegments,
      segment,
      "technical.privacy",
      [entry.canonical],
      "dictionary_privacy",
      `Matched the privacy requirement “${entry.canonical}”.`,
    );
  }
  for (const entry of findLexiconEntries(segment.text, DEPLOYMENT_TERMS)) {
    addCandidate(
      candidates,
      matchedSegments,
      segment,
      "technical.deployment",
      entry.canonical,
      "dictionary_deployment",
      `Matched the deployment target “${entry.canonical}”.`,
    );
  }
}

function extractImplicitCandidates(
  segment: SourceSegment,
  candidates: RawCandidate[],
  matchedSegments: Set<string>,
) {
  const projectType = PROJECT_TYPE_TERMS.find((entry) =>
    entry.terms.some((term) => hasTerm(segment.text, term)),
  );
  if (projectType) {
    addCandidate(
      candidates,
      matchedSegments,
      segment,
      "identity.projectType",
      projectType.canonical,
      "classify_project_type",
      `Classified the project type from the term “${projectType.terms.find((term) => hasTerm(segment.text, term)) ?? projectType.canonical}”.`,
      { inferred: true, confidenceAdjustment: -5 },
    );
  }

  if (!segment.section) {
    const userMatch = segment.text.match(
      /\b(?:for|untuk)\s+([^,.]+?)(?=\s+(?:to|with|that|who|agar|dengan|yang)\b|[,.]|$)/i,
    );
    if (userMatch?.[1] && userMatch[1].trim().split(/\s+/).length <= 10) {
      const targetUser = makeTargetUser(userMatch[1]);
      addCandidate(
        candidates,
        matchedSegments,
        segment,
        "business.targetUsers",
        [targetUser.value],
        "implicit_user",
        "Matched a concrete audience after “for” or “untuk”.",
        { inferred: targetUser.inferred, confidenceAdjustment: -8 },
      );
    }

    const goalMatch = segment.text.match(
      /\b(?:goal is|objective is|aims? to|bertujuan untuk|agar)\s+([^.!?]+)/i,
    );
    if (goalMatch?.[1]) {
      addCandidate(
        candidates,
        matchedSegments,
        segment,
        "business.goals",
        [makeGoal(goalMatch[1])],
        "implicit_goal",
        "Matched an explicit goal phrase.",
        { confidenceAdjustment: -4 },
      );
    }
  }

  if (/\b(?:must|must not|required|shall|cannot|harus|wajib|tidak boleh)\b/i.test(segment.text)) {
    addCandidate(
      candidates,
      matchedSegments,
      segment,
      "scope.constraints",
      [titleCaseStart(segment.text)],
      "modal_constraint",
      "Matched mandatory or prohibited language.",
      { confidenceAdjustment: -4 },
    );
  }
}

function candidateValueKey(candidate: RawCandidate): string {
  const value = candidate.value;
  if (Array.isArray(value) && value.length === 1) {
    const item = value[0];
    if (typeof item === "string") return normalizeComparison(item);
    if (item && typeof item === "object" && "name" in item) {
      return normalizeComparison(String((item as { name: unknown }).name));
    }
  }
  if (typeof value === "string") return normalizeComparison(value);
  return normalizeComparison(JSON.stringify(value));
}

function uniqueBy<T>(items: T[], key: (item: T) => string): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const itemKey = key(item);
    if (seen.has(itemKey)) return false;
    seen.add(itemKey);
    return true;
  });
}

function mergeArrayValues(path: ExtractableFieldPath, candidates: RawCandidate[]): unknown[] {
  const values = candidates.flatMap((candidate) =>
    Array.isArray(candidate.value) ? candidate.value : [candidate.value],
  );
  const merged = uniqueBy(values, (value) => {
    if (typeof value === "string") return normalizeComparison(value);
    if (value && typeof value === "object" && "name" in value) {
      return normalizeComparison(String((value as { name: unknown }).name));
    }
    return normalizeComparison(JSON.stringify(value));
  });

  if (
    path === "business.goals" &&
    !merged.some((goal) => (goal as { priority?: unknown }).priority === "primary")
  ) {
    const first = merged[0] as { priority?: "primary" | "secondary" } | undefined;
    if (first) first.priority = "primary";
  }
  return merged;
}

function evidenceFor(candidate: RawCandidate) {
  const evidenceId = `evidence_extract_${stableHash(`${candidate.fieldPath}:${candidate.segment.source.sourceId}:${candidate.segment.segmentId}`)}`;
  return {
    id: evidenceId,
    sourceType: canonicalSourceType(candidate.segment.source.kind),
    sourceId: candidate.segment.source.sourceId,
    excerpt: candidate.segment.excerpt,
    interpretation: candidate.reasoning,
    createdAt: candidate.segment.source.capturedAt,
  };
}

function buildUpdate(path: ExtractableFieldPath, candidates: RawCandidate[]): CanonicalFieldUpdate {
  const evidence = uniqueBy(candidates.map(evidenceFor), (item) => item.id);
  const sources = uniqueBy(
    candidates.map((candidate) => ({
      sourceId: candidate.segment.source.sourceId,
      kind: candidate.segment.source.kind,
      speaker: candidate.segment.speaker,
    })),
    (source) => `${source.sourceId}:${source.kind}:${source.speaker}`,
  );
  const explicitness: ExtractionExplicitness = candidates.some(
    (candidate) => candidate.explicitness === "explicit",
  )
    ? "explicit"
    : "inferred";
  const baseConfidence = Math.max(...candidates.map((candidate) => candidate.confidence));
  const duplicateBonus = Math.min(4, Math.max(0, evidence.length - 1) * 2);
  const value = ARRAY_PATHS.has(path) ? mergeArrayValues(path, candidates) : candidates[0]?.value;
  const updateId = `update_${stableHash(`${path}:${normalizeComparison(JSON.stringify(value))}`)}`;

  return canonicalFieldUpdateSchema.parse({
    updateId,
    fieldPath: path,
    value,
    confidence: Math.min(99, baseConfidence + duplicateBonus),
    evidence,
    evidenceIds: evidence.map((item) => item.id),
    sources,
    reasoning: uniqueBy(
      candidates.map((candidate) => candidate.reasoning),
      normalizeComparison,
    ),
    explicitness,
    status: explicitness === "explicit" ? "confirmed" : "inferred",
    disposition: "proposed",
  });
}

function hasStackContradiction(candidates: RawCandidate[]): boolean {
  const values = new Set(candidates.map(candidateValueKey));
  return STACK_EXCLUSIVE_GROUPS.some(
    (group) => group.filter((item) => values.has(normalizeComparison(item))).length > 1,
  );
}

function pathCandidatesConflict(path: ExtractableFieldPath, candidates: RawCandidate[]): boolean {
  const uniqueValues = new Set(candidates.map(candidateValueKey));
  if (uniqueValues.size < 2) return false;
  if (!ARRAY_PATHS.has(path)) return true;
  if (path === "technical.preferredStack") return hasStackContradiction(candidates);
  if (path === "visual.themes") {
    return uniqueValues.has("dark only") && uniqueValues.has("light only");
  }
  return false;
}

function criticalityFor(path: ExtractableFieldPath) {
  if (CRITICAL_PATHS.has(path)) return "blocking" as const;
  if (path.startsWith("technical.") || path.startsWith("scope.")) return "high" as const;
  return "medium" as const;
}

function projectFieldMap(project: CanonicalProject): Map<string, ProjectField<unknown>> {
  const sections = [
    "identity",
    "business",
    "scope",
    "product",
    "visual",
    "technical",
    "quality",
    "execution",
  ] as const;
  const fields = new Map<string, ProjectField<unknown>>();
  for (const section of sections) {
    const group = project[section] as unknown as Record<string, ProjectField<unknown>>;
    for (const [key, field] of Object.entries(group)) fields.set(`${section}.${key}`, field);
  }
  return fields;
}

function equivalent(left: unknown, right: unknown): boolean {
  const normalize = (value: unknown): unknown => {
    if (typeof value === "string") return normalizeComparison(value);
    if (Array.isArray(value)) {
      return value
        .map(normalize)
        .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
    }
    if (value && typeof value === "object") {
      return Object.fromEntries(
        Object.entries(value)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([key, nested]) => [key, normalize(nested)]),
      );
    }
    return value;
  };
  return JSON.stringify(normalize(left)) === JSON.stringify(normalize(right));
}

function markCrossPathContradictions(
  updates: CanonicalFieldUpdate[],
  conflicts: ExtractionResult["conflicts"],
) {
  const features = updates.find((update) => update.fieldPath === "product.features");
  const exclusions = updates.find((update) => update.fieldPath === "scope.outOfScope");
  if (!features || !exclusions) return;
  const featureNames = new Set(
    (features.value as Array<{ name: string }>).map((feature) => normalizeComparison(feature.name)),
  );
  const overlapping = (exclusions.value as string[]).filter((item) =>
    featureNames.has(normalizeComparison(item)),
  );
  if (overlapping.length === 0) return;

  features.disposition = "blocked_conflict";
  exclusions.disposition = "blocked_conflict";
  conflicts.push({
    conflictId: `conflict_extract_${stableHash(`scope-feature:${overlapping.join(":")}`)}`,
    fieldPaths: ["product.features", "scope.outOfScope"],
    candidateUpdateIds: [features.updateId, exclusions.updateId],
    evidenceIds: uniqueBy([...features.evidenceIds, ...exclusions.evidenceIds], String),
    severity: "blocking",
    reason: `The same capability is both required and excluded: ${overlapping.join(", ")}.`,
  });
}

export function extractCanonicalUpdates(input: ExtractionRequest | unknown): ExtractionResult {
  const request = extractionRequestSchema.parse(input);
  const segments = segmentSources(request.sources);
  const candidates: RawCandidate[] = [];
  const matchedSegments = new Set<string>();

  for (const segment of segments) {
    extractSectionCandidate(segment, candidates, matchedSegments);
    extractDictionaryCandidates(segment, candidates, matchedSegments);
    extractImplicitCandidates(segment, candidates, matchedSegments);
  }

  const hasExplicitSectionCandidate = (fieldPath: ExtractableFieldPath, ruleId: string) =>
    candidates.some(
      (candidate) =>
        candidate.fieldPath === fieldPath &&
        candidate.ruleId === ruleId &&
        candidate.explicitness === "explicit",
    );
  const effectiveCandidates = candidates.filter((candidate) => {
    if (
      candidate.fieldPath === "business.targetUsers" &&
      candidate.ruleId === "implicit_user" &&
      hasExplicitSectionCandidate("business.targetUsers", "section_user")
    ) {
      return false;
    }
    if (
      candidate.fieldPath === "identity.projectType" &&
      candidate.ruleId === "classify_project_type" &&
      hasExplicitSectionCandidate("identity.projectType", "section_project_type")
    ) {
      return false;
    }
    return true;
  });

  const candidatesByPath = new Map<ExtractableFieldPath, RawCandidate[]>();
  for (const candidate of effectiveCandidates) {
    const existing = candidatesByPath.get(candidate.fieldPath) ?? [];
    existing.push(candidate);
    candidatesByPath.set(candidate.fieldPath, existing);
  }

  const updates: CanonicalFieldUpdate[] = [];
  const conflicts: ExtractionResult["conflicts"] = [];

  for (const [path, pathCandidates] of [...candidatesByPath.entries()].sort(([left], [right]) =>
    left.localeCompare(right),
  )) {
    if (!pathCandidatesConflict(path, pathCandidates)) {
      updates.push(buildUpdate(path, pathCandidates));
      continue;
    }

    const candidateGroups = new Map<string, RawCandidate[]>();
    for (const candidate of pathCandidates) {
      const key = candidateValueKey(candidate);
      const group = candidateGroups.get(key) ?? [];
      group.push(candidate);
      candidateGroups.set(key, group);
    }
    const conflictUpdates = [...candidateGroups.values()].map((group) => {
      const update = buildUpdate(path, group);
      update.disposition = "blocked_conflict";
      updates.push(update);
      return update;
    });
    conflicts.push({
      conflictId: `conflict_extract_${stableHash(`${path}:${conflictUpdates.map((update) => update.updateId).join(":")}`)}`,
      fieldPaths: [path],
      candidateUpdateIds: conflictUpdates.map((update) => update.updateId),
      evidenceIds: uniqueBy(
        conflictUpdates.flatMap((update) => update.evidenceIds),
        String,
      ),
      severity: criticalityFor(path),
      reason: `Explicit source statements contain incompatible values for ${path}.`,
    });
  }

  markCrossPathContradictions(updates, conflicts);

  const protectedFields: ExtractionResult["protectedFields"] = [];
  if (request.existingProject !== undefined) {
    const existingProject = parseCanonicalProject(request.existingProject);
    const existingFields = projectFieldMap(existingProject);
    for (const update of updates) {
      const existing = existingFields.get(update.fieldPath);
      if (!existing || existing.approval.status !== "approved") continue;
      update.fieldId = existing.id;
      update.disposition = "blocked_approved";
      protectedFields.push({
        fieldPath: update.fieldPath,
        fieldId: existing.id,
        updateId: update.updateId,
        reason: equivalent(existing.value, update.value)
          ? "The extracted value duplicates an approved canonical value; no write is required."
          : "The extracted value differs from an approved canonical value and cannot overwrite it.",
      });
    }
  }

  updates.sort(
    (left, right) =>
      left.fieldPath.localeCompare(right.fieldPath) || left.updateId.localeCompare(right.updateId),
  );
  conflicts.sort((left, right) => left.conflictId.localeCompare(right.conflictId));
  protectedFields.sort((left, right) => left.fieldPath.localeCompare(right.fieldPath));

  return extractionResultSchema.parse({
    updates,
    conflicts,
    protectedFields,
    sourceCount: request.sources.length,
    segmentCount: segments.length,
    unmatchedSegmentCount: segments.filter((segment) => !matchedSegments.has(segment.segmentId))
      .length,
  });
}
