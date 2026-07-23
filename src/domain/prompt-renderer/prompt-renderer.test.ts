import { describe, expect, it } from "vitest";

import { compileCanonicalContext } from "../context-compiler";
import { implementationReadySpecificationFixture } from "../governance";
import { compileTaskCard } from "../task-card";
import { approvedImplementationSlice } from "../planning";
import { renderPromptProgram, serializePromptProgram } from ".";

const taskCard = compileTaskCard({ slice: approvedImplementationSlice }).taskCard!;
const compiledContext = compileCanonicalContext({
  taskCard,
  specifications: [implementationReadySpecificationFixture.specification],
  constitutionRules: implementationReadySpecificationFixture.constitutionRules.map(
    (record) => record.rule,
  ),
});
const agentProfile = {
  id: "agent_profile_codex",
  name: "Codex",
  capabilities: ["patch_edits", "shell_validation", "artifact_reports"],
  maxTokens: 20000,
  supportedPromptStyles: ["agent_optimized" as const],
  supportsArtifacts: true,
};

describe("Prompt Program Renderer", () => {
  it("renders a valid immutable Prompt Program", () => {
    const program = renderPromptProgram({ taskCard, compiledContext, agentProfile });
    expect(program.immutable).toBe(true);
    expect(program.targetCompatibility).toBe("compatible");
    expect(program.renderedPrompt).toContain(taskCard.goal);
    expect(program.renderedPrompt).toContain("Canonical Context");
    expect(program.normalizedMeaningFingerprint).toBe(taskCard.fingerprint);
    expect(program.compiledContextFingerprint).toBe(compiledContext.fingerprint);
  });

  it("does not mutate Task Card meaning", () => {
    const before = structuredClone(taskCard);
    renderPromptProgram({ taskCard, compiledContext, agentProfile });
    expect(taskCard).toEqual(before);
  });

  it("serializes deterministically", () => {
    const first = renderPromptProgram({ taskCard, compiledContext, agentProfile });
    const second = renderPromptProgram({
      taskCard: structuredClone(taskCard),
      compiledContext: structuredClone(compiledContext),
      agentProfile: structuredClone(agentProfile),
    });
    expect(first).toEqual(second);
    expect(serializePromptProgram(first)).toBe(serializePromptProgram(second));
  });

  it("blocks target compatibility when rendered prompt exceeds agent context", () => {
    const program = renderPromptProgram({
      taskCard,
      compiledContext,
      agentProfile: { ...agentProfile, maxTokens: 10 },
    });
    expect(program.targetCompatibility).toBe("blocked_by_context_window");
  });

  it("rejects unsupported renderer style", () => {
    expect(() =>
      renderPromptProgram({
        taskCard,
        compiledContext,
        agentProfile,
        promptStyle: "plain_english",
      }),
    ).toThrow(/Target agent does not support/);
  });
});
