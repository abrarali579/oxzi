import { contentFingerprint, type JsonValue } from "../knowledge-graph";
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

// ── Helpers ────────────────────────────────────────────────────

const suffix = (value: JsonValue) => contentFingerprint(value).replace("fp_f1_", "");

function generateId(prefix: string, seed: JsonValue): string {
  return `${prefix}_${suffix(seed)}`;
}

/**
 * Compute a deterministic "repair prompt" instructing a model how to fix
 * specific validation errors found in its previous output.
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
    "```",
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
    "- Return ONLY the corrected output in the exact same format as the original.",
    "- Do not add explanations, notes, or commentary.",
    "- Preserve all fields and structure that were already correct.",
  ].join("\n");
}

/**
 * Simulate a model call with a repair prompt.
 * In production this would call an actual AI gateway; here we return a
 * deterministic correction by applying known fix patterns.
 */
export function callModelWithRepairPrompt(
  originalOutput: string,
  errors: ValidationError[],
): string {
  let corrected = originalOutput;

  for (const error of errors) {
    const path = error.path.join(".");
    // Known fix: replace empty expected values with placeholders
    if (
      error.code === "too_small" &&
      error.expected === "string" &&
      corrected.includes(`"${path}": ""`)
    ) {
      corrected = corrected.replace(`"${path}": ""`, `"${path}": "placeholder"`);
    }
    // Known fix: replace missing enum values with first valid option
    if (error.code === "invalid_enum_value") {
      const match = error.message.match(/expected '([^']+)'/);
      if (match?.[1]) {
        corrected = corrected.replace(
          new RegExp(`"${path}":\\s*"[^"]*"`),
          `"${path}": "${match[1]}"`,
        );
      }
    }
    // Known fix: wrap bare strings in expected object structure
    if (error.code === "invalid_type" && error.expected === "object") {
      corrected = corrected.replace(
        new RegExp(`"${escapeRegex(path)}":\\s*"[^"]*"`),
        `"${path}": {}`,
      );
    }
  }

  return corrected;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ── Deterministic Normalization (stub from known_normalization) ─

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
 * 4. If still failing, construct a repair prompt and "call the model again".
 * 5. Re-validate; if still failing, escalate to human review.
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

  // ── Step 1: Deterministic parse / normalization ─────────────

  const { normalized, operations: normOps } = deterministicNormalize(rawOutput);
  const { parsed, errors } = tryParse(normalized);

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

  // ── Step 2: Deterministic repair attempt ────────────────────

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

  // ── Step 3: Model-assisted repair ────────────────────────────

  const modelCorrected = callModelWithRepairPrompt(rawOutput, errors);

  const { normalized: correctedNorm } = deterministicNormalize(modelCorrected);
  const { parsed: correctedParsed, errors: correctedErrors } = tryParse(correctedNorm);

  const modelRepair: RepairAttempt = repairAttemptSchema.parse({
    id: generateId("repair_attempt", { invocationId, attempt: 2 }),
    invocationId,
    attemptNumber: 2,
    method: "model_assisted",
    originalHash: contentFingerprint(rawOutput),
    repairedHash: correctedParsed ? contentFingerprint(correctedParsed as JsonValue) : null,
    operations: ["extract_fenced_json", "trim_whitespace"],
    confidence: correctedErrors.length === 0 ? 90 : 40,
    validatorVersion: "typed-ai-validator-v1",
    remainingErrors: correctedErrors,
    result: correctedErrors.length === 0 ? "succeeded" : "failed",
    escalationStatus: "none",
  });
  attempts.push(modelRepair);

  // ── Step 4: Check result ─────────────────────────────────────

  if (correctedErrors.length === 0) {
    return {
      completion: typedCompletionResultSchema.parse({
        invocationId,
        contractId: parsedContract.id,
        status: "success",
        parsedResult: parseResultSchema.parse({
          invocationId,
          status: "normalized",
          parsedValue: correctedParsed as JsonValue,
          rawResponseHash: contentFingerprint(modelCorrected),
          parsedValueHash: contentFingerprint(correctedParsed as JsonValue),
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

  // ── Step 5: Escalate to human review ─────────────────────────

  const escalated = true;
  attempts[attempts.length - 1] = repairAttemptSchema.parse({
    ...modelRepair,
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
        rawResponseHash: contentFingerprint(modelCorrected),
        parsedValueHash: null,
        parserVersion: "typed-ai-parser-v1",
        normalizationOperations: [],
        validationErrors: correctedErrors,
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
