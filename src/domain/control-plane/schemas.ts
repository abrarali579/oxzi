import { z } from "zod";

import { stableJson, type JsonValue } from "../knowledge-graph";
import { timestampSchema } from "../project";
import { renderedPromptProgramIdSchema } from "../prompt-renderer";
import { promptCertificationIdSchema } from "../evaluation";

const nonempty = z.string().trim().min(1);
const id = <T extends string>(prefix: string) =>
  z
    .string()
    .regex(new RegExp(`^${prefix}_[a-z0-9]+(?:_[a-z0-9]+)*$`))
    .brand<T>();

export const controlPlanePassportIdSchema = id<"ControlPlanePassportId">("cp_passport");

export const executionPassportSchema = z
  .object({
    passportId: controlPlanePassportIdSchema,
    certificationId: promptCertificationIdSchema,
    programId: renderedPromptProgramIdSchema,
    issuedAt: timestampSchema,
    signature: nonempty,
  })
  .strict();

export function serializeExecutionPassport(
  passport: z.infer<typeof executionPassportSchema>,
): string {
  return stableJson(executionPassportSchema.parse(passport) as unknown as JsonValue);
}

export type ExecutionPassport = z.infer<typeof executionPassportSchema>;
