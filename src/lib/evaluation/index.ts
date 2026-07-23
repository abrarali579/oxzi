import { performance } from "node:perf_hooks";
import { contentFingerprint, stableJson, type JsonValue } from "@/domain/knowledge-graph";

// ── Metrics types ───────────────────────────────────────────────

export interface BenchmarkMetric {
  name: string;
  durationMs: number;
  memoryBytes: number;
  tokenEstimate: number;
  passed: boolean;
}

export interface EvaluationResult {
  timestamp: string;
  fingerprint: string;
  metrics: BenchmarkMetric[];
  totalDurationMs: number;
  passed: boolean;
}

// ── Memory measurement ─────────────────────────────────────────

function getMemoryUsage(): number {
  const usage = process.memoryUsage();
  return usage.heapUsed;
}

// ── Core evaluation runner ──────────────────────────────────────

export async function runSingleBenchmark(
  name: string,
  fn: () => unknown,
  tokenCount?: number,
): Promise<BenchmarkMetric> {
  const beforeMem = getMemoryUsage();
  const start = performance.now();

  let passed = true;
  try {
    const result = fn();
    // Await promise if async
    if (result instanceof Promise) await result;
  } catch {
    passed = false;
  }

  const durationMs = performance.now() - start;
  const afterMem = getMemoryUsage();

  return {
    name,
    durationMs: Math.round(durationMs * 100) / 100,
    memoryBytes: Math.max(0, afterMem - beforeMem),
    tokenEstimate: tokenCount ?? 0,
    passed,
  };
}

export async function runEvaluation(
  benchmarks: { name: string; fn: () => unknown; tokenCount?: number }[],
): Promise<EvaluationResult> {
  const metrics: BenchmarkMetric[] = [];

  for (const bench of benchmarks) {
    // Force garbage collection between benchmarks if available
    if (typeof global.gc === "function") {
      global.gc();
    }
    const metric = await runSingleBenchmark(bench.name, bench.fn, bench.tokenCount);
    metrics.push(metric);
  }

  const totalDurationMs = metrics.reduce((sum, m) => sum + m.durationMs, 0);
  const passed = metrics.every((m) => m.passed);

  return {
    timestamp: new Date().toISOString(),
    fingerprint: contentFingerprint({ metrics, totalDurationMs, passed } as unknown as JsonValue),
    metrics,
    totalDurationMs: Math.round(totalDurationMs * 100) / 100,
    passed,
  };
}

// ── Baseline comparison ─────────────────────────────────────────

export interface BaselineEntry {
  name: string;
  maxDurationMs: number;
  maxMemoryBytes: number;
}

export function compareToBaseline(
  result: EvaluationResult,
  baseline: BaselineEntry[],
): { passed: boolean; failures: string[] } {
  const failures: string[] = [];

  for (const metric of result.metrics) {
    const baselineEntry = baseline.find((b) => b.name === metric.name);
    if (!baselineEntry) continue;

    if (metric.durationMs > baselineEntry.maxDurationMs) {
      failures.push(
        `${metric.name}: duration ${metric.durationMs}ms > baseline ${baselineEntry.maxDurationMs}ms`,
      );
    }
    if (metric.memoryBytes > baselineEntry.maxMemoryBytes) {
      failures.push(
        `${metric.name}: memory ${metric.memoryBytes} bytes > baseline ${baselineEntry.maxMemoryBytes} bytes`,
      );
    }
  }

  return { passed: failures.length === 0, failures };
}

// ── Serialization ───────────────────────────────────────────────

export function serializeEvaluationResult(result: EvaluationResult): string {
  return stableJson(result as unknown as JsonValue);
}
