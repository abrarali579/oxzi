import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  regressionReportSchema,
  type BenchmarkResult,
  type RegressionEntry,
  type RegressionReport,
} from "./schema";

const BASELINE_PATH = join(process.cwd(), "data", "baseline.json");

export interface BaselineEntry {
  engine: string;
  maxDurationMs: number;
  maxMemoryMb: number;
}

export interface Baseline {
  version: string;
  generatedAt: string;
  entries: BaselineEntry[];
}

// ── Load / Save ────────────────────────────────────────────────

export function loadBaseline(): Baseline {
  try {
    if (!existsSync(BASELINE_PATH)) {
      return { version: "0.0.0", generatedAt: new Date().toISOString(), entries: [] };
    }
    return JSON.parse(readFileSync(BASELINE_PATH, "utf-8")) as Baseline;
  } catch {
    return { version: "0.0.0", generatedAt: new Date().toISOString(), entries: [] };
  }
}

export function saveBaseline(baseline: Baseline): void {
  writeFileSync(BASELINE_PATH, JSON.stringify(baseline, null, 2), "utf-8");
}

// ── Comparison ─────────────────────────────────────────────────

export function compareAgainstBaseline(
  currentResults: BenchmarkResult[],
  baseline: Baseline,
  thresholdPercent = 20,
): RegressionReport {
  const regressions: RegressionEntry[] = [];

  for (const result of currentResults) {
    const baselineEntry = baseline.entries.find((e) => e.engine === result.engine);
    if (!baselineEntry) continue;

    if (result.durationMs > baselineEntry.maxDurationMs) {
      regressions.push({
        engine: result.engine,
        metric: "durationMs",
        baselineValue: baselineEntry.maxDurationMs,
        currentValue: result.durationMs,
        thresholdPercent,
      });
    }
    if (result.memoryMb > baselineEntry.maxMemoryMb) {
      regressions.push({
        engine: result.engine,
        metric: "memoryMb",
        baselineValue: baselineEntry.maxMemoryMb,
        currentValue: result.memoryMb,
        thresholdPercent,
      });
    }
  }

  return regressionReportSchema.parse({
    baselineVersion: baseline.version,
    currentVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    regressions,
    totalEngines: currentResults.length,
    regressedEngines: new Set(regressions.map((r) => r.engine)).size,
  });
}

// ── Update baseline from current results ───────────────────────

export function updateBaseline(currentResults: BenchmarkResult[], version: string): Baseline {
  const entries: BaselineEntry[] = currentResults.map((r) => ({
    engine: r.engine,
    // Allow 20% headroom above measured value
    maxDurationMs: Math.round(r.durationMs * 1.2 * 100) / 100,
    maxMemoryMb: Math.round(r.memoryMb * 1.2 * 100) / 100,
  }));

  const baseline: Baseline = {
    version,
    generatedAt: new Date().toISOString(),
    entries,
  };

  saveBaseline(baseline);
  return baseline;
}
