import { describe, expect, it } from "vitest";

import { renderPromptProgram, renderedPromptProgramIdSchema } from "../prompt-renderer";
import { compileCanonicalContext } from "../context-compiler";
import { compileTaskCard } from "../task-card";
import { implementationReadySpecificationFixture } from "../governance";
import { approvedImplementationSlice } from "../planning";
import { evaluatePromptProgram, certifyPromptProgram } from "../evaluation";
import { issueExecutionPassport } from "../control-plane";
import { dispatchPromptProgram, DeliveryBlockedError, deliveryTicketSchema } from ".";

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
const passport = issueExecutionPassport(certification, taskCard, agentProfile);

describe("Agent Delivery — Dispatch Runtime", () => {
  it("generates a valid DeliveryTicket when approved", () => {
    const ticket = dispatchPromptProgram(passport, "Codex", {
      approved: true,
      approvedBy: "user:admin",
      method: "human",
    });

    expect(ticket.approvalState).toBe("APPROVED");
    expect(ticket.status).toBe("dispatched");
    expect(ticket.targetAgent).toBe("Codex");
    expect(ticket.passportId).toBe(passport.passportId);
    expect(ticket.payloadSummary).toContain(validProgram.programId);
    expect(ticket.dispatchedAt).not.toBeNull();
  });

  it("blocks delivery for unapproved passports (no approval provided)", () => {
    const ticket = dispatchPromptProgram(passport, "Codex");

    expect(ticket.approvalState).toBe("PENDING");
    expect(ticket.status).toBe("pending_approval");
    expect(ticket.dispatchedAt).toBeNull();
  });

  it("throws DeliveryBlockedError when explicitly denied", () => {
    expect(() => dispatchPromptProgram(passport, "Codex", { approved: false })).toThrow(
      DeliveryBlockedError,
    );
  });

  it("rejects tampered passports during dispatch", () => {
    const tampered = {
      ...passport,
      programId: renderedPromptProgramIdSchema.parse("prompt_program_hacked_000000000000"),
    };
    expect(() => dispatchPromptProgram(tampered, "Codex", { approved: true })).toThrow(
      DeliveryBlockedError,
    );
  });

  it("produces a valid DeliveryTicket schema", () => {
    const ticket = dispatchPromptProgram(passport, "Codex", {
      approved: true,
      approvedBy: "user:admin",
      method: "human",
    });
    expect(() => deliveryTicketSchema.parse(ticket)).not.toThrow();
    expect(ticket.fingerprint).toBeDefined();
  });

  it("records system_auto approval when no explicit method is given", () => {
    const ticket = dispatchPromptProgram(passport, "Codex", {
      approved: true,
      approvedBy: "auto:pipeline",
    });
    expect(ticket.approval?.method).toBe("system_auto");
  });
});
