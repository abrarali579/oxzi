import { z } from "zod";

export const graphNodeTypeSchema = z.enum([
  "project",
  "goal",
  "user_persona",
  "problem",
  "solution",
  "requirement",
  "acceptance_criterion",
  "feature",
  "user_flow",
  "decision",
  "assumption",
  "conflict",
  "risk",
  "architecture_component",
  "integration",
  "api",
  "data_entity",
  "security_invariant",
  "ui_screen",
  "visual_rule",
  "constitutional_rule",
  "technical_plan",
  "implementation_slice",
  "workflow_policy",
  "agent_skill",
  "implementation_module",
  "repository_file",
  "symbol",
  "test",
  "documentation_artifact",
  "task",
  "task_card",
  "execution_passport",
  "execution_record",
  "review_finding",
  "convergence_finding",
  "artifact",
  "episode",
  "escalation",
  "version",
]);

export const graphEdgeTypeSchema = z.enum([
  "depends_on",
  "enables",
  "affects",
  "implements",
  "implemented_by",
  "satisfies",
  "violates",
  "blocked_by",
  "conflicts_with",
  "derived_from",
  "evidenced_by",
  "decided_by",
  "assumed_by",
  "mitigates",
  "secured_by",
  "validated_by",
  "tested_by",
  "documented_in",
  "rendered_as",
  "governed_by",
  "specifies",
  "planned_by",
  "decomposed_into",
  "packaged_as",
  "uses_workflow",
  "requires_skill",
  "executed_by",
  "reviewed_by",
  "converges_with",
  "diverges_from",
  "repairs",
  "escalates_to",
  "reads_from",
  "writes_to",
  "imports",
  "exports",
  "defines",
  "references",
  "calls",
  "precedes",
  "supersedes",
  "relevant_to",
]);

export const traversalDirectionSchema = z.enum(["forward", "reverse"]);
export const impactClassificationSchema = z.enum(["direct", "transitive", "uncertain", "blocking"]);
export const derivationMethodSchema = z.enum([
  "canonical",
  "explicitly_extracted",
  "statically_observed",
  "inferred",
  "user_approved",
  "repository_observed",
  "audit_observed",
  "unresolved",
  "conflicted",
]);
export const temporalStatusSchema = z.enum(["current", "historical", "invalidated", "superseded"]);
export const freshnessStatusSchema = z.enum(["current", "stale", "unknown"]);
export const temporalQueryModeSchema = z.enum(["current", "historical", "all"]);
export const graphIntegrityStatusSchema = z.enum([
  "valid",
  "valid_with_warnings",
  "stale",
  "partially_stale",
  "conflicted",
  "invalid",
  "rebuild_required",
]);
export const mandatoryCoverageStatusSchema = z.enum(["not_assessed", "complete", "incomplete"]);
export const measurementStatusSchema = z.enum([
  "measured",
  "tokenizer_estimated",
  "character_estimated",
  "unavailable",
]);

export type GraphNodeType = z.infer<typeof graphNodeTypeSchema>;
export type GraphEdgeType = z.infer<typeof graphEdgeTypeSchema>;
export type TraversalDirection = z.infer<typeof traversalDirectionSchema>;
export type ImpactClassification = z.infer<typeof impactClassificationSchema>;
export type MandatoryCoverageStatus = z.infer<typeof mandatoryCoverageStatusSchema>;
export type MeasurementStatus = z.infer<typeof measurementStatusSchema>;
export type DerivationMethod = z.infer<typeof derivationMethodSchema>;
export type TemporalStatus = z.infer<typeof temporalStatusSchema>;
export type FreshnessStatus = z.infer<typeof freshnessStatusSchema>;
export type TemporalQueryMode = z.infer<typeof temporalQueryModeSchema>;
export type GraphIntegrityStatus = z.infer<typeof graphIntegrityStatusSchema>;
