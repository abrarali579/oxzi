import { z } from "zod";

import { contentFingerprintSchema } from "@/domain/knowledge-graph";
import { timestampSchema } from "@/domain/project";

const nonempty = z.string().trim().min(1);

// ── Test Suite ──────────────────────────────────────────────────

export const testCaseSchema = z.object({
  name: nonempty,
  description: nonempty,
  engine: z.enum([
    "extraction",
    "discovery",
    "context_compiler_v1",
    "context_compiler_v2",
    "prompt_renderer",
    "task_card_compiler",
    "planning",
  ]),
  input: z.unknown(),
  expectedAssertions: z.array(z.string().trim().min(1)),
});

export const testSuiteSchema = z.object({
  name: nonempty,
  description: nonempty,
  cases: z.array(testCaseSchema).min(1),
});

export const testCaseResultSchema = z.object({
  name: nonempty,
  passed: z.boolean(),
  durationMs: z.number().nonnegative(),
  failures: z.array(z.string()),
});

export const testSuiteResultSchema = z.object({
  suiteName: nonempty,
  totalCases: z.number().int().positive(),
  passedCases: z.number().int().nonnegative(),
  failedCases: z.number().int().nonnegative(),
  results: z.array(testCaseResultSchema),
  totalDurationMs: z.number().nonnegative(),
});

// ── Benchmark ───────────────────────────────────────────────────

export const benchmarkResultSchema = z.object({
  engine: nonempty,
  durationMs: z.number().nonnegative(),
  memoryMb: z.number().nonnegative(),
  tokenCount: z.number().int().nonnegative().nullable(),
  iterations: z.number().int().positive(),
  p50Ms: z.number().nonnegative(),
  p95Ms: z.number().nonnegative(),
  p99Ms: z.number().nonnegative(),
});

export const benchmarkReportSchema = z.object({
  timestamp: timestampSchema,
  results: z.array(benchmarkResultSchema),
  fingerprint: contentFingerprintSchema,
});

// ── Regression ──────────────────────────────────────────────────

export const regressionEntrySchema = z.object({
  engine: nonempty,
  metric: z.enum(["durationMs", "memoryMb", "tokenCount"]),
  baselineValue: z.number(),
  currentValue: z.number(),
  thresholdPercent: z.number().nonnegative(),
});

export const regressionReportSchema = z.object({
  baselineVersion: nonempty,
  currentVersion: nonempty,
  generatedAt: timestampSchema,
  regressions: z.array(regressionEntrySchema),
  totalEngines: z.number().int().positive(),
  regressedEngines: z.number().int().nonnegative(),
});

// ── Token ledger (ADR-019) ───────────────────────────────────────

export const measurementStatusSchema = z.enum([
  "measured",
  "tokenizer_estimated",
  "character_estimated",
  "unavailable",
]);

export const tokenCountSchema = z.object({
  input: z.number().int().nonnegative(),
  output: z.number().int().nonnegative(),
  cacheHits: z.number().int().nonnegative(),
  cacheMisses: z.number().int().nonnegative(),
  grossTokens: z.number().int().nonnegative(),
  overheadTokens: z.number().int().nonnegative(),
  netTokens: z.number().int().nonnegative(),
  status: measurementStatusSchema,
});

export const tokenLedgerEntrySchema = z.object({
  operation: nonempty,
  tokens: tokenCountSchema,
  recordedAt: timestampSchema,
});

export const tokenLedgerReportSchema = z.object({
  entries: z.array(tokenLedgerEntrySchema),
  totalInput: z.number().int().nonnegative(),
  totalOutput: z.number().int().nonnegative(),
  totalGross: z.number().int().nonnegative(),
  totalOverhead: z.number().int().nonnegative(),
  totalNet: z.number().int().nonnegative(),
  totalCacheHits: z.number().int().nonnegative(),
  totalCacheMisses: z.number().int().nonnegative(),
});

export type TestCase = z.infer<typeof testCaseSchema>;
export type TestSuite = z.infer<typeof testSuiteSchema>;
export type TestCaseResult = z.infer<typeof testCaseResultSchema>;
export type TestSuiteResult = z.infer<typeof testSuiteResultSchema>;
export type BenchmarkResult = z.infer<typeof benchmarkResultSchema>;
export type BenchmarkReport = z.infer<typeof benchmarkReportSchema>;
export type RegressionEntry = z.infer<typeof regressionEntrySchema>;
export type RegressionReport = z.infer<typeof regressionReportSchema>;
export type TokenCount = z.infer<typeof tokenCountSchema>;
export type TokenLedgerEntry = z.infer<typeof tokenLedgerEntrySchema>;
export type TokenLedgerReport = z.infer<typeof tokenLedgerReportSchema>;
