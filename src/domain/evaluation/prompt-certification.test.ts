import { describe, expect, it } from "vitest";

import { renderPromptProgram } from "../prompt-renderer";
import { compileCanonicalContext } from "../context-compiler";
import { compileTaskCard } from "../task-card";
import { implementationReadySpecificationFixture } from "../governance";
import { approvedImplementationSlice } from "../planning";
import { evaluatePromptProgram, certifyPromptProgram } from "./runtime";

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

const validProgram = renderPromptProgram({ taskCard, compiledContext, agentProfile });

const invalidOutputContractProgram = {
  ...validProgram,
  outputContract: "",
};

const emptyPromptProgram = {
  ...validProgram,
  renderedPrompt: "",
};

describe("Deterministic Prompt Evaluation and Certification", () => {
  it("rejects a prompt program missing a valid output contract", () => {
    const report = evaluatePromptProgram(invalidOutputContractProgram);
    expect(report.totalFailed).toBeGreaterThan(0);
    expect(
      report.assertions.some(
        (assertion) => assertion.ruleId === "assertion_output_contract_presence",
      ),
    ).toBe(true);
    const certification = certifyPromptProgram(report);
    expect(certification.status).toBe("REJECTED");
  });

  it("certifies a prompt program that passes all deterministic assertions", () => {
    const report = evaluatePromptProgram(validProgram);
    expect(report.totalFailed).toBe(0);
    expect(report.assertions.every((assertion) => assertion.passed)).toBe(true);
    const certification = certifyPromptProgram(report);
    expect(certification.status).toBe("CERTIFIED");
    expect(certification.programId).toBe(validProgram.programId);
  });

  it("handles empty prompt bodies by failing prompt presence and structure assertions", () => {
    const report = evaluatePromptProgram(emptyPromptProgram);
    expect(
      report.assertions.some(
        (assertion) =>
          assertion.ruleId === "assertion_rendered_prompt_presence" && !assertion.passed,
      ),
    ).toBe(true);
    expect(
      report.assertions.some(
        (assertion) => assertion.ruleId === "assertion_prompt_structure" && !assertion.passed,
      ),
    ).toBe(true);
    const certification = certifyPromptProgram(report);
    expect(certification.status).toBe("REJECTED");
  });

  it("generates deterministic certification IDs", () => {
    const report = evaluatePromptProgram(validProgram);
    const certification = certifyPromptProgram(report);
    expect(certification.certificationId).toMatch(/^prompt_cert_[a-f0-9]{16}$/);
  });
});
