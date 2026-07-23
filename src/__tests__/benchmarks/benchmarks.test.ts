import { describe, expect, it } from "vitest";
import { contentFingerprint, stableJson, type JsonValue } from "@/domain/knowledge-graph";
import { compileCanonicalContext } from "@/domain/context-compiler";
import { compileTaskCard } from "@/domain/task-card";
import { renderPromptProgram } from "@/domain/prompt-renderer";
import { implementationReadySpecificationFixture } from "@/domain/governance";
import { approvedImplementationSlice } from "@/domain/planning";
import {
  runSingleBenchmark,
  runEvaluation,
  compareToBaseline,
  type BaselineEntry,
} from "@/lib/evaluation";

const taskCard = compileTaskCard({
  slice: approvedImplementationSlice,
  constitutionRules: implementationReadySpecificationFixture.constitutionRules.map(
    (record: { rule: unknown }) => record.rule,
  ),
}).taskCard!;

const compiledContext = compileCanonicalContext({
  taskCard,
  specifications: [implementationReadySpecificationFixture.specification],
  constitutionRules: implementationReadySpecificationFixture.constitutionRules.map(
    (record: { rule: unknown }) => record.rule,
  ),
});

const agentProfile = {
  id: "agent_profile_codex" as const,
  name: "Codex",
  capabilities: ["patch_edits", "shell_validation", "artifact_reports"],
  maxTokens: 20000,
  supportedPromptStyles: ["agent_optimized" as const],
  supportsArtifacts: true,
};

// Generate a large object for serialization benchmarks
function generateLargeObject(depth = 4, breadth = 4): Record<string, unknown> {
  if (depth <= 0) return { value: "leaf" };
  const obj: Record<string, unknown> = {};
  for (let i = 0; i < breadth; i++) {
    obj[`key_${i}`] = generateLargeObject(depth - 1, breadth);
  }
  return obj;
}

const largeObject = generateLargeObject(4, 4);

const THRESHOLDS: BaselineEntry[] = [
  { name: "discovery:simple", maxDurationMs: 200, maxMemoryBytes: 20_971_520 },
  { name: "context:compile", maxDurationMs: 100, maxMemoryBytes: 10_485_760 },
  { name: "prompt:render", maxDurationMs: 50, maxMemoryBytes: 5_242_880 },
  { name: "taskcard:compile", maxDurationMs: 100, maxMemoryBytes: 10_485_760 },
  { name: "serialize:stable-json", maxDurationMs: 50, maxMemoryBytes: 5_242_880 },
];

describe("Performance Benchmarks", () => {
  it("context compilation completes within threshold", async () => {
    const metric = await runSingleBenchmark("context:compile", () =>
      compileCanonicalContext({
        taskCard,
        specifications: [implementationReadySpecificationFixture.specification],
        constitutionRules: implementationReadySpecificationFixture.constitutionRules.map(
          (record: { rule: unknown }) => record.rule,
        ),
      }),
    );
    expect(metric.passed).toBe(true);
    const threshold = THRESHOLDS.find((t) => t.name === "context:compile")!;
    expect(metric.durationMs).toBeLessThanOrEqual(threshold.maxDurationMs);
  });

  it("prompt rendering completes within threshold", async () => {
    const metric = await runSingleBenchmark("prompt:render", () =>
      renderPromptProgram({ taskCard, compiledContext, agentProfile }),
    );
    expect(metric.passed).toBe(true);
    const threshold = THRESHOLDS.find((t) => t.name === "prompt:render")!;
    expect(metric.durationMs).toBeLessThanOrEqual(threshold.maxDurationMs);
  });

  it("Task Card compilation completes within threshold", async () => {
    const metric = await runSingleBenchmark("taskcard:compile", () =>
      compileTaskCard({
        slice: approvedImplementationSlice,
        constitutionRules: implementationReadySpecificationFixture.constitutionRules.map(
          (record: { rule: unknown }) => record.rule,
        ),
      }),
    );
    expect(metric.passed).toBe(true);
    const threshold = THRESHOLDS.find((t) => t.name === "taskcard:compile")!;
    expect(metric.durationMs).toBeLessThanOrEqual(threshold.maxDurationMs);
  });

  it("stable JSON serialization completes within threshold", async () => {
    const metric = await runSingleBenchmark("serialize:stable-json", () =>
      stableJson(largeObject as unknown as JsonValue),
    );
    expect(metric.passed).toBe(true);
    const threshold = THRESHOLDS.find((t) => t.name === "serialize:stable-json")!;
    expect(metric.durationMs).toBeLessThanOrEqual(threshold.maxDurationMs);
  });

  it("content fingerprint generation handles large objects", async () => {
    const metric = await runSingleBenchmark("fingerprint:large", () =>
      contentFingerprint(largeObject as unknown as JsonValue),
    );
    expect(metric.passed).toBe(true);
    expect(metric.durationMs).toBeLessThanOrEqual(100);
  });

  it("full evaluation run produces consistent results", async () => {
    const result = await runEvaluation([
      {
        name: "context:compile",
        fn: () =>
          compileCanonicalContext({
            taskCard,
            specifications: [implementationReadySpecificationFixture.specification],
            constitutionRules: implementationReadySpecificationFixture.constitutionRules.map(
              (record: { rule: unknown }) => record.rule,
            ),
          }),
      },
      {
        name: "prompt:render",
        fn: () => renderPromptProgram({ taskCard, compiledContext, agentProfile }),
      },
      {
        name: "taskcard:compile",
        fn: () =>
          compileTaskCard({
            slice: approvedImplementationSlice,
            constitutionRules: implementationReadySpecificationFixture.constitutionRules.map(
              (record: { rule: unknown }) => record.rule,
            ),
          }),
      },
    ]);

    expect(result.passed).toBe(true);
    expect(result.metrics).toHaveLength(3);
    expect(result.totalDurationMs).toBeGreaterThan(0);
    // Verify fingerprint stability
    const second = await runEvaluation([
      {
        name: "serialize:stable-json",
        fn: () => stableJson(largeObject as unknown as JsonValue),
      },
    ]);
    expect(second.fingerprint).toBeDefined();
  });

  it("compares results against baseline thresholds", async () => {
    const result = await runEvaluation([
      {
        name: "context:compile",
        fn: () =>
          compileCanonicalContext({
            taskCard,
            specifications: [implementationReadySpecificationFixture.specification],
            constitutionRules: implementationReadySpecificationFixture.constitutionRules.map(
              (record: { rule: unknown }) => record.rule,
            ),
          }),
      },
      {
        name: "prompt:render",
        fn: () => renderPromptProgram({ taskCard, compiledContext, agentProfile }),
      },
    ]);

    const comparison = compareToBaseline(result, THRESHOLDS);
    expect(comparison.passed).toBe(true);
    expect(comparison.failures).toEqual([]);
  });
});
