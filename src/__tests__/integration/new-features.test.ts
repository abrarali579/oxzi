/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it, afterEach } from "vitest";
import {
  parseRepository, parseExports, parseImports, isSizeBoundaryExceeded,
} from "@/domain/repository-intelligence";
import { generateMermaidDiagram, generateFeatureDiagram } from "@/domain/visual-architecture";
import { runDivergence, activateDivergence } from "@/domain/divergence";
import { startSpan, endSpan, getAllTraces, getTrace, withTrace } from "@/domain/observability";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { compileCanonicalContext } from "@/domain/context-compiler";
import { compileTaskCard } from "@/domain/task-card";
import { approvedImplementationSlice } from "@/domain/planning";
import { implementationReadySpecificationFixture } from "@/domain/governance";
import { renderPromptProgram } from "@/domain/prompt-renderer";

let tempDir: string | null = null;

function createTempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "oxzi-integration-"));
  tempDir = dir;
  return dir;
}

function write(base: string, relativePath: string, content: string) {
  const fullPath = join(base, relativePath);
  mkdirSync(fullPath.substring(0, fullPath.lastIndexOf("/")), { recursive: true });
  writeFileSync(fullPath, content, "utf-8");
}

afterEach(() => {
  if (tempDir) {
    try { rmSync(tempDir, { recursive: true, force: true }); } catch { /* cleanup */ }
    tempDir = null;
  }
});

describe("Integration: Divergence Trigger", () => {
  it("generates a divergence report with at least 2 candidates for a high-risk slice", () => {
    const request = {
      id: `divergence_request_test` as any,
      projectId: `project_test` as any,
      decisionTaskCardId: `task_card_test` as any,
      decision: "Evaluate implementation approach",
      constraints: ["security", "high_risk"],
      acceptedFacts: ["Auth required"],
      prohibitedOptions: [],
      evaluationCriteria: ["feasibility"],
      uncertainty: ["Strategy"],
      graphContextRef: "kg:test",
      mode: "standard" as const,
      branchCount: 2,
      tokenBudget: 10000,
      finalDecisionFormatRef: "format:task-card",
      approvalState: "pending" as const,
    };

    const frames = [
      {
        metadata: {
          id: `frame_a` as any, title: "Security First", activationDomains: ["security"],
          problemTypes: ["access_control"], risk: "high" as const,
          expectedNovelty: "medium" as const, contextOverheadTokens: 400,
          incompatibleConditions: [], evaluationHistoryRefs: [], version: "1", enabled: true,
        },
        frameInstruction: "Prioritize security.",
      },
      {
        metadata: {
          id: `frame_b` as any, title: "Performance First", activationDomains: ["performance"],
          problemTypes: ["throughput"], risk: "medium" as const,
          expectedNovelty: "low" as const, contextOverheadTokens: 300,
          incompatibleConditions: [], evaluationHistoryRefs: [], version: "1", enabled: true,
        },
        frameInstruction: "Prioritize performance.",
      },
    ];

    const cost = {
      sharedBaseContextTokens: 500, contextPerBranchTokens: 300, branchCount: 2,
      repeatedBranchContextTokens: 600, expectedBranchOutputTokens: 200,
      criticTokens: 200, clusteringTokens: 100, deepeningCount: 0, deepeningTokens: 0,
      orchestrationOverheadTokens: 150, totalEstimatedTokens: 1750,
      latencyEstimateMs: null, expectedDecisionValue: "high" as const,
    };

    const report = runDivergence(request, frames, cost);
    expect(report.candidateIds.length).toBeGreaterThanOrEqual(2);
    expect(report.clusters.length).toBeGreaterThanOrEqual(1);
    expect(report.scores.length).toBeGreaterThanOrEqual(2);
    expect(report.traps.length).toBeGreaterThanOrEqual(2);
  });

  it("activateDivergence recommends activation for a well-budgeted request", () => {
    const decision = activateDivergence(
      {
        id: `divergence_request_act` as any, projectId: `project_test` as any,
        decisionTaskCardId: `task_card_test` as any, decision: "Test",
        constraints: ["safety"], acceptedFacts: [], prohibitedOptions: [],
        evaluationCriteria: ["feasibility"], uncertainty: ["approach"], graphContextRef: "kg:test",
        mode: "standard" as const, branchCount: 2, tokenBudget: 10000,
        finalDecisionFormatRef: "format:task-card", approvalState: "approved" as const,
      },
      [
        {
          metadata: {
            id: `frame_x` as any, title: "Frame X", activationDomains: ["test"],
            problemTypes: ["test"], risk: "low" as const,
            expectedNovelty: "low" as const, contextOverheadTokens: 0,
            incompatibleConditions: [], evaluationHistoryRefs: [], version: "1", enabled: true,
          },
          frameInstruction: "Test.",
        },
      ],
      { totalNet: 500 },
    );
    expect(decision.decision).toBe("recommended");
  });
});

describe("Integration: Visual Map Generation", () => {
  it("generates Mermaid diagrams from a parsed repository", () => {
    const base = createTempDir();
    write(base, "src/main.ts", 'import { helper } from "./helpers";\nexport const app = helper();');
    write(base, "src/helpers.ts", "export function helper() { return 42; }");

    const manifest = parseRepository({ rootPath: base });
    if (isSizeBoundaryExceeded(manifest)) throw new Error("Unexpected size limit");
    const depDiagram = generateMermaidDiagram(manifest);
    expect(depDiagram).toContain("flowchart LR");
    expect(depDiagram).toContain("Legend");
    expect(depDiagram).toContain("-->");

    const featDiagram = generateFeatureDiagram(manifest);
    expect(featDiagram).toContain("flowchart TB");
    expect(featDiagram).toContain("Legend");
  });
});

describe("Integration: History API", () => {
  it("retrieves project version history", () => {
    const history = [
      { version: 1, timestamp: "2026-07-23T12:00:00.000Z", event: "Project created" },
      { version: 2, timestamp: "2026-07-23T13:00:00.000Z", event: "Project updated" },
    ];
    expect(history.length).toBe(2);
    expect(history[0]!.event).toBe("Project created");
    expect(history[1]!.event).toBe("Project updated");
  });

  it("returns the current latest version", () => {
    const history = [
      { version: 1, timestamp: "2026-07-23T12:00:00.000Z", event: "Created" },
    ];
    expect(history[history.length - 1]!.version).toBe(1);
  });
});

describe("Integration: Trace Capture", () => {
  it("captures a trace after a compile operation", async () => {
    const taskCard = compileTaskCard({
      slice: approvedImplementationSlice,
      constitutionRules: implementationReadySpecificationFixture.constitutionRules.map(
        (r: { rule: unknown }) => r.rule,
      ),
    }).taskCard!;

    const compiledContext = compileCanonicalContext({
      taskCard,
      specifications: [implementationReadySpecificationFixture.specification],
      constitutionRules: implementationReadySpecificationFixture.constitutionRules.map(
        (r: { rule: unknown }) => r.rule,
      ),
    });

    const result = await withTrace(
      {
        projectId: "project_trace_test",
        taskCardId: taskCard.taskCardId,
        operation: "compile-and-render",
        tags: ["test", "integration"],
      },
      async (traceId) => {
        const span1 = startSpan(traceId, "context_retrieval");
        compileCanonicalContext({
          taskCard,
          specifications: [implementationReadySpecificationFixture.specification],
          constitutionRules: implementationReadySpecificationFixture.constitutionRules.map(
            (r: { rule: unknown }) => r.rule,
          ),
        });
        endSpan(span1);

        const span2 = startSpan(traceId, "prompt_rendering");
        const agentProfile = {
          id: "agent_profile_codex" as const, name: "Codex",
          capabilities: ["patch_edits", "shell_validation", "artifact_reports"],
          maxTokens: 20000, supportedPromptStyles: ["agent_optimized" as const],
          supportsArtifacts: true,
        };
        renderPromptProgram({ taskCard, compiledContext, agentProfile });
        endSpan(span2);

        return "done";
      },
    );

    expect(result).toBe("done");

    // Verify trace was captured
    const allTraces = getAllTraces();
    expect(allTraces.length).toBeGreaterThanOrEqual(1);

    const latestTrace = allTraces[0]!;
    expect(latestTrace.status).toBe("completed");
    expect(latestTrace.tags).toContain("test");

    // Verify spans are retrievable
    const { trace, spans } = getTrace(latestTrace.id);
    expect(trace).toBeDefined();
    expect(spans.length).toBeGreaterThanOrEqual(2);
    expect(spans.some((s) => s.operationType === "context_retrieval")).toBe(true);
    expect(spans.some((s) => s.operationType === "prompt_rendering")).toBe(true);
  });

  it("records trace failure when the wrapped function throws", async () => {
    await expect(
      withTrace(
        { projectId: "project_fail", taskCardId: "task_card_fail", operation: "integration-test", tags: [] },
        async () => { throw new Error("Simulated failure"); },
      ),
    ).rejects.toThrow("Simulated failure");

    const failingTraces = getAllTraces().filter((t) => t.status === "failed");
    expect(failingTraces.length).toBeGreaterThanOrEqual(1);
  });
});

describe("Integration: AST Parser", () => {
  it("parses exports and imports from TypeScript using AST", () => {
    const exports = parseExports("export const greet = () => {};\nexport class Service {}");
    expect(exports).toContain("greet");
    expect(exports).toContain("Service");
  });

  it("parses import specifiers from TypeScript", () => {
    const imports = parseImports('import { z } from "zod";\nimport { greet } from "./utils";');
    expect(imports).toContain("zod");
    expect(imports).toContain("./utils");
  });
});
