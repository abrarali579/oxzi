import type { BaselineEntry } from "../src/lib/evaluation/index";

// OXZI Performance Baseline
// These thresholds represent acceptable performance for each benchmark.
// Values are in milliseconds (duration) and bytes (memory).
// Adjust as hardware changes — regenerate by running the full evaluation suite.

const baseline: BaselineEntry[] = [
  // Discovery engine — small project
  { name: "discovery:small", maxDurationMs: 100, maxMemoryBytes: 10_485_760 },
  // Discovery engine — medium project
  { name: "discovery:medium", maxDurationMs: 500, maxMemoryBytes: 52_428_800 },
  // Extraction engine — parsing
  { name: "extraction:parse", maxDurationMs: 200, maxMemoryBytes: 20_971_520 },
  // Canonical context compilation
  { name: "context:compile", maxDurationMs: 100, maxMemoryBytes: 10_485_760 },
  // Prompt rendering
  { name: "prompt:render", maxDurationMs: 50, maxMemoryBytes: 5_242_880 },
  // Task Card compilation
  { name: "taskcard:compile", maxDurationMs: 100, maxMemoryBytes: 10_485_760 },
  // Zod serialization (large object)
  { name: "serialize:large", maxDurationMs: 100, maxMemoryBytes: 10_485_760 },
  // JSON serialization (stable JSON, 1000-key object)
  { name: "serialize:stable-json", maxDurationMs: 50, maxMemoryBytes: 5_242_880 },
];

export default baseline;
