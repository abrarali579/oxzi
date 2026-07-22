import { z } from "zod";

import { contentFingerprintSchema, stableJson, type JsonValue } from "../knowledge-graph";
import { timestampSchema } from "../project";
import { agentSkillIdSchema, agentSkillMetadataSchema, workflowPolicyIdSchema } from "./schemas";

const nonempty = z.string().trim().min(1);
const refs = z.array(nonempty);
const id = <T extends string>(prefix: string) =>
  z
    .string()
    .regex(new RegExp(`^${prefix}_[a-z0-9]+(?:_[a-z0-9]+)*$`))
    .brand<T>();

export const skillSurfaceEvidenceIdSchema = id<"SkillSurfaceEvidenceId">("skill_evidence");
export const skillActivationPlanIdSchema = id<"SkillActivationPlanId">("skill_plan");
export const agentFailureCaptureIdSchema = id<"AgentFailureCaptureId">("failure_capture");
export const diagnosticHypothesisIdSchema = id<"DiagnosticHypothesisId">("diagnostic_hypothesis");
export const recoveryActionIdSchema = id<"RecoveryActionId">("recovery_action");
export const introspectionReportIdSchema = id<"IntrospectionReportId">("introspection");

export const skillAvailabilityClassSchema = z.enum(["daily", "library"]);

export const skillSurfaceEvidenceSchema = z
  .object({
    id: skillSurfaceEvidenceIdSchema,
    skillId: agentSkillIdSchema,
    repositoryRevision: nonempty,
    evidenceType: z.enum([
      "language",
      "framework",
      "package_manager",
      "test_stack",
      "build_stack",
      "deployment",
      "hook",
      "agent_integration",
      "task_history",
      "skill_history",
    ]),
    repositoryEvidenceRefs: refs.min(1),
    stackAligned: z.boolean(),
    freshness: z.enum(["current", "stale", "unknown"]),
    observedAt: timestampSchema,
  })
  .strict();

export const skillSurfaceRecordSchema = z
  .object({
    skill: agentSkillMetadataSchema,
    availability: skillAvailabilityClassSchema,
    evidence: z.array(skillSurfaceEvidenceSchema),
    discoverable: z.literal(true),
    fullInstructionsLoadedByDefault: z.boolean(),
    estimatedActivationOverheadTokens: z.number().int().nonnegative().nullable(),
    compatibility: z.enum(["compatible", "incompatible", "unknown"]),
    conflictRefs: refs,
    lastUsedAt: timestampSchema.nullable(),
    successHistoryRefs: refs,
    recommendation: z.enum(["activate", "available_on_demand", "do_not_activate", "review"]),
    fingerprint: contentFingerprintSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.availability === "daily" &&
      (!value.evidence.some(
        (evidence) => evidence.stackAligned && evidence.freshness === "current",
      ) ||
        value.compatibility !== "compatible")
    )
      context.addIssue({
        code: "custom",
        path: ["availability"],
        message: "DAILY classification requires current repository evidence and compatibility",
      });
    if (value.fullInstructionsLoadedByDefault)
      context.addIssue({
        code: "custom",
        path: ["fullInstructionsLoadedByDefault"],
        message: "Skill instructions load only after activation",
      });
  });

export const skillActivationPlanSchema = z
  .object({
    id: skillActivationPlanIdSchema,
    taskId: nonempty,
    workflowPolicyId: workflowPolicyIdSchema,
    dailySkillIds: z.array(agentSkillIdSchema),
    librarySkillIds: z.array(agentSkillIdSchema),
    activatedSkillIds: z.array(agentSkillIdSchema),
    activationReasons: z.record(agentSkillIdSchema, nonempty),
    totalEstimatedOverheadTokens: z.number().int().nonnegative().nullable(),
    noSkillPathSelected: z.boolean(),
    repositoryEvidenceRefs: refs,
  })
  .strict()
  .superRefine((value, context) => {
    const available = new Set([...value.dailySkillIds, ...value.librarySkillIds]);
    if (value.activatedSkillIds.some((skillId) => !available.has(skillId)))
      context.addIssue({
        code: "custom",
        path: ["activatedSkillIds"],
        message: "Activated skills must exist in the DAILY or LIBRARY inventory",
      });
    if (value.noSkillPathSelected && value.activatedSkillIds.length > 0)
      context.addIssue({
        code: "custom",
        path: ["noSkillPathSelected"],
        message: "No-skill path cannot activate skills",
      });
  });

export const agentFailureCaptureSchema = z
  .object({
    id: agentFailureCaptureIdSchema,
    taskId: nonempty,
    category: z.enum([
      "logic",
      "state",
      "environment",
      "policy",
      "context",
      "tool",
      "provider",
      "repository_freshness",
      "requirement_ambiguity",
    ]),
    failingCommandOrScope: nonempty,
    exactErrorOrFinding: nonempty,
    evidenceRefs: refs.min(1),
    repeatedCount: z.number().int().positive(),
    capturedAt: timestampSchema,
  })
  .strict();

export const diagnosticHypothesisSchema = z
  .object({
    id: diagnosticHypothesisIdSchema,
    failureCaptureId: agentFailureCaptureIdSchema,
    hypothesis: nonempty,
    discriminatingCheck: nonempty,
    expectedEvidence: nonempty,
    confidence: z.number().min(0).max(100),
    status: z.enum(["proposed", "supported", "rejected", "inconclusive"]),
  })
  .strict();

export const recoveryActionSchema = z
  .object({
    id: recoveryActionIdSchema,
    failureCaptureId: agentFailureCaptureIdSchema,
    hypothesisId: diagnosticHypothesisIdSchema,
    action: nonempty,
    actionFingerprint: contentFingerprintSchema,
    reversible: z.boolean(),
    containmentScope: refs.min(1),
    verificationEvidenceRefs: refs.min(1),
    result: z.enum(["succeeded", "failed", "blocked", "not_run"]),
  })
  .strict();

export const introspectionReportSchema = z
  .object({
    id: introspectionReportIdSchema,
    failureCapture: agentFailureCaptureSchema,
    hypotheses: z.array(diagnosticHypothesisSchema).min(1),
    recoveryActions: z.array(recoveryActionSchema),
    verifiedRootCause: nonempty.nullable(),
    remainingUncertainty: refs,
    preventiveInsightProposals: refs,
    status: z.enum(["recovered", "blocked", "escalated", "needs_clarification"]),
    escalationRef: nonempty.nullable(),
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.hypotheses.some((hypothesis) => hypothesis.failureCaptureId !== value.failureCapture.id)
    )
      context.addIssue({
        code: "custom",
        path: ["hypotheses"],
        message: "Diagnostic hypotheses must reference the captured failure",
      });
    const failedFingerprints = new Set<string>();
    let repeatedIdenticalFailure = false;
    for (const action of value.recoveryActions) {
      if (action.result === "failed") {
        if (failedFingerprints.has(action.actionFingerprint)) repeatedIdenticalFailure = true;
        failedFingerprints.add(action.actionFingerprint);
      }
    }
    if (repeatedIdenticalFailure && value.status !== "escalated")
      context.addIssue({
        code: "custom",
        path: ["recoveryActions"],
        message: "Repeated identical failed recovery must escalate",
      });
    if (value.status === "escalated" && !value.escalationRef)
      context.addIssue({
        code: "custom",
        path: ["escalationRef"],
        message: "Escalated diagnostics require an escalation reference",
      });
  });

export function serializeWorkflowIntelligenceContract(input: JsonValue): string {
  return stableJson(input);
}

export type SkillSurfaceEvidence = z.infer<typeof skillSurfaceEvidenceSchema>;
export type SkillSurfaceRecord = z.infer<typeof skillSurfaceRecordSchema>;
export type SkillActivationPlan = z.infer<typeof skillActivationPlanSchema>;
export type AgentFailureCapture = z.infer<typeof agentFailureCaptureSchema>;
export type DiagnosticHypothesis = z.infer<typeof diagnosticHypothesisSchema>;
export type RecoveryAction = z.infer<typeof recoveryActionSchema>;
export type IntrospectionReport = z.infer<typeof introspectionReportSchema>;
