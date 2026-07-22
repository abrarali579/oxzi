import { SECTION_ALIASES } from "./lexicon";
import type { ExtractableFieldPath, ExtractionSource } from "./types";

export type SegmentSpeaker = "user" | "assistant" | "unknown";

export type SourceSegment = {
  segmentId: string;
  source: ExtractionSource;
  text: string;
  excerpt: string;
  section?: ExtractableFieldPath;
  speaker: SegmentSpeaker;
  index: number;
};

export function stableHash(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

export function normalizeComparison(value: string): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("en-US")
    .replace(/[“”‘’]/g, "'")
    .replace(/[^\p{L}\p{N}+#.]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function redactSensitiveExcerpt(value: string): string {
  return value
    .replace(
      /\b(authorization|cookie|set-cookie)\s*:\s*[^\n]+/gi,
      (_match, key: string) => `${key}: [REDACTED]`,
    )
    .replace(
      /\b(password|passwd|secret|token|api[_-]?key|private[_-]?key)\s*[:=]\s*[^\s,;]+/gi,
      (_match, key: string) => `${key}=[REDACTED]`,
    )
    .replace(
      /-----BEGIN [^-]*PRIVATE KEY-----[\s\S]*?-----END [^-]*PRIVATE KEY-----/gi,
      "[REDACTED PRIVATE KEY]",
    );
}

function headingKey(value: string): string {
  return normalizeComparison(value.replace(/^#{1,6}\s*/, "").replace(/:$/, ""));
}

function defaultSpeaker(source: ExtractionSource): SegmentSpeaker {
  if (source.kind === "plain_text" || source.kind === "master_prompt") return "user";
  return "unknown";
}

function splitParagraph(value: string): string[] {
  const sentences = value
    .split(/(?<=[.!?])\s+(?=[\p{Lu}\p{N}])/u)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
  return sentences.length > 0 ? sentences : [value];
}

export function segmentSources(sources: ExtractionSource[]): SourceSegment[] {
  const segments: SourceSegment[] = [];

  for (const source of sources) {
    let activeSection: ExtractableFieldPath | undefined;
    let speaker = defaultSpeaker(source);
    const lines = source.content.normalize("NFKC").replace(/\r\n?/g, "\n").split("\n");

    for (const originalLine of lines) {
      let line = originalLine.trim();
      if (!line) continue;

      const speakerMatch = line.match(/^(user|human|assistant|ai)\s*:\s*(.*)$/i);
      if (speakerMatch) {
        speaker = /^(assistant|ai)$/i.test(speakerMatch[1] ?? "") ? "assistant" : "user";
        line = (speakerMatch[2] ?? "").trim();
        if (!line) continue;
      }

      const markdownStripped = line.replace(/^#{1,6}\s*/, "").trim();
      const standaloneSection = SECTION_ALIASES[headingKey(markdownStripped)];
      if (standaloneSection) {
        activeSection = standaloneSection;
        continue;
      }

      const inlineHeading = markdownStripped.match(/^([^:]{1,48}):\s*(.+)$/);
      if (inlineHeading) {
        const inlineSection = SECTION_ALIASES[headingKey(inlineHeading[1] ?? "")];
        if (inlineSection) {
          activeSection = inlineSection;
          line = (inlineHeading[2] ?? "").trim();
        }
      }

      const listItem = line.match(/^(?:[-*+]\s+|\d+[.)]\s+)(.+)$/);
      const cleanedLine = (listItem?.[1] ?? line).trim();
      const pieces = listItem || activeSection ? [cleanedLine] : splitParagraph(cleanedLine);

      for (const piece of pieces) {
        if (!piece) continue;
        const index = segments.length;
        segments.push({
          segmentId: `segment_${stableHash(`${source.sourceId}:${index}:${piece}`)}`,
          source,
          text: piece,
          excerpt: redactSensitiveExcerpt(piece).slice(0, 500),
          ...(activeSection ? { section: activeSection } : {}),
          speaker,
          index,
        });
      }
    }
  }

  return segments;
}
