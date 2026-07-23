import { contentFingerprint, type JsonValue } from "../knowledge-graph";
import { callGateway, type GatewayRequest } from "../../lib/ai/gateway";
import {
  aiContractDefinitionSchema,
  parseResultSchema,
  repairAttemptSchema,
  typedCompletionResultSchema,
  type AiContractDefinition,
  type ParseResult,
  type RepairAttempt,
  type ValidationError,
  type TypedCompletionResult,
} from "./schemas";

// ── Constants ──────────────────────────────────────────────────

const MAX_MODEL_ASSISTED_RETRIES = 2;
const REPAIR_TEMPERATURE = 0;

// ── Helpers ────────────────────────────────────────────────────

const suffix = (value: JsonValue) => contentFingerprint(value).replace("fp_f1_", "");

function generateId(prefix: string, seed: JsonValue): string {
  return `${prefix}_${suffix(seed)}`;
}

/**
 * Construct a repair prompt that shows the AI its previous malformed output
 * plus the exact Zod validation errors. Used for model-assisted repair.
 */
export function buildRepairPrompt(
  originalOutput: string,
  errors: ValidationError[],
): string {
  const errorLines = errors
    .map(
      (e, i) =>
        `${i + 1}. [${e.path.join(".")}] ${e.code}: ${e.message}` +
        (e.expected ? ` (expected: ${e.expected})` : "") +
        (e.received ? ` (received: ${e.received})` : ""),
    )
    .join("\n");

  return [
    "## Repair Instructions",
    "",
    "The following output failed validation. Please correct the specific errors below.",
    "",
    "### Original Output",
    "",
    "```json",
    originalOutput,
    "```",
    "",
    "### Validation Errors",
    "",
    errorLines,
    "",
    "### Requirements",
    "",
    "- Fix each validation error listed above.",
    "- Return ONLY the corrected JSON output in the exact same format.",
    "- Do not add explanations, notes, or commentary.",
    "- Preserve all fields and structure that were already correct.",
    "- Ensure the output is valid JSON.",
  ].join("\n");
}

// ── Deterministic Normalization ─────────────────────────────────

function deterministicNormalize(raw: string): {
  normalized: string;
  operations: string[];
} {
  const operations: string[] = [];
  let normalized = raw.trim();

  // Extract fenced JSON if present
  const jsonMatch = normalized.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch?.[1]) {
    normalized = jsonMatch[1].trim();
    operations.push("extract_fenced_json");
  }

  // Trim harmless trailing whitespace
  if (normalized !== raw.trim()) {
    operations.push("trim_whitespace");
  }

  return { normalized, operations };
}

function tryParse(output: string): { parsed: unknown; errors: ValidationError[] } {
  const errors: ValidationError[] = [];
  let parsed: unknown;

  try {
    parsed = JSON.parse(output);
  } catch {
    errors.push({
      path: [],
      code: "parse_error",
      message: "Output is not valid JSON",
      expected: "valid JSON",
      received: output.slice(0, 100),
      blocking: true,
    });
    return { parsed: null, errors };
  }

  // If it's an array, wrap in object for validation
  if (Array.isArray(parsed)) {
    parsed = { items: parsed };
  }

  return { parsed, errors };
}

// ── Public API ──────────────────────────────────────────────────

export interface RepairResult {
  completion: TypedCompletionResult;
  attempts: RepairAttempt[];
  escalated: boolean;
}

/**
 * Run the full deterministic-then-model-assisted repair pipeline:
 *
 * 1. Parse the raw AI output.
 * 2. If parse/validation passes, return success.
 * 3. If validation fails, apply deterministic normalization.
 * 4. If still failing, construct a repair prompt and call the provider
 *    gateway with temperature=0 for stability.
 * 5. Re-validate; if still failing, retry up to MAX_MODEL_ASSISTED_RETRIES.
 * 6. If all retries exhausted, mark invocation as BLOCKED and escalate
 *    to human review — never silently invent data.
 */
export function runRepairPipeline(
  contract: AiContractDefinition,
  rawOutput: string,
): RepairResult {
  const parsedContract = aiContractDefinitionSchema.parse(contract);
  const invocationId = `ai_invocation_${suffix({
    contractId: parsedContract.id,
    timestamp: Date.now(),
  } satisfies Record<string, JsonValue>)}`;

  const attempts: RepairAttempt[] = [];

  // ──────────────────────────────────────────────────────────────
  // Step 1: Deterministic parse / normalization
  // ──────────────────────────────────────────────────────────────

  const { normalized, operations: normOps } = deterministicNormalize(rawOutput);
  let currentOutput = normalized;
  let { parsed, errors } = tryParse(normalized);

  const firstParse: ParseResult = parseResultSchema.parse({
    invocationId,
    status: errors.length === 0 ? "exact" : "invalid",
    parsedValue: parsed as JsonValue | null,
    rawResponseHash: contentFingerprint(rawOutput),
    parsedValueHash: parsed ? contentFingerprint(parsed as JsonValue) : null,
    parserVersion: "typed-ai-parser-v1",
    normalizationOperations: normOps,
    validationErrors: errors,
  });

  // If parsing succeeded, return immediately
  if (errors.length === 0) {
    return {
      completion: typedCompletionResultSchema.parse({
        invocationId,
        contractId: parsedContract.id,
        status: "success",
        parsedResult: firstParse,
        repairAttempts: [],
        repairLimit: parsedContract.retryPolicy.maxAttempts,
        escalationStatus: "none",
        partialState: null,
        finalCertified: true,
        normalizedOutputArtifactRef: `artifact:output:${invocationId}`,
        evidenceRefs: ["evidence:parse_success"],
      }),
      attempts: [],
      escalated: false,
    };
  }

  // ──────────────────────────────────────────────────────────────
  // Step 2: Deterministic repair attempt
  // ──────────────────────────────────────────────────────────────

  const detRepair: RepairAttempt = repairAttemptSchema.parse({
    id: generateId("repair_attempt", { invocationId, attempt: 1 }),
    invocationId,
    attemptNumber: 1,
    method: "deterministic",
    originalHash: contentFingerprint(rawOutput),
    repairedHash: null,
    operations: normOps.length > 0 ? normOps : ["trim_whitespace"],
    confidence: normOps.length > 0 ? 80 : 30,
    validatorVersion: "typed-ai-validator-v1",
    remainingErrors: errors,
    result: errors.length > 0 ? "failed" : "succeeded",
    escalationStatus: "none",
  });
  attempts.push(detRepair);

  if (errors.length === 0) {
    // Already fixed by deterministic normalization
    return {
      completion: typedCompletionResultSchema.parse({
        invocationId,
        contractId: parsedContract.id,
        status: "success",
        parsedResult: { ...firstParse, status: "normalized" },
        repairAttempts: attempts,
        repairLimit: parsedContract.retryPolicy.maxAttempts,
        escalationStatus: "none",
        partialState: null,
        finalCertified: true,
        normalizedOutputArtifactRef: `artifact:output:${invocationId}`,
        evidenceRefs: ["evidence:deterministic_repair"],
      }),
      attempts,
      escalated: false,
    };
  }

  // ──────────────────────────────────────────────────────────────
  // Step 3: Model-assisted repair (up to MAX_MODEL_ASSISTED_RETRIES)
  // ──────────────────────────────────────────────────────────────

  for (let retry = 0; retry < MAX_MODEL_ASSISTED_RETRIES; retry++) {
    const repairPrompt = buildRepairPrompt(currentOutput, errors);

    // Call the provider gateway with temperature=0 for deterministic correction
    const gatewayRequest: GatewayRequest = {
      systemPrompt: "You are a JSON repair assistant. Fix validation errors precisely.",
      userMessage: repairPrompt,
      temperature: REPAIR_TEMPERATURE,
    };

    const gatewayResponse = callGateway(gatewayRequest, { temperature: REPAIR_TEMPERATURE });

    // Parse the gateway response
    const { normalized: correctedNorm } = deterministicNormalize(gatewayResponse.content);
    currentOutput = correctedNorm;
    const result = tryParse(correctedNorm);
    parsed = result.parsed;
    errors = result.errors;

    const modelRepair: RepairAttempt = repairAttemptSchema.parse({
      id: generateId("repair_attempt", { invocationId, attempt: attempts.length + 1 }),
      invocationId,
      attemptNumber: attempts.length + 1,
      method: "model_assisted",
      originalHash: contentFingerprint(currentOutput),
      repairedHash: parsed ? contentFingerprint(parsed as JsonValue) : null,
      operations: ["extract_fenced_json", "trim_whitespace"],
      confidence: errors.length === 0 ? 90 : 40 - retry * 15,
      validatorVersion: "typed-ai-validator-v1",
      remainingErrors: errors,
      result: errors.length === 0 ? "succeeded" : "failed",
      escalationStatus: "none",
    });
    attempts.push(modelRepair);

    // If this retry succeeded, return success
    if (errors.length === 0) {
      return {
        completion: typedCompletionResultSchema.parse({
          invocationId,
          contractId: parsedContract.id,
          status: "success",
          parsedResult: parseResultSchema.parse({
            invocationId,
            status: "normalized",
            parsedValue: parsed as JsonValue,
            rawResponseHash: contentFingerprint(gatewayResponse.content),
            parsedValueHash: contentFingerprint(parsed as JsonValue),
            parserVersion: "typed-ai-parser-v1",
            normalizationOperations: ["extract_fenced_json", "trim_whitespace"],
            validationErrors: [],
          }),
          repairAttempts: attempts,
          repairLimit: parsedContract.retryPolicy.maxAttempts,
          escalationStatus: "none",
          partialState: null,
          finalCertified: true,
          normalizedOutputArtifactRef: `artifact:output:${invocationId}`,
          evidenceRefs: ["evidence:model_assisted_repair"],
        }),
        attempts,
        escalated: false,
      };
    }
  }

  // ──────────────────────────────────────────────────────────────
  // Step 4: Escalate to human review (BLOCKED)
  //    After MAX_MODEL_ASSISTED_RETRIES failures, mark as BLOCKED.
  //    Never silently invent data.
  // ──────────────────────────────────────────────────────────────

  attempts[attempts.length - 1] = repairAttemptSchema.parse({
    ...attempts[attempts.length - 1]!,
    escalationStatus: "escalated",
  });

  return {
    completion: typedCompletionResultSchema.parse({
      invocationId,
      contractId: parsedContract.id,
      status: "failed",
      parsedResult: parseResultSchema.parse({
        invocationId,
        status: "invalid",
        parsedValue: null,
        rawResponseHash: contentFingerprint(currentOutput),
        parsedValueHash: null,
        parserVersion: "typed-ai-parser-v1",
        normalizationOperations: [],
        validationErrors: errors,
      }),
      repairAttempts: attempts,
      repairLimit: parsedContract.retryPolicy.maxAttempts,
      escalationStatus: "escalated",
      partialState: null,
      finalCertified: false,
      normalizedOutputArtifactRef: null,
      evidenceRefs: ["evidence:repair_exhausted"],
    }),
    attempts,
    escalated: true,
  };
}

