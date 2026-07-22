import { z } from "zod";

const identifier = (prefix: string) =>
  z
    .string()
    .regex(
      new RegExp(`^${prefix}_[a-z0-9]+(?:_[a-z0-9]+)*$`),
      `Must be a ${prefix}-prefixed identifier`,
    );

export const projectIdSchema = identifier("project").brand<"ProjectId">();
export const workspaceIdSchema = identifier("workspace").brand<"WorkspaceId">();
export const fieldIdSchema = identifier("field").brand<"FieldId">();
export const evidenceIdSchema = identifier("evidence").brand<"EvidenceId">();
export const assumptionIdSchema = identifier("assumption").brand<"AssumptionId">();
export const decisionIdSchema = identifier("decision").brand<"DecisionId">();
export const conflictIdSchema = identifier("conflict").brand<"ConflictId">();
export const versionIdSchema = identifier("version").brand<"VersionId">();

export type ProjectId = z.infer<typeof projectIdSchema>;
export type WorkspaceId = z.infer<typeof workspaceIdSchema>;
export type FieldId = z.infer<typeof fieldIdSchema>;
export type EvidenceId = z.infer<typeof evidenceIdSchema>;
export type AssumptionId = z.infer<typeof assumptionIdSchema>;
export type DecisionId = z.infer<typeof decisionIdSchema>;
export type ConflictId = z.infer<typeof conflictIdSchema>;
export type VersionId = z.infer<typeof versionIdSchema>;
