import { describe, expect, it } from "vitest";

import { renderPromptProgram } from "../prompt-renderer";
import { compileCanonicalContext } from "../context-compiler";
import { compileTaskCard } from "../task-card";
import { implementationReadySpecificationFixture } from "../governance";
import { approvedImplementationSlice } from "../planning";
import { evaluatePromptProgram, certifyPromptProgram } from "../evaluation";
import { renderedPromptProgramIdSchema } from "../prompt-renderer";
import {
  issueExecutionPassport,
  verifyPassportValidity,
  PassportIssuanceError,
  executionPassportSchema,
} from ".";

const taskCard = compileTaskCard({
  slice: approvedImplementationSlice,
  constitutionRules: implementationReadySpecificationFixture.constitutionRules.map(
    (record) => record.rule,
  ),
}).taskCard!;
const compiledContext = compileCanonicalContext({
  taskCard,
  specifications: [implementationReadySpecificationFixture.specification],
  constitutionRules: implementationReadySpecificationFixture.constitutionRules.map(
    (record) => record.rule,
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

const validProgram = renderPromptProgram({ taskCard, compiledContext, agentProfile });
const certification = certifyPromptProgram(evaluatePromptProgram(validProgram));

describe("Control Plane — Execution Passport", () => {
  it("issues a valid passport for a CERTIFIED prompt program", () => {
    const passport = issueExecutionPassport(certification);

    expect(passport.passportId).toMatch(/^cp_passport_[a-f0-9]{16}$/);
    expect(passport.programId).toBe(validProgram.programId);
    expect(passport.certificationId).toBe(certification.certificationId);
    expect(passport.issuedAt).toBeDefined();
    expect(passport.signature).toBeDefined();
  });

  it("throws PassportIssuanceError for a REJECTED prompt program", () => {
    const rejectedCert = certifyPromptProgram(
      evaluatePromptProgram({ ...validProgram, renderedPrompt: "" }),
    );

    expect(rejectedCert.status).toBe("REJECTED");
    expect(() => issueExecutionPassport(rejectedCert)).toThrow(PassportIssuanceError);
  });

  it("produces a valid ExecutionPassport schema", () => {
    const passport = issueExecutionPassport(certification);
    expect(() => executionPassportSchema.parse(passport)).not.toThrow();
  });

  it("verifies passport signature integrity", () => {
    const passport = issueExecutionPassport(certification);
    expect(verifyPassportValidity(passport)).toBe(true);
  });

  it("detects tampered passport signature", () => {
    const passport = issueExecutionPassport(certification);
    const tampered = {
      ...passport,
      programId: renderedPromptProgramIdSchema.parse("prompt_program_tampered_000000000000"),
    };
    expect(verifyPassportValidity(tampered)).toBe(false);
  });

  it("produces deterministic passports for the same inputs", () => {
    const fixedTime = "2026-07-23T00:00:00.000Z";
    const first = issueExecutionPassport(certification, { issuedAt: fixedTime });
    const second = issueExecutionPassport(certification, { issuedAt: fixedTime });
    expect(first.passportId).toBe(second.passportId);
    expect(first.signature).toBe(second.signature);
  });
});
