/**
 * Provider-Neutral Execution Adapter
 *
 * Defines the standard interface for dispatching rendered Prompt Programs
 * to connected agents. The core domain never couples directly to
 * OpenAI/Anthropic SDKs — all external calls route through adapters
 * that implement this contract.
 */
import { contentFingerprint } from "../knowledge-graph";
import {
  providerAdapterConfigSchema,
  providerResponseSchema,
  artifactReferenceSchema,
  artifactIdSchema,
  type ProviderAdapterConfig,
  type ProviderResponse,
  type ArtifactReference,
} from "./schemas";

export type { ProviderResponse };

// ── Adapter Interface ──────────────────────────────────────────

/** Parameters the runtime passes to any provider adapter. */
export interface ProviderExecuteParams {
  renderedPrompt: string;
  outputContract: string;
  agentProfileRef: string;
  maxTokens: number;
  /** Optional timeout in milliseconds. Defaults to 30_000. */
  timeoutMs?: number;
}

/**
 * Every provider adapter must implement this interface.
 * The runtime never imports provider-specific SDKs — it only
 * calls `execute()` on a conforming adapter.
 */
export interface ProviderAdapter {
  readonly config: ProviderAdapterConfig;
  execute(params: ProviderExecuteParams): Promise<ProviderResponse>;
}

// ── Mock Provider Adapter ──────────────────────────────────────

/**
 * Deterministic simulated adapter for testing the execution runtime
 * without real external API calls.
 *
 * Produces well-formed structured output that the runtime can parse
 * into artifacts. Configurable to simulate success, timeout, or
 * parse failure scenarios.
 */
export class MockProviderAdapter implements ProviderAdapter {
  readonly config: ProviderAdapterConfig;

  private readonly mode: "success" | "timeout" | "parse_failure" | "empty";
  private readonly mockLatencyMs: number;

  constructor(options?: {
    mode?: "success" | "timeout" | "parse_failure" | "empty";
    latencyMs?: number;
    providerId?: string;
  }) {
    this.mode = options?.mode ?? "success";
    this.mockLatencyMs = options?.latencyMs ?? 5;
    this.config = providerAdapterConfigSchema.parse({
      providerId: options?.providerId ?? "mock_provider_default",
      providerType: "mock",
      capabilities: ["text_generation", "structured_output"],
      supportsArtifacts: true,
      maxContextTokens: 128_000,
      defaultModel: "mock-model-v1",
    });
  }

  async execute(params: ProviderExecuteParams): Promise<ProviderResponse> {
    const startTime = Date.now();

    // Simulate latency
    await new Promise((resolve) => setTimeout(resolve, this.mockLatencyMs));

    switch (this.mode) {
      case "timeout":
        throw new MockProviderTimeoutError(
          `Mock provider timed out after ${params.timeoutMs ?? 30_000}ms`,
        );

      case "parse_failure":
        return providerResponseSchema.parse({
          rawText: "unstructured garbled response {{ invalid json",
          parsedContract: null,
          finishReason: "stop",
          inputTokens: 150,
          outputTokens: 40,
          latencyMs: Date.now() - startTime,
        });

      case "empty":
        return providerResponseSchema.parse({
          rawText: "",
          parsedContract: null,
          finishReason: "stop",
          inputTokens: 100,
          outputTokens: 0,
          latencyMs: Date.now() - startTime,
        });

      case "success":
      default:
        return this.buildSuccessResponse(params, startTime);
    }
  }

  private buildSuccessResponse(
    params: ProviderExecuteParams,
    startTime: number,
  ): ProviderResponse {
    const parsedContract = {
      summary: `Executed task with contract: ${params.outputContract}`,
      files_changed: ["src/domain/example.ts"],
      acceptance_criteria_met: true,
      validation_output: "All checks passed",
    };

    const rawText = [
      "## Execution Result",
      "",
      "Task completed successfully.",
      "",
      "### Changes",
      "- Updated `src/domain/example.ts`",
      "",
      "### Validation",
      "All acceptance criteria met.",
      "",
      "```json",
      JSON.stringify(parsedContract, null, 2),
      "```",
    ].join("\n");

    return providerResponseSchema.parse({
      rawText,
      parsedContract,
      finishReason: "stop",
      inputTokens: Math.ceil(params.renderedPrompt.length / 4),
      outputTokens: Math.ceil(rawText.length / 4),
      latencyMs: Date.now() - startTime,
    });
  }

  /**
   * Create an artifact reference from a successful execution.
   * Artifact-first communication: raw prose is traced but the
   * structured contract is the canonical artifact.
   */
  static buildArtifact(
    providerResponse: ProviderResponse,
    executionId: string,
    projectId: string,
  ): ArtifactReference {
    const content = JSON.stringify(
      providerResponse.parsedContract ?? { raw: providerResponse.rawText },
    );
    const hash = contentFingerprint(content);

    return artifactReferenceSchema.parse({
      id: artifactIdSchema.parse(
        `artifact_${hash.replace("fp_f1_", "").slice(0, 16)}`,
      ),
      type: "execution_output",
      contentLocation: `artifact://executions/${executionId}/output.json`,
      hash: `sha256:${"0".repeat(64)}`,
      version: "1.0.0",
      producer: "mock_provider",
      projectId,
      executionId,
      privacyClassification: "internal",
      freshness: "current",
      retention: "permanent",
      verificationStatus: "unverified",
    });
  }
}

// ── Error Types ─────────────────────────────────────────────────

export class MockProviderTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MockProviderTimeoutError";
  }
}

export class ProviderDispatchError extends Error {
  constructor(
    message: string,
    public readonly providerId: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "ProviderDispatchError";
  }
}
