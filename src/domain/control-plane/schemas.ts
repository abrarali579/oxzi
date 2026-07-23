import { z } from "zod";

import { stableJson, type JsonValue } from "../knowledge-graph";
import { timestampSchema } from "../project";
import { renderedPromptProgramIdSchema, agentProfileIdSchema } from "../prompt-renderer";
import { promptCertificationIdSchema } from "../evaluation";
import { taskCardIdSchema } from "../task-card";

const nonempty = z.string().trim().min(1);
const refs = z.array(nonempty);
const id = <T extends string>(prefix: string) =>
  z
    .string()
    .regex(new RegExp(`^${prefix}_[a-z0-9]+(?:_[a-z0-9]+)*$`))
    .brand<T>();

export const controlPlanePassportIdSchema = id<"ControlPlanePassportId">("cp_passport");

export const passportStatusSchema = z.enum(["ACTIVE", "EXPIRED", "REVOKED"]);

export const passportScopeSchema = z
  .object({
    writableFiles: refs,
    readOnlyFiles: refs,
    forbiddenFiles: refs,
  })
  .strict();

export const passportLimitsSchema = z
  .object({
    maxTokens: z.number().int().nonnegative(),
    maxTimeMs: z.number().int().nonnegative(),
  })
  .strict();

export const executionPassportSchema = z
  .object({
    passportId: controlPlanePassportIdSchema,
    certificationId: promptCertificationIdSchema,
    programId: renderedPromptProgramIdSchema,
    taskCardId: taskCardIdSchema,
    agentId: agentProfileIdSchema,
    scope: passportScopeSchema,
    limits: passportLimitsSchema,
    issuedAt: timestampSchema,
    expiresAt: timestampSchema,
    status: passportStatusSchema,
    signature: nonempty,
  })
  .strict();

export const passportVerificationResultSchema = z
  .object({
    valid: z.boolean(),
    reason: nonempty.nullable(),
    passport: executionPassportSchema.nullable(),
  })
  .strict();

export function serializeExecutionPassport(passport: ExecutionPassport): string {
  return stableJson(executionPassportSchema.parse(passport) as unknown as JsonValue);
}

export type ExecutionPassport = z.infer<typeof executionPassportSchema>;
export type PassportScope = z.infer<typeof passportScopeSchema>;
export type PassportLimits = z.infer<typeof passportLimitsSchema>;
export type PassportStatus = z.infer<typeof passportStatusSchema>;
export type PassportVerificationResult = z.infer<typeof passportVerificationResultSchema>;
