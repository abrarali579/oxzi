import { describe, expect, it } from "vitest";

import { renderPromptProgram } from "../prompt-renderer";
import { compileCanonicalContext } from "../context-compiler";
import { compileTaskCard } from "../task-card";
import { implementationReadySpecificationFixture } from "../governance";
import { approvedImplementationSlice } from "../planning";
import { evaluatePromptProgram, certifyPromptProgram } from "../evaluation";
import { issueExecutionPassport } from "../control-plane";
import type { ExecutionPassport } from "../control-plane";
import {
  executePromptProgram,
  executeWithMock,
} from "./runtime";
import {
  MockProviderAdapter,
} from "./adapter";
import {
  executionReportSchema,
  agentCapabilityProfileSchema,
  agentCapabilityMappingSchema,
  type AgentCapabilityProfile,
} from "./schemas";

// ── Test Fixtures ───────────────────────────────────────────────

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
const validPassport = issueExecutionPassport(certification, taskCard, agentProfile);

const TEST_PROJECT_ID = "project_test_exec_runtime";

// ── Helper: build a minimal Executor capability profile ─────────

function buildExecutorProfile(overrides?: Partial<AgentCapabilityProfile>): AgentCapabilityProfile {
  return agentCapabilityProfileSchema.parse({
    id: "agent_profile_exec_test",
    revision: 1,
    integrationType: "api",
    instructionFiles: [],
    promptStyles: ["agent_optimized"],
    structuredInput: true,
    structuredOutput: true,
    contextWindow: 128_000,
    tokenizerRef: null,
    modelProfileRef: null,
    toolProfileRef: null,
    mcpProfileRef: null,
    workflowDefaultsRef: null,
    promptPreferenceRef: null,
    qualityMode: "balanced",
    approvalPolicyRef: "policy_auto_low_risk",
    capabilities: {
      planMode: false,
      sessionReset: true,
      compaction: true,
      contextInspection: false,
      costInspection: false,
      artifacts: true,
      directDelivery: true,
      executionMonitoring: false,
      pauseResume: true,
      stopCancel: true,
      subAgents: false,
      readOnlyContext: false,
      patchEdits: true,
      ...overrides?.capabilities,
    },
    sandboxRequirements: [],
    fingerprint: `fp_f1_${"a".repeat(16)}`,
  });
}

function buildArchitectProfile(): AgentCapabilityProfile {
  return buildExecutorProfile({
    capabilities: {
      planMode: true,
      sessionReset: true,
      compaction: true,
      contextInspection: true,
      costInspection: true,
      artifacts: false,
      directDelivery: false,
      executionMonitoring: false,
      pauseResume: false,
      stopCancel: false,
      subAgents: false,
      readOnlyContext: true,
      patchEdits: false,
    },
  });
}

function buildReviewerProfile(): AgentCapabilityProfile {
  return buildExecutorProfile({
    capabilities: {
      planMode: false,
      sessionReset: false,
      compaction: false,
      contextInspection: true,
      costInspection: true,
      artifacts: false,
      directDelivery: false,
      executionMonitoring: true,
      pauseResume: false,
      stopCancel: false,
      subAgents: false,
      readOnlyContext: true,
      patchEdits: false,
    },
  });
}

// ── Tests ───────────────────────────────────────────────────────

describe("Connected Execution Runtime", () => {
  // ── Happy Path ─────────────────────────────────────────────

  it("routes a valid ExecutionPassport to a mock provider and returns a well-formed ExecutionReport", async () => {
    const report = await executeWithMock(
      validPassport,
      validProgram,
      TEST_PROJECT_ID,
    );

    // Schema check
    expect(() => executionReportSchema.parse(report)).not.toThrow();

    // Core fields
    expect(report.passportId).toBe(validPassport.passportId);
    expect(report.status).toBe("success");
    expect(report.error).toBeNull();
    expect(report.artifacts.length).toBeGreaterThanOrEqual(1);

    // Trace
    expect(report.traceId).toMatch(/^trace_[a-f0-9]{16}$/);
    expect(report.executionId).toMatch(/^execution_[a-f0-9]{16}$/);

    // Metrics
    expect(report.metrics.totalLatencyMs).toBeGreaterThanOrEqual(0);
    expect(report.metrics.inputTokens).toBeGreaterThan(0);
    expect(report.metrics.outputTokens).toBeGreaterThan(0);

    // Timestamps
    expect(new Date(report.startedAt).getTime()).toBeLessThanOrEqual(
      new Date(report.endedAt).getTime(),
    );

    // Fingerprint
    expect(report.fingerprint).toMatch(/^fp_f1_/);

    // Artifact
    const artifact = report.artifacts[0];
    expect(artifact.type).toBe("execution_output");
    expect(artifact.projectId).toBe(TEST_PROJECT_ID);
    expect(artifact.executionId).toBe(report.executionId);
  });

  it("produces deterministic reports for the same inputs", async () => {
    const first = await executeWithMock(
      validPassport,
      validProgram,
      TEST_PROJECT_ID,
    );
    const second = await executeWithMock(
      validPassport,
      validProgram,
      TEST_PROJECT_ID,
    );

    // Both reports should be well-formed
    expect(() => executionReportSchema.parse(first)).not.toThrow();
    expect(() => executionReportSchema.parse(second)).not.toThrow();

    // Core fields should match (fingerprint is content-derived)
    expect(first.status).toBe(second.status);
    expect(first.passportId).toBe(second.passportId);
    // executionId and traceId include timestamps, so they differ across runs
    // — that's expected and non-deterministic by design for observability
  });

  // ── Failure Modes ──────────────────────────────────────────

  it("returns a 'failed' report for provider timeout without throwing", async () => {
    const report = await executeWithMock(
      validPassport,
      validProgram,
      TEST_PROJECT_ID,
      { mockMode: "timeout" },
    );

    expect(report.status).toBe("failed");
    expect(report.error).toBeDefined();
    expect(report.error).toContain("timed out");
    expect(report.artifacts).toHaveLength(0);
    expect(report.metrics.inputTokens).toBeNull();
  });

  it("returns a 'partial' report when structured parsing fails", async () => {
    const report = await executeWithMock(
      validPassport,
      validProgram,
      TEST_PROJECT_ID,
      { mockMode: "parse_failure" },
    );

    expect(report.status).toBe("partial");
    expect(report.error).toBeDefined();
    expect(report.error!.toLowerCase()).toContain("structured contract parsing failed");
    // Should still have artifacts (raw output)
    expect(report.artifacts.length).toBeGreaterThanOrEqual(1);
  });

  it("returns a 'failed' report for empty provider output", async () => {
    const report = await executeWithMock(
      validPassport,
      validProgram,
      TEST_PROJECT_ID,
      { mockMode: "empty" },
    );

    expect(report.status).toBe("failed");
    expect(report.error).toBeDefined();
    expect(report.artifacts).toHaveLength(0);
  });

  // ── Passport Validation ────────────────────────────────────

  it("blocks execution for an expired passport", async () => {
    const expiredPassport = issueExecutionPassport(
      certification,
      taskCard,
      agentProfile,
      { issuedAt: "2020-01-01T00:00:00.000Z", ttlMs: 1 },
    );

    // Manually verify we'd get a blocked report
    // The passport verification would fail during execution
    const result = await executePromptProgram({
      passport: expiredPassport,
      promptProgram: validProgram,
      adapter: new MockProviderAdapter(),
      projectId: TEST_PROJECT_ID,
    });

    expect(result.status === "failed" || result.status === "blocked").toBe(true);
    expect(result.error).toBeDefined();
  });

  it("produces a report without throwing for invalid passports (graceful handling)", async () => {
    // Tampered passport
    const tampered = {
      ...validPassport,
      programId: "prompt_program_tampered_000000000000",
    };

    const report = await executePromptProgram({
      passport: tampered as unknown as ExecutionPassport,
      promptProgram: validProgram,
      adapter: new MockProviderAdapter(),
      projectId: TEST_PROJECT_ID,
    });

    expect(report.status).toBe("failed");
    expect(report.error).toBeDefined();
  });

  // ── Capability Matching ────────────────────────────────────

  it("blocks execution when agent lacks required capabilities for the inferred role", async () => {
    // Architect profile for a task that requires executor capabilities
    const architectProfile = buildArchitectProfile();

    const report = await executeWithMock(
      validPassport,
      validProgram,
      TEST_PROJECT_ID,
      { agentCapabilityProfile: architectProfile },
    );

    // Purpose doesn't contain plan/design/review keywords, so role is executor
    // Architect profile lacks patchEdits and directDelivery
    expect(report.status).toBe("blocked");
    expect(report.error).toBeDefined();
    expect(report.error).toContain("executor");
    expect(report.artifacts).toHaveLength(0);
  });

  it("blocks execution when agent has forbidden capabilities for the role", async () => {
    // Executor profile used for an architect task
    const executorProfile = buildExecutorProfile();

    // This program's purpose would match executor, but let's test with
    // an override to architect role
    const report = await executePromptProgram({
      passport: validPassport,
      promptProgram: validProgram,
      adapter: new MockProviderAdapter(),
      projectId: TEST_PROJECT_ID,
      agentCapabilityProfile: executorProfile,
      overrideRole: "architect",
    });

    // Executor has patchEdits and directDelivery which are forbidden for architect
    expect(report.status).toBe("blocked");
    expect(report.error).toContain("architect");
  });

  it("allows execution when agent capabilities match the required role", async () => {
    const executorProfile = buildExecutorProfile();

    const report = await executeWithMock(
      validPassport,
      validProgram,
      TEST_PROJECT_ID,
      { agentCapabilityProfile: executorProfile },
    );

    // Purpose doesn't match plan/design/review → executor role
    // Executor profile has patchEdits, directDelivery, artifacts
    expect(report.status).toBe("success");
    expect(report.artifacts.length).toBeGreaterThanOrEqual(1);
  });

  it("allows reviewer profile for review tasks via override", async () => {
    const reviewerProfile = buildReviewerProfile();

    const report = await executePromptProgram({
      passport: validPassport,
      promptProgram: validProgram,
      adapter: new MockProviderAdapter(),
      projectId: TEST_PROJECT_ID,
      agentCapabilityProfile: reviewerProfile,
      overrideRole: "reviewer",
    });

    // Reviewer role applied via override
    expect(report.status).toBe("success");
  });

  // ── Provider Adapter ───────────────────────────────────────

  it("returns a well-formed report via the generic executePromptProgram entrypoint", async () => {
    const adapter = new MockProviderAdapter({ mode: "success" });

    const report = await executePromptProgram({
      passport: validPassport,
      promptProgram: validProgram,
      adapter,
      projectId: TEST_PROJECT_ID,
    });

    expect(report.status).toBe("success");
    expect(report.artifacts.length).toBeGreaterThanOrEqual(1);
  });

  it("propagates ProviderDispatchError as a failed report", async () => {
    const adapter = new MockProviderAdapter({ mode: "timeout" });

    const report = await executePromptProgram({
      passport: validPassport,
      promptProgram: validProgram,
      adapter,
      projectId: TEST_PROJECT_ID,
    });

    expect(report.status).toBe("failed");
    expect(report.error).toContain("timed out");
  });

  // ── Schema Validation ─────────────────────────────────────

  it("executionReportSchema validates all required fields", () => {
    const schema = executionReportSchema;

    // Valid minimal report
    const validReport = {
      traceId: "trace_0000000000000000",
      passportId: "cp_passport_test123456",
      executionId: "execution_test12345678",
      status: "success",
      artifacts: [],
      rawOutputRef: null,
      error: null,
      metrics: {
        totalLatencyMs: 100,
        inputTokens: 500,
        outputTokens: 200,
        costEstimate: null,
      },
      startedAt: "2026-07-24T00:00:00.000Z",
      endedAt: "2026-07-24T00:00:01.000Z",
      fingerprint: `fp_f1_${"b".repeat(16)}`,
    };

    expect(() => schema.parse(validReport)).not.toThrow();

    // Invalid: missing traceId
    expect(() =>
      schema.parse({ ...validReport, traceId: undefined }),
    ).toThrow();

    // Invalid: bad status
    expect(() =>
      schema.parse({ ...validReport, status: "unknown" }),
    ).toThrow();
  });

  // ── No Canonical Mutation ──────────────────────────────────

  it("does not mutate the input passport", async () => {
    const originalPassport = { ...validPassport };
    const frozenPassport = Object.freeze({ ...validPassport });

    // Should work with frozen passport (no mutation)
    const report = await executeWithMock(
      frozenPassport as ExecutionPassport,
      validProgram,
      TEST_PROJECT_ID,
    );

    expect(report.status).toBe("success");
    expect(frozenPassport).toEqual(originalPassport);
  });
});

describe("Agent Capability Mapping Schema", () => {
  it("validates architect role mapping", () => {
    const mapping = agentCapabilityMappingSchema.parse({
      role: "architect",
      requiredCapabilities: ["planMode", "readOnlyContext", "contextInspection"],
      forbiddenCapabilities: ["patchEdits", "directDelivery"],
    });

    expect(mapping.role).toBe("architect");
    expect(mapping.requiredCapabilities).toContain("planMode");
    expect(mapping.forbiddenCapabilities).toContain("patchEdits");
  });

  it("rejects invalid roles", () => {
    expect(() =>
      agentCapabilityMappingSchema.parse({
        role: "invalid_role",
        requiredCapabilities: [],
        forbiddenCapabilities: [],
      }),
    ).toThrow();
  });
});

describe("MockProviderAdapter", () => {
  it("builds artifact references from responses", () => {
    const response = {
      rawText: "test output",
      parsedContract: { key: "value" },
      finishReason: "stop",
      inputTokens: 100,
      outputTokens: 50,
      latencyMs: 10,
    };

    const artifact = MockProviderAdapter.buildArtifact(
      response,
      "execution_test12345678",
      TEST_PROJECT_ID,
    );

    expect(artifact.type).toBe("execution_output");
    expect(artifact.projectId).toBe(TEST_PROJECT_ID);
    expect(artifact.executionId).toBe("execution_test12345678");
  });
});
