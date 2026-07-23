import { describe, expect, it } from "vitest";

import { renderPromptProgram, renderedPromptProgramIdSchema } from "../prompt-renderer";
import { compileCanonicalContext } from "../context-compiler";
import { compileTaskCard } from "../task-card";
import { implementationReadySpecificationFixture } from "../governance";
import { approvedImplementationSlice } from "../planning";
import { evaluatePromptProgram, certifyPromptProgram } from "../evaluation";
import { issueExecutionPassport } from "../control-plane";
import { contentFingerprint, type JsonValue } from "../knowledge-graph";
import {
  dispatchPromptProgram,
  DeliveryBlockedError,
  HumanApprovalRecord,
  deliveryTicketSchema,
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
const passport = issueExecutionPassport(certification, taskCard, agentProfile);

function makeHumanRecord(overrides: Record<string, unknown> = {}): HumanApprovalRecord {
  const base = {
    approvedBy: "user:admin",
    approvedAt: new Date().toISOString(),
    method: "human" as const,
    role: "admin" as const,
    organizationId: "org_test",
  };
  const merged = { ...base, ...overrides };
  // Only auto-compute signature if not explicitly overridden
  if (!overrides.signature) {
    const sig = contentFingerprint({
      approvedBy: merged.approvedBy,
      role: merged.role,
      organizationId: merged.organizationId,
    } as unknown as JsonValue);
    return { ...merged, signature: sig };
  }
  return merged as unknown as ReturnType<typeof makeHumanRecord>;
}

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

  // ── Step 11: Approval gate risk-based tests ────────────────

  it("returns pending_approval for high-risk task without human approval record", () => {
    const ticket = dispatchPromptProgram(passport, "Codex", undefined, undefined, "high");
    expect(ticket.status).toBe("pending_approval");
    expect(ticket.payloadSummary).toContain("high-risk");
  });

  it("blocks high-risk task with insufficient role (member instead of admin)", () => {
    const record = makeHumanRecord({ role: "member" });
    expect(() => dispatchPromptProgram(passport, "Codex", { approved: true }, record, "high")).toThrow(
      DeliveryBlockedError,
    );
  });

  it("blocks high-risk task with forged approval signature", () => {
    const record = makeHumanRecord({ signature: "forged_sig" });
    expect(() => dispatchPromptProgram(passport, "Codex", { approved: true }, record, "high")).toThrow(
      DeliveryBlockedError,
    );
  });

  it("dispatches high-risk task with valid admin approval record", () => {
    const record = makeHumanRecord();
    const ticket = dispatchPromptProgram(passport, "Codex", { approved: true, approvedBy: "user:admin", method: "human" }, record, "high");
    expect(ticket.status).toBe("dispatched");
    expect(ticket.approvalState).toBe("APPROVED");
  });

  it("dispatches critical-risk task only with owner role", () => {
    const record = makeHumanRecord({ role: "owner" });
    const ticket = dispatchPromptProgram(passport, "Codex", { approved: true, approvedBy: "user:owner", method: "human" }, record, "critical");
    expect(ticket.status).toBe("dispatched");
  });

  it("blocks critical-risk task with admin role (needs owner)", () => {
    const record = makeHumanRecord({ role: "admin" });
    expect(() => dispatchPromptProgram(passport, "Codex", { approved: true }, record, "critical")).toThrow(
      DeliveryBlockedError,
    );
  });

  it("low-risk task dispatches without explicit human approval record", () => {
    const ticket = dispatchPromptProgram(passport, "Codex", { approved: true, approvedBy: "auto:pipeline" }, undefined, "low");
    expect(ticket.status).toBe("dispatched");
  });
});

