import { z } from "zod";

import { constitutionRuleSchema, specificationIdSchema, specificationSchema } from "../governance";
import { contentFingerprintSchema } from "../knowledge-graph";
import { decisionSchema } from "../project";
import { taskCardIdSchema } from "../task-card";

const nonempty = z.string().trim().min(1);
const refs = z.array(nonempty);
const id = <T extends string>(prefix: string) =>
  z
    .string()
    .regex(new RegExp(`^${prefix}_[a-z0-9]+(?:_[a-z0-9]+)*$`))
    .brand<T>();

export const compiledContextIdSchema = id<"CompiledContextId">("compiled_context");
export const contextItemIdSchema = id<"ContextItemId">("context_item");

export const contextArtifactKindSchema = z.enum(["specification", "decision", "constitution_rule"]);

export const contextSelectionReasonSchema = z.enum([
  "task_specification_reference",
  "task_acceptance_criterion_reference",
  "task_constitution_fingerprint",
  "task_constraint_reference",
  "task_evidence_reference",
  "global_blocking_constitution_rule",
]);

export const contextItemSchema = z
  .object({
    id: contextItemIdSchema,
    artifactKind: contextArtifactKindSchema,
    artifactId: nonempty,
    title: nonempty,
    text: nonempty,
    selectionReasons: z.array(contextSelectionReasonSchema).min(1),
    sourceRefs: refs,
    evidenceRefs: refs,
    fingerprint: contentFingerprintSchema,
  })
  .strict();

export const compiledContextSchema = z
  .object({
    id: compiledContextIdSchema,
    taskCardId: taskCardIdSchema,
    taskCardFingerprint: contentFingerprintSchema,
    mode: z.literal("canonical_v1"),
    items: z.array(contextItemSchema),
    resolvedSpecificationIds: z.array(specificationIdSchema),
    omittedRefs: refs,
    limitationRefs: refs,
    sufficiency: z.enum(["sufficient", "insufficient", "blocked"]),
    metadata: z
      .object({
        compilerVersion: nonempty,
        canonicalOnly: z.literal(true),
        codeAwareCompilation: z.literal(false),
        inclusionPolicy: nonempty,
        minimumSafeContextEstimate: z.number().int().nonnegative(),
      })
      .strict(),
    fingerprint: contentFingerprintSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (value.sufficiency === "sufficient" && value.items.length === 0) {
      context.addIssue({
        code: "custom",
        path: ["items"],
        message: "Sufficient compiled context requires at least one included item",
      });
    }
  });

export const contextCompilerInputSchema = z
  .object({
    taskCard: z.unknown(),
    specifications: z.array(specificationSchema),
    decisions: z.array(decisionSchema).default([]),
    constitutionRules: z.array(constitutionRuleSchema).default([]),
  })
  .strict();

export type ContextSelectionReason = z.infer<typeof contextSelectionReasonSchema>;
export type ContextItem = z.infer<typeof contextItemSchema>;
export type CompiledContext = z.infer<typeof compiledContextSchema>;
export type ContextCompilerInput = z.infer<typeof contextCompilerInputSchema>;
