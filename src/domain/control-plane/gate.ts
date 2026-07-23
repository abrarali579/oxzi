import { contentFingerprint, type JsonValue } from "../knowledge-graph";
import { promptCertificationSchema, type PromptCertification } from "../evaluation";
import {
  executionPassportSchema,
  controlPlanePassportIdSchema,
  type ExecutionPassport,
} from "./schemas";

export class PassportIssuanceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PassportIssuanceError";
  }
}

export function issueExecutionPassport(
  certification: PromptCertification,
  options?: { issuedAt?: string },
): ExecutionPassport {
  const parsed = promptCertificationSchema.parse(certification);

  if (parsed.status !== "CERTIFIED") {
    throw new PassportIssuanceError(
      `Cannot issue passport: prompt certification status is "${parsed.status}" with reason: ${parsed.reason}. Only CERTIFIED programs qualify for execution.`,
    );
  }

  const payload = {
    certificationId: parsed.certificationId,
    programId: parsed.programId,
    issuedAt: options?.issuedAt ?? new Date().toISOString(),
  };

  const signature = contentFingerprint(payload as unknown as JsonValue);

  const passportId = controlPlanePassportIdSchema.parse(
    `cp_passport_${signature.replace("fp_f1_", "").slice(0, 16)}`,
  );

  return executionPassportSchema.parse({
    passportId,
    certificationId: parsed.certificationId,
    programId: parsed.programId,
    issuedAt: payload.issuedAt,
    signature,
  });
}

export function verifyPassportValidity(passport: ExecutionPassport): boolean {
  const { certificationId, programId, issuedAt } = passport;
  const expectedSignature = contentFingerprint({
    certificationId,
    programId,
    issuedAt,
  } as unknown as JsonValue);
  return passport.signature === expectedSignature;
}
