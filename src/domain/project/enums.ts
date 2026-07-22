import { z } from "zod";

export const fieldStatusSchema = z.enum([
  "missing",
  "inferred",
  "defaulted",
  "confirmed",
  "conflicted",
]);

export const criticalitySchema = z.enum(["blocking", "high", "medium", "low"]);

export const sourceTypeSchema = z.enum([
  "prompt",
  "upload",
  "interview",
  "user_edit",
  "system_default",
]);

export const sourcePrecedenceSchema = z.enum([
  "confirmed_user_edit",
  "interview_answer",
  "explicit_source",
  "accepted_assumption",
  "system_default",
  "model_inference",
]);

export const lifecycleStatusSchema = z.enum([
  "draft",
  "analyzing",
  "discovery_required",
  "discovery_skipped",
  "understanding_review",
  "architecture_ready",
  "bible_generated",
  "approved",
  "in_build",
  "maintained",
]);

export const approvalStatusSchema = z.enum(["not_requested", "pending", "approved", "rejected"]);

export const conflictStatusSchema = z.enum(["open", "resolved", "dismissed"]);
export const assumptionStatusSchema = z.enum(["proposed", "accepted", "rejected", "replaced"]);

export const conflictSeveritySchema = z.enum(["blocking", "high", "medium", "low"]);

export type FieldStatus = z.infer<typeof fieldStatusSchema>;
export type Criticality = z.infer<typeof criticalitySchema>;
export type SourceType = z.infer<typeof sourceTypeSchema>;
export type SourcePrecedence = z.infer<typeof sourcePrecedenceSchema>;
export type LifecycleStatus = z.infer<typeof lifecycleStatusSchema>;
export type ApprovalStatus = z.infer<typeof approvalStatusSchema>;
export type ConflictStatus = z.infer<typeof conflictStatusSchema>;
export type AssumptionStatus = z.infer<typeof assumptionStatusSchema>;
export type ConflictSeverity = z.infer<typeof conflictSeveritySchema>;

export const SOURCE_PRECEDENCE_RANK: Readonly<Record<SourcePrecedence, number>> = {
  confirmed_user_edit: 6,
  interview_answer: 5,
  explicit_source: 4,
  accepted_assumption: 3,
  system_default: 2,
  model_inference: 1,
};
