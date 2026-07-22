import { describe, expect, it } from "vitest";

import { contentFingerprint } from "../knowledge-graph";
import {
  aiContractInvocationSchema,
  normalizeKnownStructuredOutput,
  parseResultSchema,
  repairAttemptSchema,
  typedCompletionResultSchema,
} from ".";

const rawHash = contentFingerprint({ raw: true });
const error = {
  path: ["goal"],
  code: "required",
  message: "Goal is required",
  expected: "string",
  received: null,
  blocking: true,
};
const parseResult = {
  invocationId: "ai_invocation_task",
  status: "exact" as const,
  parsedValue: { goal: "Build OXZI" },
  rawResponseHash: rawHash,
  parsedValueHash: contentFingerprint({ goal: "Build OXZI" }),
  parserVersion: "1.0.0",
  normalizationOperations: [],
  validationErrors: [],
};

describe("Typed AI contracts", () => {
  it("accepts a valid structured completion", () => {
    expect(
      typedCompletionResultSchema.parse({
        invocationId: "ai_invocation_task",
        contractId: "ai_contract_task",
        status: "success",
        parsedResult: parseResult,
        repairAttempts: [],
        repairLimit: 2,
        escalationStatus: "none",
        partialState: null,
        finalCertified: true,
        normalizedOutputArtifactRef: "artifact:typed-output",
        evidenceRefs: ["evidence:schema"],
      }).finalCertified,
    ).toBe(true);
  });

  it("rejects invalid output without validation errors", () => {
    expect(() =>
      parseResultSchema.parse({
        ...parseResult,
        status: "invalid",
        parsedValue: null,
        parsedValueHash: null,
      }),
    ).toThrow(/require validation errors/);
  });

  it("normalizes only known representational variations", () => {
    const result = normalizeKnownStructuredOutput(
      { project_goal: " Build safely ", state: "ok" },
      {
        fieldAliases: { project_goal: "goal" },
        enumAliases: { state: { ok: "approved" } },
        trimStrings: true,
      },
    );
    expect(result.value).toEqual({ goal: "Build safely", state: "approved" });
    expect(result.operations).toEqual(["enum:state", "field:project_goal->goal", "trim:goal"]);
  });

  it("does not offer a repair operation that invents required values", () => {
    expect(() =>
      repairAttemptSchema.parse({
        id: "repair_attempt_task_1",
        invocationId: "ai_invocation_task",
        attemptNumber: 1,
        method: "deterministic",
        originalHash: rawHash,
        repairedHash: null,
        operations: ["invent_required_value"],
        confidence: 0,
        validatorVersion: "1.0.0",
        remainingErrors: [error],
        result: "failed",
        escalationStatus: "none",
      }),
    ).toThrow();
  });

  it("escalates after repeated repair failure", () => {
    const repair = {
      id: "repair_attempt_task_1",
      invocationId: "ai_invocation_task",
      attemptNumber: 1,
      method: "deterministic" as const,
      originalHash: rawHash,
      repairedHash: null,
      operations: ["trim_whitespace" as const],
      confidence: 100,
      validatorVersion: "1.0.0",
      remainingErrors: [error],
      result: "failed" as const,
      escalationStatus: "none" as const,
    };
    expect(() =>
      typedCompletionResultSchema.parse({
        invocationId: "ai_invocation_task",
        contractId: "ai_contract_task",
        status: "failed",
        parsedResult: {
          ...parseResult,
          status: "invalid",
          parsedValue: null,
          validationErrors: [error],
        },
        repairAttempts: [repair, { ...repair, id: "repair_attempt_task_2", attemptNumber: 2 }],
        repairLimit: 2,
        escalationStatus: "none",
        partialState: null,
        finalCertified: false,
        normalizedOutputArtifactRef: null,
        evidenceRefs: [],
      }),
    ).toThrow(/require escalation/);
  });

  it("prevents partial output from final certification", () => {
    expect(() =>
      typedCompletionResultSchema.parse({
        invocationId: "ai_invocation_task",
        contractId: "ai_contract_task",
        status: "partial",
        parsedResult: { ...parseResult, status: "partial" },
        repairAttempts: [],
        repairLimit: 2,
        escalationStatus: "none",
        partialState: {
          invocationId: "ai_invocation_task",
          state: "streaming",
          partialArtifactRefs: ["artifact:partial"],
          receivedFragmentIds: ["fragment:1"],
          duplicateFragmentIds: [],
          requiredFieldPathsMissing: ["acceptanceCriteria"],
          finalValidationPending: true,
        },
        finalCertified: true,
        normalizedOutputArtifactRef: null,
        evidenceRefs: [],
      }),
    ).toThrow(/cannot pass final certification/);
  });

  it("keeps raw provider payload outside the domain invocation", () => {
    const invocation = {
      id: "ai_invocation_task",
      contractId: "ai_contract_task",
      contractVersion: 1,
      inputArtifactRef: "artifact:input",
      providerAdapterRef: "adapter:provider",
      providerRequestArtifactRef: "artifact:request",
      rawResponseArtifactRef: null,
      status: "prepared",
      startedAt: "2026-07-23T00:00:00.000Z",
      completedAt: null,
    };
    expect(aiContractInvocationSchema.parse(invocation).status).toBe("prepared");
    expect(() =>
      aiContractInvocationSchema.parse({ ...invocation, rawProviderPayload: { vendor: true } }),
    ).toThrow();
  });
});
