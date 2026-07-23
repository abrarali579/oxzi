import { contentFingerprint, type JsonValue } from "../knowledge-graph";
import {
  executionPassportSchema,
  verifyPassportValidity,
  type ExecutionPassport,
} from "../control-plane";
import {
  deliveryTicketSchema,
  deliveryTicketIdSchema,
  humanApprovalRecordSchema,
  type DeliveryTicket,
  type HumanApprovalRecord,
} from "./schemas";

export class DeliveryBlockedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DeliveryBlockedError";
  }
}

export class InsufficientApprovalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InsufficientApprovalError";
  }
}

export interface ApprovalDecision {
  approved: boolean;
  approvedBy?: string;
  method?: "human" | "system_auto" | "policy_override";
}

// ── Risk-based approval requirements ───────────────────────────

const RISK_REQUIRES_HUMAN_APPROVAL: ReadonlySet<string> = new Set(["high", "critical"]);
const RISK_REQUIRED_ROLE: Record<string, string[]> = {
  low: ["owner", "admin", "member", "viewer"],
  medium: ["owner", "admin", "member"],
  high: ["owner", "admin"],
  critical: ["owner"],
};

/**
 * Verify that a human approval record satisfies the risk gate.
 * HIGH/CRITICAL risk requires explicit HumanApprovalRecord with appropriate role.
 */
function verifyApprovalGate(
  riskLevel: string,
  approval?: ApprovalDecision,
  humanRecord?: HumanApprovalRecord,
): { approved: boolean; reason?: string } {
  if (RISK_REQUIRES_HUMAN_APPROVAL.has(riskLevel)) {
    if (!approval?.approved) {
      return { approved: false, reason: `High-risk task (${riskLevel}) requires explicit human approval.` };
    }
    if (!humanRecord) {
      return {
        approved: false,
        reason: `High-risk task (${riskLevel}) requires a HumanApprovalRecord with approvedBy, role, and organizationId.`,
      };
    }
    try {
      humanApprovalRecordSchema.parse(humanRecord);
    } catch {
      return { approved: false, reason: "HumanApprovalRecord failed schema validation." };
    }
    const allowedRoles = RISK_REQUIRED_ROLE[riskLevel] ?? ["owner"];
    if (!allowedRoles.includes(humanRecord.role)) {
      return {
        approved: false,
        reason: `Insufficient role "${humanRecord.role}" for risk level "${riskLevel}". Required: ${allowedRoles.join(" or ")}.`,
      };
    }
    const expectedSig = contentFingerprint({
      approvedBy: humanRecord.approvedBy,
      role: humanRecord.role,
      organizationId: humanRecord.organizationId,
    } as unknown as JsonValue);
    if (humanRecord.signature !== expectedSig) {
      return { approved: false, reason: "Approval signature mismatch — record may be forged." };
    }
  }
  return { approved: approval?.approved ?? false };
}

export function dispatchPromptProgram(
  passport: ExecutionPassport,
  targetAgent: string,
  approval?: ApprovalDecision,
  humanRecord?: HumanApprovalRecord,
  riskLevel?: string,
): DeliveryTicket {
  const parsedPassport = executionPassportSchema.parse(passport);

  // Step 1: Verify passport signature integrity
  const verification = verifyPassportValidity(parsedPassport);
  if (!verification.valid) {
    throw new DeliveryBlockedError(
      `Passport verification failed: ${verification.reason ?? "unknown reason"}`,
    );
  }

  // Step 2: Risk-based approval gate
  const effectiveRisk = riskLevel ?? "low";
  const gateResult = verifyApprovalGate(effectiveRisk, approval, humanRecord);

  if (!gateResult.approved) {
    if (!approval) {
      // No approval info provided — mark as pending for high-risk tasks
      return deliveryTicketSchema.parse({
        ticketId: deliveryTicketIdSchema.parse(
          `ticket_${contentFingerprint({
            passportId: parsedPassport.passportId,
            targetAgent,
          } as unknown as JsonValue).replace("fp_f1_", "").slice(0, 16)}`,
        ),
        passportId: parsedPassport.passportId,
        approvalState: "PENDING",
        approval: null,
        targetAgent,
        status: "pending_approval",
        payloadSummary: `Awaiting ${effectiveRisk}-risk approval for passport ${parsedPassport.passportId}`,
        dispatchedAt: null,
        fingerprint: contentFingerprint({
          passportId: parsedPassport.passportId,
          status: "pending_approval",
        } as unknown as JsonValue),
      });
    }
    const isExplicitDenial = approval?.approved === false;
    throw new DeliveryBlockedError(
      isExplicitDenial
        ? `Delivery denied: approval was explicitly rejected for passport ${parsedPassport.passportId}.`
        : `Delivery blocked: ${gateResult.reason ?? "Approval gate not satisfied."}`,
    );
  }

  // Step 3: Build the delivery ticket
  const approvalRecord = approval?.approved
    ? {
        approvedBy: approval.approvedBy ?? "system",
        approvedAt: new Date().toISOString(),
        method: approval.method ?? "system_auto",
      }
    : null;

  return deliveryTicketSchema.parse({
    ticketId: deliveryTicketIdSchema.parse(
      `ticket_${contentFingerprint({
        passportId: parsedPassport.passportId,
        targetAgent,
        status: "dispatched",
      } as unknown as JsonValue).replace("fp_f1_", "").slice(0, 16)}`,
    ),
    passportId: parsedPassport.passportId,
    approvalState: "APPROVED",
    approval: approvalRecord,
    targetAgent,
    status: "dispatched",
    payloadSummary: `Prompt program ${parsedPassport.programId} dispatched to ${targetAgent} (${parsedPassport.certificationId})`,
    dispatchedAt: new Date().toISOString(),
    fingerprint: contentFingerprint({
      passportId: parsedPassport.passportId,
      targetAgent,
      status: "dispatched",
    } as unknown as JsonValue),
  });
}
