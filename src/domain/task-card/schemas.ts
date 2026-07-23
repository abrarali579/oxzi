import { z } from "zod";

import {
  acceptanceCriterionIdSchema,
  governanceFindingSchema,
  implementationSliceIdSchema,
} from "../governance";
import { contentFingerprintSchema } from "../knowledge-graph";

const nonempty = z.string().trim().min(1);
const refs = z.array(nonempty);
const id = <T extends string>(prefix: string) =>
  z
    .string()
    .regex(new RegExp(`^${prefix}_[a-z0-9]+(?:_[a-z0-9]+)*$`))
    .brand<T>();

export const taskCardIdSchema = id<"TaskCardId">("task_card");

export const fileBoundariesSchema = z
  .object({
    writableFiles: refs,
    readOnlyFiles: refs,
    protectedFiles: refs,
  })
  .strict()
  .superRefine((value, context) => {
    const protectedSet = new Set(value.protectedFiles);
    const writableOverlap = value.writableFiles.filter((entry) => protectedSet.has(entry));
    const readOnlyOverlap = value.readOnlyFiles.filter((entry) => protectedSet.has(entry));
    if (writableOverlap.length > 0)
      context.addIssue({
        code: "custom",
        path: ["writableFiles"],
        message: `Writable files overlap protected files: ${writableOverlap.join(", ")}`,
      });
    if (readOnlyOverlap.length > 0)
      context.addIssue({
        code: "custom",
        path: ["readOnlyFiles"],
        message: `Read-only files overlap protected files: ${readOnlyOverlap.join(", ")}`,
      });
  });

export const taskCardValidationRequirementSchema = z
  .object({
    phase: z.enum(["pre_execution", "post_execution"]),
    command: nonempty,
    required: z.literal(true),
    source: z.enum(["slice", "compiler"]),
  })
  .strict();

export const taskCardSchema = z
  .object({
    taskCardId: taskCardIdSchema,
    sourceSliceId: implementationSliceIdSchema,
    sourceSliceVersion: z.number().int().positive(),
    sourceSliceFingerprint: contentFingerprintSchema,
    technicalPlanId: nonempty,
    technicalPlanVersion: z.number().int().positive(),
    technicalPlanFingerprint: contentFingerprintSchema,
    specificationId: nonempty,
    specificationVersion: z.number().int().positive(),
    specificationFingerprint: contentFingerprintSchema,
    constitutionFingerprint: contentFingerprintSchema,
    goal: nonempty,
    scope: refs.min(1),
    exclusions: refs,
    constraints: refs,
    acceptanceCriteria: z.array(acceptanceCriterionIdSchema).min(1),
    fileBoundaries: fileBoundariesSchema,
    validations: z.array(taskCardValidationRequirementSchema).min(1),
    riskLevel: z.enum(["low", "medium", "high"]),
    prerequisiteTaskRefs: refs,
    artifactOutputRefs: refs,
    rollbackStrategy: nonempty,
    evidenceRefs: refs.min(1),
    compilerVersion: nonempty,
    fingerprint: contentFingerprintSchema,
  })
  .strict();

export const taskCardValidationReportSchema = z
  .object({
    taskCard: taskCardSchema.nullable(),
    sourceSliceId: implementationSliceIdSchema.nullable(),
    status: z.enum(["valid", "blocked"]),
    findings: z.array(governanceFindingSchema),
    compilerVersion: nonempty,
    fingerprint: contentFingerprintSchema,
  })
  .strict();

export type FileBoundaries = z.infer<typeof fileBoundariesSchema>;
export type TaskCardValidationRequirement = z.infer<typeof taskCardValidationRequirementSchema>;
export type TaskCard = z.infer<typeof taskCardSchema>;
export type TaskCardValidationReport = z.infer<typeof taskCardValidationReportSchema>;
