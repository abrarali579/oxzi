/**
 * Connected Execution Runtime
 *
 * Bridges the Agent Control Plane, rendered Prompt Programs, and
 * connected agent execution. Establishes the execution envelope,
 * provider-neutral dispatch, and artifact-first tracing without
 * mutating canonical project state.
 *
 * Pipeline:
 *   ExecutionPassport Validation
 *   → Agent Profile Capability Matching
 *   → Provider-Neutral Execution Dispatch
 *   → Output Capture (Raw Text + Structured Contracts)
 *   → Artifact Hand-off & Trace Persistence
 *   → Execution Report Generation
 */
import { contentFingerprint } from "../knowledge-graph";
import {
  verifyPassportValidity,
  type ExecutionPassport,
} from "../control-plane";
import type { PromptProgram } from "../prompt-renderer";
import {
  startTrace,
  endTrace,
  startSpan,
  endSpan,
} from "../observability";
import {
  executionReportSchema,
  executionIdSchema,
  executionMetricsSchema,
  artifactReferenceSchema,
  artifactIdSchema,
  agentCapabilityMappingSchema,
  type ExecutionReport,
  type AgentCapabilityProfile,
  type AgentCapabilityMapping,
  type AgentRole,
  type ExecutionMetrics,
  type ArtifactReference,
} from "./schemas";
import {
  type ProviderAdapter,
  type ProviderExecuteParams,
  type ProviderResponse,
  ProviderDispatchError,
  MockProviderAdapter,
  MockProviderTimeoutError,
} from "./adapter";

// ── Constants ──────────────────────────────────────────────────

const DEFAULT_PROVIDER_TIMEOUT_MS = 30_000;

// ── Role-to-Capability Mappings ─────────────────────────────────

/**
 * Each agent role (Architect, Executor, Reviewer) has a standard
 * capability profile. The runtime enforces that the agent selected
 * for a task matches the required role.
 */
const ROLE_CAPABILITY_MAP: Record<AgentRole, AgentCapabilityMapping> = {
  architect: agentCapabilityMappingSchema.parse({
    role: "architect",
    requiredCapabilities: ["planMode", "readOnlyContext", "contextInspection"],
    forbiddenCapabilities: ["patchEdits", "directDelivery"],
  }),
  executor: agentCapabilityMappingSchema.parse({
    role: "executor",
    requiredCapabilities: ["patchEdits", "directDelivery", "artifacts"],
    forbiddenCapabilities: [],
  }),
  reviewer: agentCapabilityMappingSchema.parse({
    role: "reviewer",
    requiredCapabilities: [
      "readOnlyContext",
      "contextInspection",
      "executionMonitoring",
    ],
    forbiddenCapabilities: ["patchEdits"],
  }),
};

// ── Error Types ─────────────────────────────────────────────────

export class ExecutionValidationError extends Error {
  constructor(
    message: string,
    public readonly errorType: string,
  ) {
    super(message);
    this.name = "ExecutionValidationError";
  }
}

export class CapabilityMismatchError extends Error {
  constructor(
    message: string,
    public readonly requiredRole: AgentRole,
    public readonly missingCapabilities: string[],
  ) {
    super(message);
    this.name = "CapabilityMismatchError";
  }
}

// ── Step 1: Passport Validation ─────────────────────────────────

/**
 * Validate the ExecutionPassport integrity, expiration, and status.
 * Returns the parsed passport or throws ExecutionValidationError.
 */
function validatePassport(passport: ExecutionPassport): ExecutionPassport {
  const verification = verifyPassportValidity(passport);

  if (!verification.valid) {
    throw new ExecutionValidationError(
      `Passport validation failed: ${verification.reason ?? "unknown reason"}`,
      "passport_invalid",
    );
  }

  if (passport.status !== "ACTIVE") {
    throw new ExecutionValidationError(
      `Passport status is "${passport.status}" — only ACTIVE passports can be executed.`,
      "passport_invalid",
    );
  }

  const now = new Date();
  const expiresAt = new Date(passport.expiresAt);
  if (now >= expiresAt) {
    throw new ExecutionValidationError(
      `Passport expired at ${passport.expiresAt}.`,
      "passport_expired",
    );
  }

  return passport;
}

// ── Step 2: Capability Matching ─────────────────────────────────

/**
 * Infer the required agent role from the prompt program's purpose
 * and check that the target agent's capabilities satisfy it.
 *
 * The role is inferred heuristically:
 *   - If the purpose includes "plan" or "design" → architect
 *   - If the purpose includes "review" or "audit" → reviewer
 *   - Otherwise → executor
 */
function inferRequiredRole(promptProgram: PromptProgram): AgentRole {
  const purpose = promptProgram.purpose.toLowerCase();
  if (/plan|design|architect|scaffold/.test(purpose)) return "architect";
  if (/review|audit|inspect|evaluate|verify/.test(purpose)) return "reviewer";
  return "executor";
}

/**
 * Match an agent capability profile against a required role.
 * Returns the list of missing required capabilities, if any.
 */
function matchCapabilities(
  profile: AgentCapabilityProfile,
  role: AgentRole,
): { matched: boolean; missing: string[]; forbidden: string[] } {
  const mapping = ROLE_CAPABILITY_MAP[role];
  const profileCaps = new Set(
    Object.entries(profile.capabilities)
      .filter(([, enabled]) => enabled)
      .map(([key]) => key),
  );

  const missing = mapping.requiredCapabilities.filter(
    (cap) => !profileCaps.has(cap),
  );
  const forbidden = mapping.forbiddenCapabilities.filter((cap) =>
    profileCaps.has(cap),
  );

  return {
    matched: missing.length === 0 && forbidden.length === 0,
    missing,
    forbidden,
  };
}

// ── Step 3: Provider-Neutral Dispatch ───────────────────────────

/**
 * Dispatch the rendered prompt to the provider adapter.
 * Wraps the call with timeout protection.
 */
async function dispatchToProvider(
  adapter: ProviderAdapter,
  params: ProviderExecuteParams,
): Promise<ProviderResponse> {
  const timeoutMs = params.timeoutMs ?? DEFAULT_PROVIDER_TIMEOUT_MS;

  try {
    const result = await Promise.race([
      adapter.execute(params),
      new Promise<never>((_, reject) =>
        setTimeout(
          () =>
            reject(
              new ProviderDispatchError(
                `Provider ${adapter.config.providerId} timed out after ${timeoutMs}ms`,
                adapter.config.providerId,
              ),
            ),
          timeoutMs,
        ),
      ),
    ]);

    return result;
  } catch (error) {
    if (error instanceof ProviderDispatchError) throw error;
    if (error instanceof MockProviderTimeoutError) {
      throw new ProviderDispatchError(
        `Provider ${adapter.config.providerId} timed out`,
        adapter.config.providerId,
        error,
      );
    }
    throw new ProviderDispatchError(
      `Provider ${adapter.config.providerId} failed: ${String(error)}`,
      adapter.config.providerId,
      error,
    );
  }
}

// ── Step 4: Output Capture & Artifact Parsing ───────────────────

/**
 * Attempt to extract structured JSON from raw provider output.
 * Looks for JSON code blocks first, then tries parsing the full text.
 */
function extractStructuredOutput(rawText: string): Record<string, unknown> | null {
  // Try JSON code blocks: ```json ... ```
  const jsonBlock = rawText.match(/```json\s*\n([\s\S]*?)\n\s*```/);
  if (jsonBlock) {
    try {
      return JSON.parse(jsonBlock[1]) as Record<string, unknown>;
    } catch {
      // Fall through to full-text parse
    }
  }

  // Try parsing the entire output as JSON
  try {
    return JSON.parse(rawText) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Create an artifact reference for execution output.
 * Artifact-first: the structured contract is the canonical artifact;
 * raw prose is traced but not treated as canonical truth.
 */
function createOutputArtifact(
  providerResponse: ProviderResponse,
  executionId: string,
  projectId: string,
): ArtifactReference {
  const content = JSON.stringify(
    providerResponse.parsedContract ?? { raw_fallback: providerResponse.rawText },
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
    producer: "execution_runtime",
    projectId,
    executionId,
    privacyClassification: "internal",
    freshness: "current",
    retention: "permanent",
    verificationStatus: "unverified",
  });
}

// ── Step 5: Metrics Computation ─────────────────────────────────

function computeMetrics(
  providerResponse: ProviderResponse,
  totalLatencyMs: number,
): ExecutionMetrics {
  return executionMetricsSchema.parse({
    totalLatencyMs,
    inputTokens: providerResponse.inputTokens,
    outputTokens: providerResponse.outputTokens,
    costEstimate: null, // No cost tracking without real providers
  });
}

// ── Step 6: Report Generation ───────────────────────────────────

function buildReport(params: {
  traceId: string;
  passport: ExecutionPassport;
  executionId: string;
  status: "success" | "partial" | "failed" | "blocked";
  artifacts: ArtifactReference[];
  error: string | null;
  metrics: ExecutionMetrics;
  startedAt: string;
  endedAt: string;
}): ExecutionReport {
  return executionReportSchema.parse({
    traceId: params.traceId,
    passportId: params.passport.passportId,
    executionId: params.executionId,
    status: params.status,
    artifacts: params.artifacts,
    rawOutputRef: null,
    error: params.error,
    metrics: params.metrics,
    startedAt: params.startedAt,
    endedAt: params.endedAt,
    fingerprint: contentFingerprint({
      traceId: params.traceId,
      passportId: params.passport.passportId,
      status: params.status,
    }),
  });
}

// ── Public API: executePromptProgram ────────────────────────────

export interface ExecuteParams {
  /** An approved, ACTIVE ExecutionPassport from the control plane. */
  passport: ExecutionPassport;
  /** The rendered PromptProgram to execute. */
  promptProgram: PromptProgram;
  /** A provider adapter implementing the standard dispatch interface. */
  adapter: ProviderAdapter;
  /** The project ID for trace and artifact association. */
  projectId: string;
  /** Optional agent capability profile for role-based checks. */
  agentCapabilityProfile?: AgentCapabilityProfile;
  /** Override the inferred agent role. */
  overrideRole?: AgentRole;
}

/**
 * Execute a rendered Prompt Program within the constraints of an
 * approved Execution Passport.
 *
 * This is the main entrypoint for the connected execution runtime.
 * It validates the passport, matches agent capabilities, dispatches
 * through a provider-neutral adapter, captures structured output as
 * artifacts, and returns a typed ExecutionReport.
 *
 * The runtime is strictly operational — it does NOT mutate canonical
 * project state, specifications, or the Project Bible.
 *
 * @returns A typed ExecutionReport with traces, parsed contracts,
 *          and token/latency metrics.
 */
export async function executePromptProgram(
  params: ExecuteParams,
): Promise<ExecutionReport> {
  const {
    passport,
    promptProgram,
    adapter,
    projectId,
    agentCapabilityProfile,
    overrideRole,
  } = params;

  const startedAt = new Date().toISOString();
  const executionId = executionIdSchema.parse(
    `execution_${contentFingerprint({
      passportId: passport.passportId,
      programId: promptProgram.programId,
      startedAt,
    }).replace("fp_f1_", "").slice(0, 16)}`,
  );

  // ── Observability: start execution trace ──────────────────
  const traceId = startTrace({
    projectId,
    taskCardId: passport.taskCardId,
    operation: `execute_${promptProgram.purpose.slice(0, 30).replace(/\s+/g, "_")}`,
    tags: ["execution", adapter.config.providerType],
  });

  const mainSpanId = startSpan(traceId, "agent_operation");

  try {
    // ── Step 1: Validate Passport ────────────────────────────
    const validPassport = validatePassport(passport);

    // ── Step 2: Capability Matching ──────────────────────────
    const requiredRole = overrideRole ?? inferRequiredRole(promptProgram);

    if (agentCapabilityProfile) {
      const capabilityCheck = matchCapabilities(
        agentCapabilityProfile,
        requiredRole,
      );

      if (!capabilityCheck.matched) {
        const reasons: string[] = [];
        if (capabilityCheck.missing.length > 0) {
          reasons.push(
            `Missing required capabilities for "${requiredRole}" role: ${capabilityCheck.missing.join(", ")}`,
          );
        }
        if (capabilityCheck.forbidden.length > 0) {
          reasons.push(
            `Agent has forbidden capabilities for "${requiredRole}" role: ${capabilityCheck.forbidden.join(", ")}`,
          );
        }

        endSpan(mainSpanId);
        endTrace(traceId, "blocked");

        const endedAt = new Date().toISOString();
        return buildReport({
          traceId,
          passport: validPassport,
          executionId,
          status: "blocked",
          artifacts: [],
          error: reasons.join("; "),
          metrics: executionMetricsSchema.parse({
            totalLatencyMs: new Date(endedAt).getTime() - new Date(startedAt).getTime(),
            inputTokens: null,
            outputTokens: null,
            costEstimate: null,
          }),
          startedAt,
          endedAt,
        });
      }
    }

    // ── Step 3: Dispatch to Provider ────────────────────────
    const executeParams: ProviderExecuteParams = {
      renderedPrompt: promptProgram.renderedPrompt,
      outputContract: promptProgram.outputContract,
      agentProfileRef: passport.agentId,
      maxTokens: passport.limits.maxTokens,
      timeoutMs: passport.limits.maxTimeMs,
    };

    let providerResponse: ProviderResponse;

    try {
      providerResponse = await dispatchToProvider(adapter, executeParams);
    } catch (dispatchError) {
      endSpan(mainSpanId);
      endTrace(traceId, "failed");

      const endedAt = new Date().toISOString();
      const errorMessage =
        dispatchError instanceof ProviderDispatchError
          ? dispatchError.message
          : `Provider dispatch failed: ${String(dispatchError)}`;

      return buildReport({
        traceId,
        passport: validPassport,
        executionId,
        status: "failed",
        artifacts: [],
        error: errorMessage,
        metrics: executionMetricsSchema.parse({
          totalLatencyMs: new Date(endedAt).getTime() - new Date(startedAt).getTime(),
          inputTokens: null,
          outputTokens: null,
          costEstimate: null,
        }),
        startedAt,
        endedAt,
      });
    }

    // ── Step 4: Capture Structured Output ──────────────────
    // Prefer the adapter's parsed contract; fall back to extraction
    const parsedContract =
      providerResponse.parsedContract ??
      extractStructuredOutput(providerResponse.rawText);

    const hasValidContract = parsedContract !== null;
    const hasRawOutput = providerResponse.rawText.trim().length > 0;

    // ── Step 5: Create Artifacts ────────────────────────────
    const artifacts: ArtifactReference[] = [];

    if (hasValidContract || hasRawOutput) {
      // Enrich the response with extracted contract if adapter didn't provide one
      const enrichedResponse: ProviderResponse = {
        ...providerResponse,
        parsedContract: providerResponse.parsedContract ?? parsedContract,
      };

      const artifact = createOutputArtifact(
        enrichedResponse,
        executionId,
        projectId,
      );
      artifacts.push(artifact);
    }

    // ── Step 6: Determine Final Status ─────────────────────
    const totalLatencyMs = Date.now() - new Date(startedAt).getTime();
    const metrics = computeMetrics(providerResponse, totalLatencyMs);

    let finalStatus: "success" | "partial" | "failed";

    if (hasValidContract && hasRawOutput) {
      finalStatus = "success";
    } else if (hasRawOutput && !hasValidContract) {
      finalStatus = "partial";
    } else {
      finalStatus = "failed";
    }

    // ── Complete trace ────────────────────────────────────
    endSpan(mainSpanId);
    endTrace(traceId, finalStatus === "success" ? "completed" : "failed");

    const endedAt = new Date().toISOString();
    const errorMessage =
      finalStatus === "failed"
        ? "No valid output received from provider"
        : finalStatus === "partial"
          ? "Structured contract parsing failed; only raw output captured"
          : null;

    return buildReport({
      traceId,
      passport: validPassport,
      executionId,
      status: finalStatus,
      artifacts,
      error: errorMessage,
      metrics,
      startedAt,
      endedAt,
    });

  } catch (error) {
    // ── Unhandled error: produce a FAILED report ──────────
    endSpan(mainSpanId);
    endTrace(traceId, "failed");

    const endedAt = new Date().toISOString();
    const errorMessage =
      error instanceof Error ? error.message : String(error);

    return buildReport({
      traceId,
      passport,
      executionId,
      status: "failed",
      artifacts: [],
      error: `Unhandled execution error: ${errorMessage}`,
      metrics: executionMetricsSchema.parse({
        totalLatencyMs: new Date(endedAt).getTime() - new Date(startedAt).getTime(),
        inputTokens: null,
        outputTokens: null,
        costEstimate: null,
      }),
      startedAt,
      endedAt,
    });
  }
}

// ── Convenience: execute with mock adapter ──────────────────────

/**
 * Execute a Prompt Program using the deterministic mock adapter.
 * Useful for testing and development without external API calls.
 */
export async function executeWithMock(
  passport: ExecutionPassport,
  promptProgram: PromptProgram,
  projectId: string,
  options?: {
    agentCapabilityProfile?: AgentCapabilityProfile;
    mockMode?: "success" | "timeout" | "parse_failure" | "empty";
  },
): Promise<ExecutionReport> {
  const adapter = new MockProviderAdapter({
    mode: options?.mockMode ?? "success",
  });

  return executePromptProgram({
    passport,
    promptProgram,
    adapter,
    projectId,
    agentCapabilityProfile: options?.agentCapabilityProfile,
  });
}
