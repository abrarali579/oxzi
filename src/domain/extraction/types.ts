import { z } from "zod";

import {
  criticalitySchema,
  evidenceIdSchema,
  fieldEvidenceSchema,
  fieldIdSchema,
} from "../project";

export const extractionSourceKindSchema = z.enum([
  "plain_text",
  "master_prompt",
  "uploaded_notes",
  "ai_conversation",
]);

export const extractionSourceSchema = z
  .object({
    sourceId: z.string().trim().min(1),
    kind: extractionSourceKindSchema,
    content: z.string().trim().min(1),
    capturedAt: z.string().datetime({ offset: true }),
    languageHint: z.string().trim().min(2).optional(),
  })
  .strict();

export const extractionRequestSchema = z
  .object({
    sources: z.array(extractionSourceSchema).min(1),
    existingProject: z.unknown().optional(),
  })
  .strict();

const targetUserValueSchema = z
  .object({
    name: z.string().trim().min(1),
    needs: z.array(z.string().trim().min(1)).min(1),
    painPoints: z.array(z.string().trim().min(1)),
  })
  .strict();

const goalValueSchema = z
  .object({
    name: z.string().trim().min(1),
    outcome: z.string().trim().min(1),
    priority: z.enum(["primary", "secondary"]),
  })
  .strict();

const featureValueSchema = z
  .object({
    name: z.string().trim().min(1),
    description: z.string().trim().min(1),
    priority: z.enum(["must", "should", "could"]),
    acceptanceCriteria: z.array(z.string().trim().min(1)).min(1),
  })
  .strict();

const integrationValueSchema = z
  .object({
    name: z.string().trim().min(1),
    purpose: z.string().trim().min(1),
    direction: z.enum(["inbound", "outbound", "bidirectional"]),
    required: z.boolean(),
  })
  .strict();

const riskValueSchema = z
  .object({
    name: z.string().trim().min(1),
    impact: criticalitySchema,
    mitigation: z.string().trim().min(1),
  })
  .strict();

const nonEmptyString = z.string().trim().min(1);

export const EXTRACTABLE_CANONICAL_VALUE_SCHEMAS = {
  "identity.name": nonEmptyString,
  "identity.oneLiner": nonEmptyString,
  "identity.projectType": z.enum([
    "website",
    "saas_application",
    "automation_system",
    "internal_tool",
    "other",
  ]),
  "business.problem": nonEmptyString,
  "business.solution": nonEmptyString,
  "business.targetUsers": z.array(targetUserValueSchema),
  "business.goals": z.array(goalValueSchema),
  "scope.inScope": z.array(nonEmptyString),
  "scope.outOfScope": z.array(nonEmptyString),
  "scope.constraints": z.array(nonEmptyString),
  "scope.assumptionSummaries": z.array(nonEmptyString),
  "product.platforms": z.array(nonEmptyString),
  "product.features": z.array(featureValueSchema),
  "visual.personality": z.array(nonEmptyString),
  "visual.visualKeywords": z.array(nonEmptyString),
  "visual.avoidList": z.array(nonEmptyString),
  "visual.themes": z.array(nonEmptyString),
  "visual.colors": z.array(nonEmptyString),
  "technical.preferredStack": z.array(nonEmptyString),
  "technical.integrations": z.array(integrationValueSchema),
  "technical.security": z.array(nonEmptyString),
  "technical.privacy": z.array(nonEmptyString),
  "technical.deployment": nonEmptyString,
  "quality.localization": z.array(nonEmptyString),
  "execution.risks": z.array(riskValueSchema),
} as const;

export const extractableFieldPathSchema = z.enum(
  Object.keys(EXTRACTABLE_CANONICAL_VALUE_SCHEMAS) as [
    keyof typeof EXTRACTABLE_CANONICAL_VALUE_SCHEMAS,
    ...(keyof typeof EXTRACTABLE_CANONICAL_VALUE_SCHEMAS)[],
  ],
);

export const extractionExplicitnessSchema = z.enum(["explicit", "inferred"]);
export const updateDispositionSchema = z.enum(["proposed", "blocked_conflict", "blocked_approved"]);

export const updateSourceSchema = z
  .object({
    sourceId: z.string().trim().min(1),
    kind: extractionSourceKindSchema,
    speaker: z.enum(["user", "assistant", "unknown"]),
  })
  .strict();

export const canonicalFieldUpdateSchema = z
  .object({
    updateId: z.string().regex(/^update_[a-z0-9_]+$/),
    fieldPath: extractableFieldPathSchema,
    fieldId: fieldIdSchema.optional(),
    value: z.unknown(),
    confidence: z.number().min(0).max(100),
    evidence: z.array(fieldEvidenceSchema).min(1),
    evidenceIds: z.array(evidenceIdSchema).min(1),
    sources: z.array(updateSourceSchema).min(1),
    reasoning: z.array(z.string().trim().min(1)).min(1),
    explicitness: extractionExplicitnessSchema,
    status: z.enum(["confirmed", "inferred"]),
    disposition: updateDispositionSchema,
  })
  .strict()
  .superRefine((update, context) => {
    const valueSchema = EXTRACTABLE_CANONICAL_VALUE_SCHEMAS[update.fieldPath];
    const result = valueSchema.safeParse(update.value);
    if (!result.success) {
      context.addIssue({
        code: "custom",
        path: ["value"],
        message: `Value does not match canonical field ${update.fieldPath}: ${result.error.issues
          .map((issue) => issue.message)
          .join(", ")}`,
      });
    }
    if (new Set(update.evidenceIds).size !== update.evidenceIds.length) {
      context.addIssue({
        code: "custom",
        path: ["evidenceIds"],
        message: "Evidence references must be unique",
      });
    }
  });

export const extractionConflictSchema = z
  .object({
    conflictId: z.string().regex(/^conflict_extract_[a-z0-9_]+$/),
    fieldPaths: z.array(extractableFieldPathSchema).min(1),
    candidateUpdateIds: z.array(z.string().regex(/^update_[a-z0-9_]+$/)).min(2),
    evidenceIds: z.array(evidenceIdSchema).min(1),
    severity: criticalitySchema,
    reason: z.string().trim().min(1),
  })
  .strict();

export const protectedFieldSchema = z
  .object({
    fieldPath: extractableFieldPathSchema,
    fieldId: fieldIdSchema,
    updateId: z.string().regex(/^update_[a-z0-9_]+$/),
    reason: z.string().trim().min(1),
  })
  .strict();

export const extractionResultSchema = z
  .object({
    updates: z.array(canonicalFieldUpdateSchema),
    conflicts: z.array(extractionConflictSchema),
    protectedFields: z.array(protectedFieldSchema),
    sourceCount: z.number().int().positive(),
    segmentCount: z.number().int().nonnegative(),
    unmatchedSegmentCount: z.number().int().nonnegative(),
  })
  .strict();

export type ExtractionSourceKind = z.infer<typeof extractionSourceKindSchema>;
export type ExtractionSource = z.infer<typeof extractionSourceSchema>;
export type ExtractionRequest = z.infer<typeof extractionRequestSchema>;
export type ExtractableFieldPath = z.infer<typeof extractableFieldPathSchema>;
export type ExtractionExplicitness = z.infer<typeof extractionExplicitnessSchema>;
export type CanonicalFieldUpdate = z.infer<typeof canonicalFieldUpdateSchema>;
export type ExtractionConflict = z.infer<typeof extractionConflictSchema>;
export type ExtractionResult = z.infer<typeof extractionResultSchema>;
