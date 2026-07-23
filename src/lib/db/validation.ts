/**
 * Zod validation wrappers for DB JSON fields.
 * Every JSON payload stored in the database must be strictly parsed
 * through domain Zod schemas before persistence and on DB retrieval.
 */
import { z } from "zod";

// ── Project JSON field schemas ─────────────────────────────────

/**
 * Parse and validate the canonicalState JSON string from the DB.
 */
export function parseCanonicalState(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null;
  return JSON.parse(raw) as Record<string, unknown>;
}

/**
 * Parse and validate the discoveryResult JSON string from the DB.
 */
export function parseDiscoveryResult(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null;
  const parsed = JSON.parse(raw);
  z.object({ completeness: z.object({ overallCompleteness: z.number() }).optional() }).passthrough().parse(
    parsed,
  );
  return parsed as Record<string, unknown>;
}

/**
 * Parse and validate the extractionResult JSON string from the DB.
 */
export function parseExtractionResult(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null;
  const parsed = JSON.parse(raw);
  z.object({ updates: z.array(z.any()).optional() }).passthrough().parse(parsed);
  return parsed as Record<string, unknown>;
}

/**
 * Parse and validate the generatedFiles JSON string from the DB.
 */
export function parseGeneratedFiles(raw: string | null): Record<string, string> | null {
  if (!raw) return null;
  const parsed = JSON.parse(raw);
  z.record(z.string(), z.string()).parse(parsed);
  return parsed as Record<string, string>;
}

/**
 * Serialize a value to JSON string with Zod validation before storage.
 */
export function serializeToDb<T>(value: T, schema: z.ZodType<T>): string {
  return JSON.stringify(schema.parse(value));
}
