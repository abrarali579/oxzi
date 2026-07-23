/* eslint-disable @typescript-eslint/no-explicit-any */
import { contentFingerprint, type JsonValue } from "@/domain/knowledge-graph";
import { traceSchema, spanSchema, type Trace, type Span } from "./schemas";

// ── In-memory trace store ──────────────────────────────────────

const traces: Map<string, Trace> = new Map();
const spans: Map<string, Span> = new Map();

// ── Active trace context (per async call) ──────────────────────

const activeTraceId = new Map<string | symbol, string>();

function generateId(prefix: string, key: string): string {
  return `${prefix}_${contentFingerprint({ key } as unknown as JsonValue)
    .replace("fp_f1_", "")
    .slice(0, 16)}`;
}

// ── Trace lifecycle ─────────────────────────────────────────────

export function startTrace(input: {
  projectId: string;
  taskCardId: string;
  operation: string;
  tags?: string[];
}): string {
  const traceId = generateId("trace", `${input.projectId}_${input.operation}_${Date.now()}`);

  const trace = traceSchema.parse({
    id: traceId,
    projectId: input.projectId,
    taskCardId: input.taskCardId,
    executionPassportId: null,
    executionId: null,
    environment: "local",
    startedAt: new Date().toISOString(),
    endedAt: null,
    status: "running",
    userSessionRef: null,
    privacyMode: "local_only",
    retentionPolicyRef: "retention_local",
    tags: input.tags ?? [],
    metadataRefs: [],
    versions: {
      canonicalProjectVersionId: `version_${input.projectId}` as any,
      constitutionVersionRef: "constitution_v1",
      specificationVersionRefs: ["spec_v1"],
      technicalPlanVersionRefs: [],
      knowledgeGraphVersionRef: "kg_v1",
      repositoryGraphVersionRef: null,
      taskCardVersionRef: input.taskCardId,
      contextPackageVersionRef: "ctx_v1",
      promptProgramVersionId: `prompt_version_${input.taskCardId}` as any,
      rendererVersionRef: "renderer_v1",
      exampleVersionRefs: [],
      workflowPolicyVersionRef: "workflow_v1",
      skillVersionRefs: [],
      targetAgentProfile: {
        profileId: "agent_profile_local",
        revision: 1,
        fingerprint: contentFingerprint({}),
      },
      modelProfileVersionRef: null,
      evaluationSuiteId: `eval_suite_default` as any,
      parserVersionRefs: [],
      structuredOutputContractVersionRef: "contract_v1",
    },
    fingerprint: contentFingerprint({
      traceId,
      projectId: input.projectId,
    } as unknown as JsonValue),
  });

  traces.set(traceId, trace);
  activeTraceId.set(Symbol(), traceId);

  return traceId;
}

export function endTrace(traceId: string, status: "completed" | "failed" | "blocked"): void {
  const trace = traces.get(traceId);
  if (!trace) return;
  traces.set(traceId, { ...trace, status, endedAt: new Date().toISOString() });
}

export function startSpan(traceId: string, operationType: string, parentSpanId?: string): string {
  const spanId = generateId("span", `${traceId}_${operationType}_${Date.now()}`);

  const span = spanSchema.parse({
    id: spanId,
    traceId,
    parentSpanId: parentSpanId ?? null,
    operationType,
    inputArtifactRef: null,
    outputArtifactRef: null,
    startedAt: new Date().toISOString(),
    endedAt: null,
    status: "running",
    inputTokens: null,
    outputTokens: null,
    cacheReadTokens: null,
    cacheWriteTokens: null,
    costAmount: null,
    costCurrency: null,
    errorRef: null,
    providerProfileRef: null,
    modelProfileRef: null,
    agentProfileRef: null,
    artifactRefs: [],
    evaluationRefs: [],
  });

  spans.set(spanId, span);
  return spanId;
}

export function endSpan(spanId: string): void {
  const span = spans.get(spanId);
  if (!span) return;
  spans.set(spanId, { ...span, status: "completed", endedAt: new Date().toISOString() });
}

export function getTrace(traceId: string): { trace: Trace | undefined; spans: Span[] } {
  return {
    trace: traces.get(traceId),
    spans: Array.from(spans.values()).filter((s) => s.traceId === traceId),
  };
}

export function getAllTraces(): Trace[] {
  return Array.from(traces.values()).sort(
    (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
  );
}

// ── withTrace wrapper ──────────────────────────────────────────

export async function withTrace<T>(
  input: {
    projectId: string;
    taskCardId: string;
    operation: string;
    tags?: string[];
  },
  fn: (traceId: string) => Promise<T>,
): Promise<T> {
  const traceId = startTrace(input);
  const spanId = startSpan(traceId, input.operation);

  try {
    const result = await fn(traceId);
    endSpan(spanId);
    endTrace(traceId, "completed");
    return result;
  } catch (error) {
    endSpan(spanId);
    endTrace(traceId, "failed");
    throw error;
  }
}
