import { z } from "zod";
import { measurementStatusSchema } from "../knowledge-graph";

const workflowPolicyIdSchema = z
  .string()
  .regex(/^workflow_[a-z0-9]+(?:_[a-z0-9]+)*$/)
  .brand<"WorkflowPolicyId">();
const agentSkillIdSchema = z
  .string()
  .regex(/^skill_[a-z0-9]+(?:_[a-z0-9]+)*$/)
  .brand<"AgentSkillId">();
const nonempty = z.string().trim().min(1);
export const workflowPolicySchema = z
  .object({
    id: workflowPolicyIdSchema,
    version: nonempty,
    type: z.enum([
      "clarification",
      "brainstorming",
      "specification",
      "technical_planning",
      "architecture_review",
      "implementation",
      "test_first_implementation",
      "investigation",
      "systematic_debugging",
      "refactoring",
      "migration",
      "security_review",
      "documentation",
      "verification",
      "compliance_review",
      "engineering_quality_review",
      "repair",
      "escalation",
    ]),
    activationConditions: z.array(nonempty).min(1),
    validationStrategyRequired: z.boolean(),
    outputContractRef: nonempty,
    approvalRequired: z.boolean(),
  })
  .strict();
export const agentSkillMetadataSchema = z
  .object({
    id: agentSkillIdSchema,
    name: nonempty,
    version: nonempty,
    activationConditions: z.array(nonempty).min(1),
    compatibleTaskTypes: z.array(nonempty).min(1),
    incompatibleConditions: z.array(nonempty),
    riskLevel: z.enum(["low", "medium", "high"]),
    requiredInputs: z.array(nonempty),
    requiredTools: z.array(nonempty),
    supportedAgentProfileRefs: z.array(nonempty),
    estimatedContextOverhead: z
      .object({ value: z.number().int().nonnegative().nullable(), status: measurementStatusSchema })
      .strict(),
    outputContractRef: nonempty,
    approvalPolicyRef: nonempty,
    evaluationStatus: z.enum(["unverified", "evaluated", "approved", "deprecated"]),
  })
  .strict();
export const skillActivationResultSchema = z
  .object({
    skillId: agentSkillIdSchema,
    activated: z.boolean(),
    reason: nonempty,
    matchedConditions: z.array(nonempty),
    overhead: z
      .object({ value: z.number().int().nonnegative().nullable(), status: measurementStatusSchema })
      .strict(),
    policyId: workflowPolicyIdSchema,
  })
  .strict();
export const escalationRecordSchema = z
  .object({
    id: z.string().regex(/^escalation_[a-z0-9]+(?:_[a-z0-9]+)*$/),
    taskId: nonempty,
    attemptNumber: z.number().int().positive(),
    hypothesis: nonempty,
    previousFailedEvidenceRefs: z.array(nonempty).min(1),
    changeSummary: nonempty,
    result: nonempty,
    remainingUncertainty: z.array(nonempty),
    outcome: z.enum([
      "architecture_investigation",
      "requirement_clarification",
      "environment_investigation",
      "dependency_investigation",
      "security_review",
      "human_intervention",
      "blocked",
    ]),
  })
  .strict();
export type WorkflowPolicy = z.infer<typeof workflowPolicySchema>;
export type AgentSkillMetadata = z.infer<typeof agentSkillMetadataSchema>;
export type SkillActivationResult = z.infer<typeof skillActivationResultSchema>;
export type EscalationRecord = z.infer<typeof escalationRecordSchema>;
