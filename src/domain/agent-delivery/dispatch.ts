import { contentFingerprint, type JsonValue } from "../knowledge-graph";
import {
  executionPassportSchema,
  verifyPassportValidity,
  type ExecutionPassport,
} from "../control-plane";
import { deliveryTicketSchema, deliveryTicketIdSchema, type DeliveryTicket } from "./schemas";

export class DeliveryBlockedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DeliveryBlockedError";
  }
}

export interface ApprovalDecision {
  approved: boolean;
  approvedBy?: string;
  method?: "human" | "system_auto" | "policy_override";
}

export function dispatchPromptProgram(
  passport: ExecutionPassport,
  targetAgent: string,
  approval?: ApprovalDecision,
): DeliveryTicket {
  const parsedPassport = executionPassportSchema.parse(passport);

  // Step 1: Verify passport signature integrity
  const verification = verifyPassportValidity(parsedPassport);
  if (!verification.valid) {
    throw new DeliveryBlockedError(
      `Passport verification failed: ${verification.reason ?? "unknown reason"}`,
    );
  }

  // Step 2: Determine approval state
  const decision = approval ?? { approved: false };
  const approvalState = decision.approved ? "APPROVED" : ("PENDING" as const);

  // Step 3: If explicitly denied, block delivery
  if (decision.approved === false && approval !== undefined) {
    deliveryTicketSchema.parse({
      ticketId: deliveryTicketIdSchema.parse(
        `ticket_${contentFingerprint({
          passportId: parsedPassport.passportId,
          targetAgent,
        } as unknown as JsonValue)
          .replace("fp_f1_", "")
          .slice(0, 16)}`,
      ),
      passportId: parsedPassport.passportId,
      approvalState: "DENIED",
      approval: null,
      targetAgent,
      status: "blocked",
      payloadSummary: `Delivery blocked: approval denied for passport ${parsedPassport.passportId}`,
      dispatchedAt: null,
      fingerprint: contentFingerprint({
        passportId: parsedPassport.passportId,
        status: "blocked",
      } as unknown as JsonValue),
    });
    throw new DeliveryBlockedError(
      `Delivery denied: approval was explicitly rejected for passport ${parsedPassport.passportId}.`,
    );
  }

  // Step 4: Build the delivery ticket
  const status = approvalState === "APPROVED" ? "dispatched" : "pending_approval";
  const dispatchedAt = approvalState === "APPROVED" ? new Date().toISOString() : null;
  const approvalRecord =
    approvalState === "APPROVED" && decision.approvedBy
      ? {
          approvedBy: decision.approvedBy,
          approvedAt: new Date().toISOString(),
          method: decision.method ?? "system_auto",
        }
      : null;

  return deliveryTicketSchema.parse({
    ticketId: deliveryTicketIdSchema.parse(
      `ticket_${contentFingerprint({
        passportId: parsedPassport.passportId,
        targetAgent,
        status,
        dispatchedAt,
      } as unknown as JsonValue)
        .replace("fp_f1_", "")
        .slice(0, 16)}`,
    ),
    passportId: parsedPassport.passportId,
    approvalState,
    approval: approvalRecord,
    targetAgent,
    status,
    payloadSummary: `Prompt program ${parsedPassport.programId} dispatched to ${targetAgent} (${parsedPassport.certificationId})`,
    dispatchedAt,
    fingerprint: contentFingerprint({
      passportId: parsedPassport.passportId,
      status,
      dispatchedAt,
    } as unknown as JsonValue),
  });
}
