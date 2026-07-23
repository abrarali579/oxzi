import { performance } from "node:perf_hooks";
import { compileCanonicalContext } from "@/domain/context-compiler";
import { compileTaskCard } from "@/domain/task-card";
import { renderPromptProgram } from "@/domain/prompt-renderer";
import { evaluatePlanGovernance } from "@/domain/planning";
import { analyzeDiscovery } from "@/domain/discovery";
import { extractCanonicalUpdates } from "@/domain/extraction";
import {
  testCaseSchema,
  testSuiteSchema,
  testSuiteResultSchema,
  benchmarkResultSchema,
  type TestCase,
  type TestSuite,
  type TestSuiteResult,
  type BenchmarkResult,
} from "./schema";

// ── Engine registry ────────────────────────────────────────────

type EngineFn = (input: unknown) => unknown;

const engineRegistry: Record<string, EngineFn> = {
  extraction: (input) => extractCanonicalUpdates(input),
  discovery: (input) => analyzeDiscovery(input),
  context_compiler_v1: (input) => compileCanonicalContext(input),
  prompt_renderer: (input) => renderPromptProgram(input),
  task_card_compiler: (input) =>
    compileTaskCard(input as unknown as Parameters<typeof compileTaskCard>[0]),
  planning: (input) => evaluatePlanGovernance(input),
};

// ── Test suite runner ──────────────────────────────────────────

export async function runTestCase(testCase: TestCase): Promise<{
  name: string;
  passed: boolean;
  durationMs: number;
  failures: string[];
}> {
  const parsed = testCaseSchema.parse(testCase);
  const engine = engineRegistry[parsed.engine];
  const failures: string[] = [];

  if (!engine) {
    return {
      name: parsed.name,
      passed: false,
      durationMs: 0,
      failures: [`Unknown engine: ${parsed.engine}`],
    };
  }

  const start = performance.now();
  try {
    engine(parsed.input);
  } catch (err) {
    failures.push(`Engine threw: ${err instanceof Error ? err.message : String(err)}`);
  }
  const durationMs = performance.now() - start;

  return {
    name: parsed.name,
    passed: failures.length === 0,
    durationMs: Math.round(durationMs * 100) / 100,
    failures,
  };
}

export async function runTestSuite(suite: TestSuite): Promise<TestSuiteResult> {
  const parsed = testSuiteSchema.parse(suite);
  const results = await Promise.all(parsed.cases.map(runTestCase));

  const passedCases = results.filter((r) => r.passed).length;
  const failedCases = results.filter((r) => !r.passed).length;
  const totalDurationMs = results.reduce((sum, r) => sum + r.durationMs, 0);

  return testSuiteResultSchema.parse({
    suiteName: parsed.name,
    totalCases: results.length,
    passedCases,
    failedCases,
    results,
    totalDurationMs: Math.round(totalDurationMs * 100) / 100,
  });
}

// ── Benchmark runner ───────────────────────────────────────────

export async function runBenchmark(
  engineName: string,
  input: unknown,
  iterations = 5,
): Promise<BenchmarkResult> {
  const engine = engineRegistry[engineName];
  if (!engine) throw new Error(`Unknown engine: ${engineName}`);

  const durations: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    engine(input);
    durations.push(performance.now() - start);
  }

  const sorted = [...durations].sort((a, b) => a - b);
  const p50 = sorted[Math.floor(sorted.length * 0.5)]!;
  const p95 = sorted[Math.floor(sorted.length * 0.95)]!;
  const p99 = sorted[Math.floor(sorted.length * 0.99)]!;
  const avg = durations.reduce((s, d) => s + d, 0) / durations.length;

  const before = process.memoryUsage().heapUsed;

  return benchmarkResultSchema.parse({
    engine: engineName,
    durationMs: Math.round(avg * 100) / 100,
    memoryMb: Math.round(((process.memoryUsage().heapUsed - before) / 1024 / 1024) * 100) / 100,
    tokenCount: null,
    iterations,
    p50Ms: Math.round(p50 * 100) / 100,
    p95Ms: Math.round(p95 * 100) / 100,
    p99Ms: Math.round(p99 * 100) / 100,
  });
}
