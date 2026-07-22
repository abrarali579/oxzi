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
import {
  normalizeComparison,
  normalizeForMatching,
  redactSensitiveExcerpt,
  segmentSources,
  stableHash,
  type SourceSegment,
} from "./parser";
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
  const normalizedText = ` ${normalizeForMatching(text)} `;
  const normalizedTerm = normalizeForMatching(term);
  return normalizedText.includes(` ${normalizedTerm} `) || normalizedText.trim() === normalizedTerm;
}

function findLexiconEntries(text: string, entries: readonly LexiconEntry[]): LexiconEntry[] {
  return entries.filter((entry) => entry.terms.some((term) => hasTerm(text, term)));
}

function cleanItem(value: string): string {
  return value
    .trim()
    .replace(/^[-*+]\s*/, "")
    .replace(
      /^(?:must|should|could|required|harus|wajib|optional|zaroori|lazmi|laazmi)\s*[:\-]?\s*/i,
      "",
    )
    .replace(/[.;]+$/, "")
    .trim();
}

function splitItems(value: string): string[] {
  const parts = value
    .split(/\s*(?:[,;|]|\band\b|\bdan\b|\baur\b)\s*/i)
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

function preserveStatement(value: string): string {
  const cleaned = redactSensitiveExcerpt(value)
    .trim()
    .replace(/[.;]+$/, "")
    .trim();
  return cleaned ? cleaned[0]!.toLocaleUpperCase() + cleaned.slice(1) : cleaned;
}

function itemPriority(value: string): "must" | "should" | "could" {
  if (
    /\b(?:must|required|critical|wajib|harus|zaroori|lazmi|laazmi|chahiye|chahye|utama|p0)\b/i.test(
      value,
    )
  )
    return "must";
  if (/\b(?:could|optional|nice to have|opsional|p2)\b/i.test(value)) return "could";
  return "should";
}

function goalPriority(value: string): "primary" | "secondary" {
  return /\b(?:primary|main|most important|utama|prioritas|maqsad|p0)\b/i.test(value)
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
    value
      .replace(
        /^(?:(?:mera|mery|hamara|humara)\s+)?(?:goal|objective|tujuan|maqsad)\s*(?:is|hai|adalah)?\s*/i,
        "",
      )
      .replace(/\s+(?:hai|hoga|ho ga)$/i, ""),
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
    purpose: `Integration identified from source: ${cleanItem(redactSensitiveExcerpt(context))}`,
    direction: direction(context),
    required:
      /\b(?:must|required|wajib|harus|zaroori|lazmi|laazmi|chahiye|chahye|integrate|integration|integrasi)\b/i.test(
        context,
      ),
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

function sanitizeCandidateValue(value: unknown): unknown {
  if (typeof value === "string") return redactSensitiveExcerpt(value);
  if (Array.isArray(value)) return value.map(sanitizeCandidateValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => [key, sanitizeCandidateValue(nested)]),
    );
  }
  return value;
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
    value: sanitizeCandidateValue(value),
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

type TemporalScope = "current_mvp" | "later" | "out_of_scope" | "undecided" | "unspecified";

function classifyTemporalScope(value: string): TemporalScope {
  const text = normalizeForMatching(value);
  if (
    /\b(?:undecided|not decided|decision pending|tbd|to be decided|abhi decide nahi|decide later)\b/.test(
      text,
    )
  ) {
    return "undecided";
  }
  if (
    /\b(?:out of scope|outside scope|not in scope|exclude from mvp|excluded from mvp|not part of mvp|mvp mein nahi|mvp me nahi)\b/.test(
      text,
    )
  ) {
    return "out_of_scope";
  }
  if (
    /\b(?:later|future|future phase|phase 2|phase two|next phase|baad mein|baad me|abhi nahi|not now)\b/.test(
      text,
    ) ||
    /\babhi\b.+\bnahi\s+chahiye\b/.test(text)
  ) {
    return "later";
  }
  if (
    /\b(?:current mvp|mvp|first version|initial release|current release|abhi ke liye)\b/.test(text)
  ) {
    return "current_mvp";
  }
  return "unspecified";
}

function scopedSubject(value: string): string {
  const cleaned = cleanItem(value)
    .replace(
      /^(?:later|future|future phase|phase\s+(?:2|two)|next phase|out of scope|undecided|tbd)\s*[:\-]?\s*/i,
      "",
    )
    .replace(/^(?:for\s+)?(?:the\s+)?(?:current\s+)?mvp\s*(?:includes?|contains?|needs?)?\s*/i, "")
    .replace(/^(?:we\s+)?(?:can\s+)?(?:add|include|support)\s+/i, "")
    .replace(/^abhi\s+/i, "")
    .replace(/\s+(?:is\s+)?(?:out of scope|outside scope|undecided|tbd)$/i, "")
    .replace(
      /\s+(?:later|in (?:a )?future(?: phase)?|in phase\s+(?:2|two)|baad mein|baad me)$/i,
      "",
    )
    .replace(/\s+(?:nahi|ni)\s+(?:chahiye|chahye)$/i, "")
    .trim();
  return cleaned || cleanItem(value);
}

function canonicalListItem(path: ExtractableFieldPath, value: string): string {
  const lexicons: Partial<Record<ExtractableFieldPath, readonly LexiconEntry[]>> = {
    "technical.preferredStack": TECH_TERMS,
    "quality.localization": LANGUAGE_TERMS,
    "visual.visualKeywords": VISUAL_TERMS,
    "visual.themes": THEME_TERMS,
    "product.platforms": PLATFORM_TERMS,
    "technical.security": SECURITY_TERMS,
    "technical.privacy": PRIVACY_TERMS,
  };
  const match = lexicons[path]?.find((entry) => entry.terms.some((term) => hasTerm(value, term)));
  if (match) return match.canonical;
  if (path === "quality.localization" && /^(?:bahasa|bhasa)$/i.test(normalizeForMatching(value))) {
    return "Bahasa Indonesia";
  }
  if (path === "scope.constraints" && /\bmobile first\b/.test(normalizeForMatching(value))) {
    return "Mobile-first";
  }
  return titleCaseStart(value);
}

function canonicalDeployment(value: string): string {
  return (
    DEPLOYMENT_TERMS.find((entry) => entry.terms.some((term) => hasTerm(value, term)))?.canonical ??
    cleanItem(value)
  );
}

function extractScopeOrNegativeCandidate(
  segment: SourceSegment,
  candidates: RawCandidate[],
  matchedSegments: Set<string>,
): boolean {
  if (segment.section === "scope.outOfScope") return false;

  const temporalScope = classifyTemporalScope(segment.text);
  const subject = titleCaseStart(scopedSubject(segment.text));
  if (
    temporalScope === "later" ||
    temporalScope === "out_of_scope" ||
    temporalScope === "undecided"
  ) {
    const prefix =
      temporalScope === "later" ? "Deferred: " : temporalScope === "undecided" ? "Undecided: " : "";
    addCandidate(
      candidates,
      matchedSegments,
      segment,
      "scope.outOfScope",
      [`${prefix}${subject}`],
      `temporal_${temporalScope}`,
      `Classified the statement as ${temporalScope.replaceAll("_", " ")} rather than current scope.`,
      { confidenceAdjustment: segment.section ? -2 : -8 },
    );
    return true;
  }

  const matchingText = normalizeForMatching(segment.text);
  const avoidMatch = segment.text.match(/\bavoid\s+(.+)$/i);
  if (avoidMatch?.[1]) {
    const avoided = titleCaseStart(avoidMatch[1]);
    const visual = /\b(?:design|layout|visual|style|crowded|clutter|color|colour|animation)\b/.test(
      matchingText,
    );
    addCandidate(
      candidates,
      matchedSegments,
      segment,
      visual ? "visual.avoidList" : "scope.constraints",
      [visual ? avoided : `Avoid ${avoided}`],
      visual ? "negative_visual" : "negative_constraint",
      "Matched an explicit negative constraint.",
      { confidenceAdjustment: segment.section ? -2 : -6 },
    );
    return true;
  }

  if (
    /\b(?:do not|don't|must not|shall not|cannot|can not|nahi hona chahiye|nahi hona chahye|ni hona chahiye|tidak boleh)\b/.test(
      matchingText,
    )
  ) {
    addCandidate(
      candidates,
      matchedSegments,
      segment,
      "scope.constraints",
      [preserveStatement(segment.text)],
      "negative_constraint",
      "Matched an explicit prohibition and preserved it as a constraint.",
      { confidenceAdjustment: segment.section ? -2 : -6 },
    );
    return true;
  }

  if (temporalScope === "current_mvp") {
    addCandidate(
      candidates,
      matchedSegments,
      segment,
      "scope.inScope",
      [subject],
      "temporal_current_mvp",
      "Matched an explicit current-MVP scope statement.",
      { confidenceAdjustment: segment.section ? -2 : -6 },
    );
  }

  return false;
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
        segment.section === "technical.deployment"
          ? canonicalDeployment(segment.text)
          : cleanItem(segment.text),
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
    case "technical.preferredStack":
    case "quality.localization":
    case "visual.visualKeywords":
    case "visual.themes":
    case "product.platforms":
    case "technical.security":
    case "technical.privacy":
    case "scope.constraints":
      for (const item of items)
        addCandidate(
          candidates,
          matchedSegments,
          segment,
          segment.section,
          [canonicalListItem(segment.section, item)],
          "section_normalized_list",
          reasoning,
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
  const options = { confidenceAdjustment: segment.section ? 0 : -8 };
  for (const entry of findLexiconEntries(segment.text, TECH_TERMS)) {
    addCandidate(
      candidates,
      matchedSegments,
      segment,
      "technical.preferredStack",
      [entry.canonical],
      "dictionary_tech",
      `Matched the technology term “${entry.canonical}”.`,
      options,
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
      options,
    );
  }
  if (
    !findLexiconEntries(segment.text, LANGUAGE_TERMS).some(
      (entry) => entry.canonical === "Bahasa Indonesia",
    ) &&
    /\b(?:bahasa|bhasa)\b/.test(normalizeForMatching(segment.text)) &&
    (segment.section === "quality.localization" ||
      /\b(?:language|languages|zaban|localization|localisation)\b/.test(
        normalizeForMatching(segment.text),
      ))
  ) {
    addCandidate(
      candidates,
      matchedSegments,
      segment,
      "quality.localization",
      ["Bahasa Indonesia"],
      "dictionary_language_context",
      "Normalized Bahasa to Bahasa Indonesia in an explicit language context.",
      options,
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
      options,
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
      options,
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
      options,
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
      options,
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
      options,
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
      options,
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
      options,
    );
  }
}

function extractImplicitCandidates(
  segment: SourceSegment,
  candidates: RawCandidate[],
  matchedSegments: Set<string>,
) {
  const matchingText = normalizeForMatching(segment.text);
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
      /\b(?:for|untuk)\s+([^,.]+?)(?=\s+(?:to|with|that|who|agar|dengan|yang)\b|[,.]|$)|\b(users?|customers?|clients?)\s+ke\s+liye\b/i,
    );
    const explicitUserValue = userMatch?.[1] ?? userMatch?.[2];
    if (explicitUserValue && explicitUserValue.trim().split(/\s+/).length <= 10) {
      const targetUser = makeTargetUser(explicitUserValue);
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
      /\b(?:(?:mera|mery|hamara|humara)\s+)?(?:goal|maqsad)\s*(?:is|hai|adalah)?\s*[:\-]?\s*([^.!?]+)|\b(?:objective is|aims? to|bertujuan untuk|agar)\s+([^.!?]+)/i,
    );
    const goalValue = goalMatch?.[1] ?? goalMatch?.[2];
    if (goalValue) {
      addCandidate(
        candidates,
        matchedSegments,
        segment,
        "business.goals",
        [makeGoal(goalValue)],
        "implicit_goal",
        "Matched an explicit goal phrase.",
        { confidenceAdjustment: -8 },
      );
    }

    const audienceMatch = matchingText.match(
      /\b(?:users?|customers?|clients?)\s+(?:are|hain|honge|hoga)\s+([^.!?]+)|\b(?:users?|customers?|clients?)\s*[:\-]\s*([^.!?]+)|\bkis ke liye\s*[:\-]?\s*([^.!?]+)/,
    );
    const audienceValue = audienceMatch?.[1] ?? audienceMatch?.[2] ?? audienceMatch?.[3];
    if (
      audienceValue &&
      audienceValue.trim().split(/\s+/).length <= 12 &&
      !/\b(?:unknown|undecided|not sure|pata nahi)\b/.test(audienceValue)
    ) {
      const targetUser = makeTargetUser(audienceValue.replace(/\s+(?:hain|honge|hoga)$/i, ""));
      addCandidate(
        candidates,
        matchedSegments,
        segment,
        "business.targetUsers",
        [targetUser.value],
        "sectionless_user",
        "Matched an explicit sectionless audience statement.",
        { inferred: targetUser.inferred, confidenceAdjustment: -8 },
      );
    }

    const patternText = segment.text
      .replace(/\bchahye\b/gi, "chahiye")
      .replace(/\bho\s+ga\b/gi, "hoga");
    const featureMatch = patternText.match(
      /\b(?:features?|functionality|isme)\s*(?:mein|me|are|include|includes|will include|hoga|honge|hona chahiye|chahiye)?\s*[:\-]?\s*(.+)|\b(?:it|the (?:mvp|product|app|website|system))\s+(?:must|should|will)\s+include\s+(.+)/i,
    );
    const featureValue = featureMatch?.[1] ?? featureMatch?.[2];
    if (featureValue) {
      const cleanedFeatures = featureValue
        .replace(/[.!?]+$/, "")
        .replace(/\s+(?:hona chahiye|chahiye|honge|hoga|hai)$/i, "")
        .trim();
      for (const item of splitItems(cleanedFeatures)) {
        addCandidate(
          candidates,
          matchedSegments,
          segment,
          "product.features",
          [makeFeature(item)],
          "sectionless_feature",
          "Matched an explicit sectionless feature statement.",
          { confidenceAdjustment: -8 },
        );
      }
    }

    const problemMatch = matchingText.match(
      /\b(?:problem|issue|masla)\s*(?:is|hai|ye hai)?\s*[:\-]?\s*(.+)/,
    );
    if (
      problemMatch?.[1] &&
      !/\b(?:unknown|undecided|not sure|pata nahi)\b/.test(problemMatch[1])
    ) {
      addCandidate(
        candidates,
        matchedSegments,
        segment,
        "business.problem",
        titleCaseStart(problemMatch[1]),
        "sectionless_problem",
        "Matched an explicit sectionless problem statement.",
        { confidenceAdjustment: -8 },
      );
    }

    const solutionMatch = matchingText.match(
      /\b(?:solution|hal)\s*(?:is|hai|ye hai)?\s*[:\-]?\s*(.+)/,
    );
    if (solutionMatch?.[1]) {
      addCandidate(
        candidates,
        matchedSegments,
        segment,
        "business.solution",
        titleCaseStart(solutionMatch[1]),
        "sectionless_solution",
        "Matched an explicit sectionless solution statement.",
        { confidenceAdjustment: -8 },
      );
    }

    const riskMatch = matchingText.match(/\b(?:risk|risks|khatra)\s*(?:is|hai)?\s*[:\-]?\s*(.+)/);
    if (riskMatch?.[1]) {
      addCandidate(
        candidates,
        matchedSegments,
        segment,
        "execution.risks",
        [makeRisk(riskMatch[1])],
        "sectionless_risk",
        "Matched an explicit sectionless risk statement.",
        { inferred: !/mitigation|mitigasi|->/i.test(segment.text), confidenceAdjustment: -8 },
      );
    }
  }

  if (
    /\b(?:must|required|shall|cannot|harus|wajib|zaroori|lazmi|laazmi|tidak boleh)\b/.test(
      matchingText,
    )
  ) {
    addCandidate(
      candidates,
      matchedSegments,
      segment,
      "scope.constraints",
      [preserveStatement(segment.text)],
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
    featureNames.has(
      normalizeComparison(item).replace(/^(?:deferred|future|later|undecided|out of scope)\s+/, ""),
    ),
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
    const suppressCurrentExtraction = extractScopeOrNegativeCandidate(
      segment,
      candidates,
      matchedSegments,
    );
    if (!suppressCurrentExtraction) {
      extractSectionCandidate(segment, candidates, matchedSegments);
    }
    if (!suppressCurrentExtraction && segment.section !== "scope.outOfScope") {
      extractDictionaryCandidates(segment, candidates, matchedSegments);
      extractImplicitCandidates(segment, candidates, matchedSegments);
    }
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
