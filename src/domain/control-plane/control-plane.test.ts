import { describe, expect, it } from "vitest";

import { renderPromptProgram } from "../prompt-renderer";
import { compileCanonicalContext } from "../context-compiler";
import { compileTaskCard } from "../task-card";
import { implementationReadySpecificationFixture } from "../governance";
import { approvedImplementationSlice } from "../planning";
import { evaluatePromptProgram, certifyPromptProgram } from "../evaluation";
import {
  issueExecutionPassport,
  verifyPassportValidity,
  checkPassportScope,
  revokePassport,
  type ExecutionPassport,
  PassportIssuanceError,
  PassportRevocationError,
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
  id: "agent_profile_codex",
  name: "Codex",
  capabilities: ["patch_edits", "shell_validation", "artifact_reports"],
  maxTokens: 20000,
  supportedPromptStyles: ["agent_optimized"],
  supportsArtifacts: true,
} as unknown as Parameters<typeof issueExecutionPassport>[2];

const validProgram = renderPromptProgram({ taskCard, compiledContext, agentProfile });
const certification = certifyPromptProgram(evaluatePromptProgram(validProgram));

describe("Control Plane — Execution Passport", () => {
  it("issues a valid passport for a CERTIFIED prompt program", () => {
    const passport = issueExecutionPassport(certification, taskCard, agentProfile);

    expect(passport.passportId).toMatch(/^cp_passport_[a-f0-9]{16}$/);
    expect(passport.programId).toBe(validProgram.programId);
    expect(passport.certificationId).toBe(certification.certificationId);
    expect(passport.issuedAt).toBeDefined();
    expect(passport.signature).toBeDefined();
    expect(passport.status).toBe("ACTIVE");
    expect(passport.scope.writableFiles).toEqual(taskCard.fileBoundaries.writableFiles);
    expect(passport.scope.forbiddenFiles).toEqual(taskCard.fileBoundaries.protectedFiles);
  });

  it("throws PassportIssuanceError for a REJECTED prompt program", () => {
    const rejectedCert = certifyPromptProgram(
      evaluatePromptProgram({ ...validProgram, renderedPrompt: "" }),
    );

    expect(rejectedCert.status).toBe("REJECTED");
    expect(() => issueExecutionPassport(rejectedCert, taskCard, agentProfile)).toThrow(PassportIssuanceError);
  });

  it("produces a valid ExecutionPassport schema", () => {
    const passport = issueExecutionPassport(certification, taskCard, agentProfile);
    expect(() => executionPassportSchema.parse(passport)).not.toThrow();
  });

  it("verifies passport signature integrity", () => {
    const passport = issueExecutionPassport(certification, taskCard, agentProfile);
    const result = verifyPassportValidity(passport);
    expect(result.valid).toBe(true);
  });

  it("detects tampered passport signature", () => {
    const passport = issueExecutionPassport(certification, taskCard, agentProfile);
    const result = verifyPassportValidity(passport);
    expect(result.valid).toBe(true);

    // Tamper with the passport
    const tampered = {
      ...passport,
      programId: "prompt_program_tampered_000000000000",
    };
    const tamperResult = verifyPassportValidity(tampered as unknown as ExecutionPassport);
    expect(tamperResult.valid).toBe(false);
    expect(tamperResult.reason).toContain("tampered");
  });

  it("produces deterministic passports for the same inputs", () => {
    const fixedTime = "2026-07-23T00:00:00.000Z";
    const first = issueExecutionPassport(certification, taskCard, agentProfile, { issuedAt: fixedTime });
    const second = issueExecutionPassport(certification, taskCard, agentProfile, { issuedAt: fixedTime });
    expect(first.passportId).toBe(second.passportId);
    expect(first.signature).toBe(second.signature);
  });

  it("checks passport scope — writable files are allowed", () => {
    const passport = issueExecutionPassport(certification, taskCard, agentProfile);
    const result = checkPassportScope(passport, taskCard.fileBoundaries.writableFiles[0]!);
    expect(result.allowed).toBe(true);
  });

  it("checks passport scope — forbidden files are disallowed", () => {
    const passport = issueExecutionPassport(certification, taskCard, agentProfile);
    const result = checkPassportScope(passport, taskCard.fileBoundaries.protectedFiles[0]!);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("forbidden");
  });

  it("revokes an active passport", () => {
    const passport = issueExecutionPassport(certification, taskCard, agentProfile);
    const revoked = revokePassport(passport);
    expect(revoked.status).toBe("REVOKED");
  });

  it("throws on double revocation", () => {
    const passport = issueExecutionPassport(certification, taskCard, agentProfile);
    const revoked = revokePassport(passport);
    expect(() => revokePassport(revoked)).toThrow(PassportRevocationError);
  });

  it("expired passport fails verification", () => {
    const pastTime = new Date(Date.now() - 3600_000).toISOString();
    const passport = issueExecutionPassport(certification, taskCard, agentProfile, {
      issuedAt: pastTime,
      ttlMs: 1,
    });
    const result = verifyPassportValidity(passport);
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/expired/i);
  });
});
