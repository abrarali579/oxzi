import { describe, expect, it } from "vitest";
import { stableJson, type JsonValue } from "@/domain/knowledge-graph";
import { compileCanonicalContext } from "@/domain/context-compiler";
import { compileTaskCard } from "@/domain/task-card";
import { renderPromptProgram, serializePromptProgram } from "@/domain/prompt-renderer";
import { implementationReadySpecificationFixture } from "@/domain/governance";
import { approvedImplementationSlice } from "@/domain/planning";
import { evaluatePromptProgram, certifyPromptProgram } from "@/domain/evaluation";
import { issueExecutionPassport, verifyPassportValidity } from "@/domain/control-plane";
import { createZipBuffer } from "@/lib/utils/zip";

// ── Fixtures ────────────────────────────────────────────────────

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
  id: "agent_profile_codex",
  name: "Codex",
  capabilities: ["patch_edits", "shell_validation", "artifact_reports"],
  maxTokens: 20000,
  supportedPromptStyles: ["agent_optimized"],
  supportsArtifacts: true,
} as unknown as Parameters<typeof issueExecutionPassport>[2];

describe("Integration: Full Pipeline Flow", () => {
  it("completes the full deterministic pipeline end-to-end", () => {
    // Step 1: Render Prompt Program
    const program = renderPromptProgram({ taskCard, compiledContext, agentProfile });
    expect(program.immutable).toBe(true);
    expect(program.targetCompatibility).toBe("compatible");

    // Step 2: Evaluate Prompt Program deterministically
    const evaluationReport = evaluatePromptProgram(program);
    expect(evaluationReport.totalFailed).toBe(0);
    expect(evaluationReport.assertions.length).toBeGreaterThanOrEqual(6);

    // Step 3: Certify the Prompt Program
    const certification = certifyPromptProgram(evaluationReport);
    expect(certification.status).toBe("CERTIFIED");

    // Step 4: Issue Execution Passport
    const passport = issueExecutionPassport(certification, taskCard, agentProfile);
    expect(passport.passportId).toMatch(/^cp_passport_/);
    expect(passport.programId).toBe(program.programId);

    // Step 5: Verify passport integrity
    const result = verifyPassportValidity(passport);
    expect(result.valid).toBe(true);

    // Step 6: Serialize round-trip stability
    const serialized = serializePromptProgram(program);
    expect(serialized).toContain(program.programId);
  });

  it("generates a valid ZIP from six-file output", async () => {
    const files = {
      "01-overview.md": "# Project Overview\n\nTest project.",
      "02-architecture.md": "# Architecture\n\nFrontend: React\nBackend: Node.js",
      "03-ui.md": "# UI\n\nMinimal dashboard.",
      "04-standards.md": "# Standards\n\nESLint + Prettier.",
      "05-workflow.md": "# Workflow\n\nCI/CD pipeline.",
      "06-progress.md": "# Progress\n\n✅ Complete.",
    };

    const entries = Object.entries(files).map(([name, content]) => ({
      path: name,
      content,
    }));

    const buffer = await createZipBuffer(entries);
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(100);
    expect(buffer[0]).toBe(0x50); // ZIP magic byte 'P'
    expect(buffer[1]).toBe(0x4b); // ZIP magic byte 'K'
  });

  it("maintains deterministic serialization through context compilation", () => {
    const first = compileCanonicalContext({
      taskCard,
      specifications: [implementationReadySpecificationFixture.specification],
      constitutionRules: implementationReadySpecificationFixture.constitutionRules.map(
        (record: { rule: unknown }) => record.rule,
      ),
    });

    const second = compileCanonicalContext({
      taskCard: structuredClone(taskCard),
      specifications: [structuredClone(implementationReadySpecificationFixture.specification)],
      constitutionRules: implementationReadySpecificationFixture.constitutionRules.map(
        (record: { rule: unknown }) => structuredClone(record.rule),
      ),
    });

    expect(stableJson(first as unknown as JsonValue)).toBe(
      stableJson(second as unknown as JsonValue),
    );
  });

  it("rejects an invalid (REJECTED) certification from the passport gate", () => {
    const emptyProgram = {
      ...(renderPromptProgram({ taskCard, compiledContext, agentProfile }) as Record<
        string,
        unknown
      >),
      renderedPrompt: "",
    };

    const evaluationReport = evaluatePromptProgram(emptyProgram);
    const certification = certifyPromptProgram(evaluationReport);
    expect(certification.status).toBe("REJECTED");

    expect(() => issueExecutionPassport(certification, taskCard, agentProfile)).toThrow();
  });
});
