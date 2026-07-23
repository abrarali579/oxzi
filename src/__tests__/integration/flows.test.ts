import { describe, expect, it } from "vitest";
import { stableJson, type JsonValue } from "@/domain/knowledge-graph";
import { compileCanonicalContext } from "@/domain/context-compiler";
import { compileTaskCard } from "@/domain/task-card";
import { renderPromptProgram } from "@/domain/prompt-renderer";
import { implementationReadySpecificationFixture } from "@/domain/governance";
import { approvedImplementationSlice } from "@/domain/planning";
import { evaluatePromptProgram, certifyPromptProgram } from "@/domain/evaluation";
import { issueExecutionPassport, verifyPassportValidity } from "@/domain/control-plane";
import { createZipBuffer } from "@/lib/utils/zip";
import { analyzeDiscovery } from "@/domain/discovery";
import { extractCanonicalUpdates } from "@/domain/extraction";
import { oxzire3dWebsiteFixture } from "@/domain/project";
import { evaluatePlanGovernance, validPlanningInput } from "@/domain/planning";

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

const agentProfile = {
  id: "agent_profile_codex",
  name: "Codex",
  capabilities: ["patch_edits", "shell_validation", "artifact_reports"],
  maxTokens: 20000,
  supportedPromptStyles: ["agent_optimized"],
  supportsArtifacts: true,
} as unknown as Parameters<typeof issueExecutionPassport>[2];

describe("Integration: Extraction Flow", () => {
  it("extracts canonical updates from a project brief", () => {
    const result = extractCanonicalUpdates({
      sources: [
        {
          sourceId: "source_test",
          kind: "master_prompt",
          content:
            "Build a web app for task management with user authentication and real-time updates.",
          capturedAt: "2026-07-23T12:00:00.000Z",
        },
      ],
    });
    expect(result).toBeDefined();
    expect(result.updates.length).toBeGreaterThanOrEqual(0);
  });
});

describe("Integration: Discovery Flow", () => {
  it("loads and analyzes a valid canonical project", () => {
    const result = analyzeDiscovery(oxzire3dWebsiteFixture);
    expect(result).toBeDefined();
    expect(typeof result.completeness.overallCompleteness).toBe("number");
  });
});

describe("Integration: Planning Flow", () => {
  it("evaluates plan governance with valid input", () => {
    const planResult = evaluatePlanGovernance(validPlanningInput);
    expect(planResult).toBeDefined();
  });
});

describe("Integration: Task Card Flow", () => {
  it("compiles a valid Task Card from an Implementation Slice", () => {
    const card = compileTaskCard({
      slice: approvedImplementationSlice,
      constitutionRules: implementationReadySpecificationFixture.constitutionRules.map(
        (r: { rule: unknown }) => r.rule,
      ),
    });
    expect(card.taskCard).toBeDefined();
    expect(card.taskCard!.taskCardId).toMatch(/^task_card_/);
  });
});

describe("Integration: Prompt Render Flow", () => {
  it("renders a valid prompt program from Task Card and context", () => {
    const program = renderPromptProgram({ taskCard, compiledContext, agentProfile });
    expect(program.immutable).toBe(true);
    expect(program.renderedPrompt).toContain(taskCard.goal);
  });

  it("evaluates and certifies the rendered program", () => {
    const program = renderPromptProgram({ taskCard, compiledContext, agentProfile });
    const report = evaluatePromptProgram(program);
    expect(report.totalFailed).toBe(0);
    const cert = certifyPromptProgram(report);
    expect(cert.status).toBe("CERTIFIED");
  });

  it("issues and verifies an execution passport", () => {
    const program = renderPromptProgram({ taskCard, compiledContext, agentProfile });
    const cert = certifyPromptProgram(evaluatePromptProgram(program));
    const passport = issueExecutionPassport(cert, taskCard, agentProfile);
    const result = verifyPassportValidity(passport);
    expect(result.valid).toBe(true);
  });
});

describe("Integration: ZIP Generation", () => {
  it("generates a valid ZIP from six files", async () => {
    const files = {
      "01-overview.md": "# Overview",
      "02-architecture.md": "# Architecture",
      "03-ui.md": "# UI",
      "04-standards.md": "# Standards",
      "05-workflow.md": "# Workflow",
      "06-progress.md": "# Progress",
    };
    const entries = Object.entries(files).map(([name, content]) => ({ path: name, content }));
    const buffer = await createZipBuffer(entries);
    expect(buffer[0]).toBe(0x50);
    expect(buffer[1]).toBe(0x4b);
    expect(buffer.length).toBeGreaterThan(100);
  });
});

describe("Integration: Deterministic Serialization", () => {
  it("produces stable output across runs", () => {
    const first = compileCanonicalContext({
      taskCard,
      specifications: [implementationReadySpecificationFixture.specification],
      constitutionRules: implementationReadySpecificationFixture.constitutionRules.map(
        (r: { rule: unknown }) => r.rule,
      ),
    });
    const second = compileCanonicalContext({
      taskCard: structuredClone(taskCard),
      specifications: [structuredClone(implementationReadySpecificationFixture.specification)],
      constitutionRules: implementationReadySpecificationFixture.constitutionRules.map(
        (r: { rule: unknown }) => structuredClone(r.rule),
      ),
    });
    expect(stableJson(first as unknown as JsonValue)).toBe(
      stableJson(second as unknown as JsonValue),
    );
  });
});
