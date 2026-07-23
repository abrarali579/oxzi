import { z } from "zod";

import { contentFingerprintSchema, stableJson, type JsonValue } from "../knowledge-graph";
import { controlPlanePassportIdSchema } from "../control-plane";

const nonempty = z.string().trim().min(1);
const id = <T extends string>(prefix: string) =>
  z
    .string()
    .regex(new RegExp(`^${prefix}_[a-z0-9]+(?:_[a-z0-9]+)*$`))
    .brand<T>();

export const deliveryTicketIdSchema = id<"DeliveryTicketId">("ticket");

export const approvalRecordSchema = z
  .object({
    approvedBy: nonempty,
    approvedAt: nonempty,
    method: z.enum(["human", "system_auto", "policy_override"]),
  })
  .strict();

export const deliveryTicketSchema = z
  .object({
    ticketId: deliveryTicketIdSchema,
    passportId: controlPlanePassportIdSchema,
    approvalState: z.enum(["PENDING", "APPROVED", "DENIED"]),
    approval: approvalRecordSchema.nullable(),
    targetAgent: nonempty,
    status: z.enum(["dispatched", "blocked", "pending_approval"]),
    payloadSummary: nonempty,
    dispatchedAt: nonempty.nullable(),
    fingerprint: contentFingerprintSchema,
  })
  .strict();

export function serializeDeliveryTicket(ticket: z.infer<typeof deliveryTicketSchema>): string {
  return stableJson(deliveryTicketSchema.parse(ticket) as unknown as JsonValue);
}

export type ApprovalRecord = z.infer<typeof approvalRecordSchema>;
export type DeliveryTicket = z.infer<typeof deliveryTicketSchema>;
