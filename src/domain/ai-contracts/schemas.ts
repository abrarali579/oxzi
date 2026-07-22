import { z } from "zod";

import {
  contentFingerprint,
  contentFingerprintSchema,
  jsonValueSchema,
  stableJson,
  type JsonValue,
} from "../knowledge-graph";
import { timestampSchema } from "../project";

const nonempty = z.string().trim().min(1);
const refs = z.array(nonempty);
const id = <T extends string>(prefix: string) =>
  z
    .string()
    .regex(new RegExp(`^${prefix}_[a-z0-9]+(?:_[a-z0-9]+)*$`))
    .brand<T>();

export const aiContractIdSchema = id<"AiContractId">("ai_contract");
export const aiInvocationIdSchema = id<"AiInvocationId">("ai_invocation");
export const repairAttemptIdSchema = id<"RepairAttemptId">("repair_attempt");

export const aiContractDefinitionSchema = z
  .object({
    id: aiContractIdSchema,
    version: z.number().int().positive(),
    targetOperation: z.enum([
      "extraction",
      "clarification",
      "graph_enrichment",
      "technical_planning",
      "implementation_slicing",
      "task_card_generation",
      "prompt_certification",
      "divergent_reasoning",
      "execution_report",
      "audit_finding",
      "convergence_finding",
      "optimization_candidate",
      "evaluation_result",
    ]),
    inputSchemaRef: nonempty,
    outputSchemaRef: nonempty,
    providerCompatibilityRefs: refs,
    strictnessPolicy: z.enum(["strict", "strict_with_known_normalization"]),
    partialResultPolicy: z.enum(["forbidden", "display_only", "recoverable_artifact"]),
    validationPolicyRef: nonempty,
    repairPolicyRef: nonempty,
    retryPolicy: z
      .object({ maxAttempts: z.number().int().min(0).max(5), escalateOnExhaustion: z.boolean() })
      .strict(),
    privacyClassification: z.enum(["public", "internal", "confidential", "restricted"]),
    evidenceRequirements: refs,
    fingerprint: contentFingerprintSchema,
  })
  .strict();

export const aiContractInvocationSchema = z
  .object({
    id: aiInvocationIdSchema,
    contractId: aiContractIdSchema,
    contractVersion: z.number().int().positive(),
    inputArtifactRef: nonempty,
    providerAdapterRef: nonempty,
    providerRequestArtifactRef: nonempty,
    rawResponseArtifactRef: nonempty.nullable(),
    status: z.enum(["prepared", "running", "received", "parsing", "completed", "failed"]),
    startedAt: timestampSchema,
    completedAt: timestampSchema.nullable(),
  })
  .strict();

export const validationErrorSchema = z
  .object({
    path: z.array(z.union([z.string(), z.number().int().nonnegative()])),
    code: nonempty,
    message: nonempty,
    expected: nonempty.nullable(),
    received: nonempty.nullable(),
    blocking: z.boolean(),
  })
  .strict();

export const parseResultSchema = z
  .object({
    invocationId: aiInvocationIdSchema,
    status: z.enum(["exact", "normalized", "partial", "invalid"]),
    parsedValue: jsonValueSchema.nullable(),
    rawResponseHash: contentFingerprintSchema,
    parsedValueHash: contentFingerprintSchema.nullable(),
    parserVersion: nonempty,
    normalizationOperations: refs,
    validationErrors: z.array(validationErrorSchema),
  })
  .strict()
  .superRefine((value, context) => {
    if (["exact", "normalized"].includes(value.status) && value.parsedValue === null)
      context.addIssue({
        code: "custom",
        path: ["parsedValue"],
        message: "Successful parse results require a structured value",
      });
    if (value.status === "invalid" && value.validationErrors.length === 0)
      context.addIssue({
        code: "custom",
        path: ["validationErrors"],
        message: "Invalid parse results require validation errors",
      });
  });

export const repairAttemptSchema = z
  .object({
    id: repairAttemptIdSchema,
    invocationId: aiInvocationIdSchema,
    attemptNumber: z.number().int().positive(),
    method: z.enum(["deterministic", "model_assisted"]),
    originalHash: contentFingerprintSchema,
    repairedHash: contentFingerprintSchema.nullable(),
    operations: z
      .array(
        z.enum([
          "extract_fenced_json",
          "trim_whitespace",
          "remove_trailing_separator",
          "map_known_field_alias",
          "map_known_enum_alias",
          "normalize_primitive_representation",
        ]),
      )
      .min(1),
    confidence: z.number().min(0).max(100),
    validatorVersion: nonempty,
    remainingErrors: z.array(validationErrorSchema),
    result: z.enum(["succeeded", "failed", "partial"]),
    escalationStatus: z.enum(["none", "required", "escalated"]),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.result === "succeeded" && value.remainingErrors.length > 0)
      context.addIssue({
        code: "custom",
        path: ["remainingErrors"],
        message: "Successful repair cannot retain validation errors",
      });
  });

export const partialCompletionStateSchema = z
  .object({
    invocationId: aiInvocationIdSchema,
    state: z.enum(["streaming", "interrupted", "recoverable", "abandoned"]),
    partialArtifactRefs: refs,
    receivedFragmentIds: refs,
    duplicateFragmentIds: refs,
    requiredFieldPathsMissing: refs,
    finalValidationPending: z.literal(true),
  })
  .strict();

export const typedCompletionResultSchema = z
  .object({
    invocationId: aiInvocationIdSchema,
    contractId: aiContractIdSchema,
    status: z.enum(["success", "partial", "blocked", "failed"]),
    parsedResult: parseResultSchema,
    repairAttempts: z.array(repairAttemptSchema),
    repairLimit: z.number().int().min(0).max(5),
    escalationStatus: z.enum(["none", "required", "escalated"]),
    partialState: partialCompletionStateSchema.nullable(),
    finalCertified: z.boolean(),
    normalizedOutputArtifactRef: nonempty.nullable(),
    evidenceRefs: refs,
  })
  .strict()
  .superRefine((value, context) => {
    if (value.finalCertified && value.status !== "success")
      context.addIssue({
        code: "custom",
        path: ["finalCertified"],
        message: "Partial, blocked, or failed output cannot pass final certification",
      });
    if (value.status === "partial" && value.partialState === null)
      context.addIssue({
        code: "custom",
        path: ["partialState"],
        message: "Partial completion requires explicit partial state",
      });
    if (
      value.status !== "success" &&
      value.repairAttempts.length >= value.repairLimit &&
      value.repairLimit > 0 &&
      value.escalationStatus === "none"
    )
      context.addIssue({
        code: "custom",
        path: ["escalationStatus"],
        message: "Exhausted repair attempts require escalation",
      });
  });

export const deterministicNormalizationPolicySchema = z
  .object({
    fieldAliases: z.record(nonempty, nonempty),
    enumAliases: z.record(nonempty, z.record(nonempty, nonempty)),
    trimStrings: z.boolean(),
  })
  .strict();

export function normalizeKnownStructuredOutput(
  input: unknown,
  policyInput: unknown,
): { value: JsonValue; operations: string[]; fingerprint: string } {
  const value = jsonValueSchema.parse(input);
  const policy = deterministicNormalizationPolicySchema.parse(policyInput);
  if (value === null || Array.isArray(value) || typeof value !== "object")
    throw new Error("Known field normalization requires a JSON object");

  const output: Record<string, JsonValue> = {};
  const operations: string[] = [];
  for (const [originalKey, originalValue] of Object.entries(value)) {
    const key = policy.fieldAliases[originalKey] ?? originalKey;
    if (key in output) throw new Error(`Field alias collision at ${key}`);
    let next = originalValue;
    if (typeof next === "string" && policy.trimStrings && next !== next.trim()) {
      next = next.trim();
      operations.push(`trim:${key}`);
    }
    const enumAlias = typeof next === "string" ? policy.enumAliases[key]?.[next] : undefined;
    if (enumAlias !== undefined) {
      next = enumAlias;
      operations.push(`enum:${key}`);
    }
    if (key !== originalKey) operations.push(`field:${originalKey}->${key}`);
    output[key] = next;
  }
  return {
    value: output,
    operations: operations.sort(),
    fingerprint: contentFingerprint(output).toString(),
  };
}

export function serializeAiContract(input: JsonValue): string {
  return stableJson(input);
}

export type AiContractDefinition = z.infer<typeof aiContractDefinitionSchema>;
export type AiContractInvocation = z.infer<typeof aiContractInvocationSchema>;
export type ParseResult = z.infer<typeof parseResultSchema>;
export type ValidationError = z.infer<typeof validationErrorSchema>;
export type RepairAttempt = z.infer<typeof repairAttemptSchema>;
export type PartialCompletionState = z.infer<typeof partialCompletionStateSchema>;
export type TypedCompletionResult = z.infer<typeof typedCompletionResultSchema>;
