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

export function normalizeForMatching(value: string): string {
  return normalizeComparison(value)
    .replace(/\bchahye\b/g, "chahiye")
    .replace(/\bbnana\b/g, "banana")
    .replace(/\bkrna\b/g, "karna")
    .replace(/\bho\s+ga\b/g, "hoga")
    .replace(/\bni\b/g, "nahi")
    .replace(/\bmery\b/g, "mera")
    .replace(/\bhumara\b/g, "hamara")
    .replace(/\s+/g, " ")
    .trim();
}

export function redactSensitiveExcerpt(value: string): string {
  return value
    .replace(
      /\b(authorization|cookie|set-cookie)\s*:\s*[^\n]+/gi,
      (_match, key: string) => `${key}: [REDACTED]`,
    )
    .replace(
      /\b(password|passwd|passphrase|secret|token|api[_-]?key|access[_-]?key|client[_-]?secret|private[_-]?key|session(?:[_-]?(?:id|key|token))?|auth)\s*[:=]\s*(?:["'][^"'\r\n]*["']|[^\s,;]+)/gi,
      (_match, key: string) => `${key}=[REDACTED]`,
    )
    .replace(/\bAKIA[0-9A-Z]{16}\b/g, "[REDACTED AWS ACCESS KEY]")
    .replace(/\bgh[pousr]_[A-Za-z0-9_]{20,}\b/g, "[REDACTED GITHUB TOKEN]")
    .replace(/\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g, "[REDACTED SLACK TOKEN]")
    .replace(/\bsk-(?:proj-)?[A-Za-z0-9_-]{12,}\b/g, "[REDACTED API KEY]")
    .replace(/(https?:\/\/)([^/\s:@]+):([^@\s/]+)@/gi, "$1[REDACTED CREDENTIALS]@")
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
    .split(/(?<=[.!?])\s+(?=[\p{L}\p{N}])|\s*;\s*/u)
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
      const clauses = originalLine
        .split(/\s*;\s*/)
        .map((value) => value.trim())
        .filter(Boolean);

      for (const originalClause of clauses) {
        let line = originalClause;
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
  }

  return segments;
}
