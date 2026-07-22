import { describe, expect, it } from "vitest";

import { contentFingerprint } from "./knowledge-graph";
import { oxzire3dWebsiteFixture } from "./project";
import {
  acceptanceCriterionSchema,
  constitutionRuleSchema,
  convergenceFindingSchema,
  specificationSchema,
  technicalPlanReferenceSchema,
} from "./governance";
import {
  agentSkillMetadataSchema,
  escalationRecordSchema,
  skillActivationResultSchema,
} from "./workflow";
import {
  agentCapabilityProfileSchema,
  artifactReferenceSchema,
  conversationStatusSchema,
  executionEventLogSchema,
  executionPassportSchema,
  executionStatusSchema,
  normalizedTaskCardSchema,
  runtimeStatusSchema,
  tokenLedgerRecordSchema,
} from "./execution";

const now = "2026-07-23T00:00:00.000Z";
const fingerprint = contentFingerprint({ contract: "fixture" });
const projectId = oxzire3dWebsiteFixture.metadata.projectId;
const versionId = oxzire3dWebsiteFixture.metadata.version.id;
const temporal = {
  observedAt: now,
  sourceCreatedAt: now,
  ingestedAt: now,
  effectiveFrom: now,
  effectiveTo: null,
  invalidatedAt: null,
  supersededAt: null,
  supersededBy: null,
  currentStatus: "current" as const,
};
const criterion = {
  id: "criterion_login",
  statement: "A user can sign in",
  specificationId: "spec_auth",
  sourceRefs: ["source:1"],
  evidenceRefs: ["evidence:1"],
  verificationRefs: ["test:auth"],
  approvalStatus: "approved",
};
const task = {
  id: "task_card_auth",
  projectId,
  projectVersionId: versionId,
  taskType: "implementation",
  goal: "Implement authentication",
  reason: "Approved slice",
  specificationRefs: ["spec_auth"],
  planRefs: ["plan_auth"],
  constitutionRuleRefs: ["constitution_rule_security"],
  graphSeedIds: [],
  repositorySeeds: ["src/auth.ts"],
  affectedNodeIds: [],
  expectedAffectedFiles: ["src/auth.ts"],
  editableScope: ["src/auth.ts"],
  readOnlyScope: [],
  prohibitedScope: [".env"],
  dependencies: [],
  constraints: ["No secrets in prompts"],
  acceptanceCriteriaRefs: ["criterion_login"],
  validationCommands: ["npm test"],
  risks: [],
  workflowPolicyRef: "workflow_implementation",
  requiredSkillRefs: [],
  expectedOutputs: ["code"],
  outputContractRef: "contract:implementation",
  deferredWork: [],
  recommendedCommitMessage: "feat: add auth",
  contextSufficiency: "sufficient",
  tokenEstimate: 1000,
  approvalState: "approved",
  freshness: "current",
};

describe("governance contracts", () => {
  it("accepts current and superseded Constitution rules", () => {
    const base = {
      id: "constitution_rule_security",
      projectId,
      title: "Protect secrets",
      description: "Never expose credential values",
      category: "security",
      severity: "blocking",
      applicability: ["all"],
      sourceRefs: ["adr:1"],
      evidenceRefs: ["evidence:1"],
      approvalStatus: "approved",
      effectiveVersion: versionId,
      temporal,
      verificationMethod: "secret scan",
      violationConsequence: "block certification",
      freshness: "current",
      fingerprint,
    };
    expect(constitutionRuleSchema.parse(base).id).toBe(base.id);
    expect(
      constitutionRuleSchema.parse({
        ...base,
        temporal: {
          ...temporal,
          currentStatus: "superseded",
          effectiveTo: "2026-08-01T00:00:00.000Z",
          supersededAt: "2026-08-01T00:00:00.000Z",
        },
      }).temporal.currentStatus,
    ).toBe("superseded");
  });
  it("rejects invalid approval state", () => {
    const value = {
      id: "constitution_rule_security",
      projectId,
      title: "Protect secrets",
      description: "Never expose credentials",
      category: "security",
      severity: "blocking",
      applicability: ["all"],
      sourceRefs: ["adr:1"],
      evidenceRefs: [],
      approvalStatus: "auto_approved",
      effectiveVersion: versionId,
      temporal,
      verificationMethod: "scan",
      violationConsequence: "block",
      freshness: "current",
      fingerprint,
    };
    expect(() => constitutionRuleSchema.parse(value)).toThrow();
  });
  it("requires acceptance-criterion evidence and specification traceability", () => {
    expect(acceptanceCriterionSchema.parse(criterion).specificationId).toBe("spec_auth");
    const spec = {
      id: "spec_auth",
      projectId,
      version: 1,
      title: "Authentication",
      what: ["Sign in"],
      why: ["Protect accounts"],
      actors: ["user"],
      outcomes: ["session"],
      constraints: [],
      scope: ["login"],
      exclusions: [],
      acceptanceCriteria: [criterion],
      sourceRefs: ["source:1"],
      evidenceRefs: ["evidence:1"],
      approvalStatus: "approved",
      fingerprint,
    };
    expect(specificationSchema.parse(spec).acceptanceCriteria).toHaveLength(1);
    expect(() =>
      specificationSchema.parse({
        ...spec,
        acceptanceCriteria: [{ ...criterion, evidenceRefs: [] }],
      }),
    ).toThrow();
  });
  it("keeps Specification, Plan, and Task boundaries explicit", () => {
    expect(
      technicalPlanReferenceSchema.parse({
        id: "plan_auth",
        specificationId: "spec_auth",
        version: 1,
        componentRefs: ["module:auth"],
        interfaceRefs: [],
        dependencyRefs: [],
        securityRefs: ["constitution_rule_security"],
        testStrategyRefs: ["test:auth"],
        approvalStatus: "approved",
        fingerprint,
      }).specificationId,
    ).toBe("spec_auth");
    expect(normalizedTaskCardSchema.parse(task).planRefs).toEqual(["plan_auth"]);
    expect(() => normalizedTaskCardSchema.parse({ ...task, specificationRefs: [] })).toThrow();
  });
  it("requires evidence for convergence findings", () => {
    const finding = {
      id: "convergence_auth",
      requirementOrRuleId: "criterion_login",
      affectedNodeIds: [],
      expectedState: "implemented",
      observedState: "missing",
      evidenceRefs: ["review:1"],
      confidence: 100,
      severity: "blocking",
      classification: "missing_implementation",
      recommendedAction: "repair",
      approvalRequired: true,
    };
    expect(convergenceFindingSchema.parse(finding).evidenceRefs).toHaveLength(1);
    expect(() => convergenceFindingSchema.parse({ ...finding, evidenceRefs: [] })).toThrow();
  });
});

describe("workflow contracts", () => {
  const skill = {
    id: "skill_review",
    name: "Focused review",
    version: "1.0.0",
    activationConditions: ["review task"],
    compatibleTaskTypes: ["review"],
    incompatibleConditions: [],
    riskLevel: "low",
    requiredInputs: ["diff"],
    requiredTools: [],
    supportedAgentProfileRefs: ["agent_profile_local"],
    estimatedContextOverhead: { value: 100, status: "character_estimated" },
    outputContractRef: "contract:review",
    approvalPolicyRef: "manual",
    evaluationStatus: "evaluated",
  };
  it("keeps concise skill metadata separate from full instructions", () => {
    expect(agentSkillMetadataSchema.parse(skill).name).toBe("Focused review");
    expect(() =>
      agentSkillMetadataSchema.parse({ ...skill, instructions: "full method" }),
    ).toThrow();
  });
  it("records activation reason and overhead", () => {
    const result = skillActivationResultSchema.parse({
      skillId: "skill_review",
      activated: true,
      reason: "Review task",
      matchedConditions: ["review task"],
      overhead: { value: 100, status: "character_estimated" },
      policyId: "workflow_review",
    });
    expect(result.overhead.value).toBe(100);
  });
  it("requires previous failed evidence for escalation", () => {
    const record = {
      id: "escalation_auth",
      taskId: "task_card_auth",
      attemptNumber: 3,
      hypothesis: "Environment mismatch",
      previousFailedEvidenceRefs: ["event:2"],
      changeSummary: "Investigated runtime",
      result: "Still failing",
      remainingUncertainty: ["provider"],
      outcome: "environment_investigation",
    };
    expect(escalationRecordSchema.parse(record).attemptNumber).toBe(3);
    expect(() =>
      escalationRecordSchema.parse({ ...record, previousFailedEvidenceRefs: [] }),
    ).toThrow();
  });
});

describe("execution contracts", () => {
  const profile = {
    id: "agent_profile_local",
    revision: 1,
    integrationType: "manual_copy",
    instructionFiles: ["AGENTS.md"],
    promptStyles: ["agent_optimized"],
    structuredInput: true,
    structuredOutput: true,
    contextWindow: null,
    tokenizerRef: null,
    modelProfileRef: null,
    toolProfileRef: null,
    mcpProfileRef: null,
    workflowDefaultsRef: null,
    promptPreferenceRef: null,
    qualityMode: "quality_first",
    approvalPolicyRef: "manual",
    capabilities: {
      planMode: true,
      sessionReset: true,
      compaction: true,
      contextInspection: false,
      costInspection: false,
      artifacts: true,
      directDelivery: false,
      executionMonitoring: false,
      pauseResume: false,
      stopCancel: false,
      subAgents: false,
      readOnlyContext: true,
      patchEdits: true,
    },
    sandboxRequirements: [],
    fingerprint,
  };
  it("keeps Task Cards distinct and requires Passport Task Card references", () => {
    expect(normalizedTaskCardSchema.parse(task).id).toBe("task_card_auth");
    const passport = {
      id: "passport_auth",
      projectId,
      canonicalVersionId: versionId,
      graphVersion: "2.0.0",
      repositoryRevision: "abc123",
      taskCardId: "task_card_auth",
      targetAgent: { profileId: "agent_profile_local", revision: 1, fingerprint },
      workflowPolicyRef: "workflow_implementation",
      requiredSkillRefs: [],
      compiledContextArtifactId: "artifact_context",
      editableScope: ["src/auth.ts"],
      readOnlyScope: [],
      restrictedScope: [".env"],
      acceptanceCriteriaRefs: ["criterion_login"],
      validationCommands: ["npm test"],
      outputContractRef: "contract:implementation",
      artifactDestination: ".review/",
      tokenBudget: 2000,
      freshness: "current",
      approval: "approved",
      expiresAt: null,
      securityClassification: "internal",
      fingerprint,
    };
    expect(executionPassportSchema.parse(passport).taskCardId).toBe(task.id);
    expect(() => executionPassportSchema.parse({ ...passport, taskCardId: undefined })).toThrow();
  });
  it("records exact agent profile revisions", () => {
    expect(agentCapabilityProfileSchema.parse(profile).revision).toBe(1);
  });
  it("keeps conversation, execution, and runtime statuses separate", () => {
    expect(conversationStatusSchema.safeParse("queued").success).toBe(false);
    expect(executionStatusSchema.safeParse("queued").success).toBe(true);
    expect(runtimeStatusSchema.safeParse("running").success).toBe(true);
  });
  it("enforces event ordering and artifact safety", () => {
    const event = {
      id: "event_start",
      executionId: "execution_auth",
      timestamp: now,
      sequence: 0,
      type: "agent_started",
      actor: "user",
      source: "manual",
      payloadArtifactId: null,
      redactionStatus: "not_required",
      hash: `sha256:${"a".repeat(64)}`,
      parentEventId: null,
      visibility: "project",
      evidenceStatus: "observed",
    };
    expect(executionEventLogSchema.parse([event])).toHaveLength(1);
    expect(() => executionEventLogSchema.parse([{ ...event, sequence: 2 }])).toThrow();
    const artifact = {
      id: "artifact_report",
      type: "review",
      contentLocation: "artifacts/review.md",
      hash: `sha256:${"b".repeat(64)}`,
      version: "1",
      producer: "review-engine",
      projectId,
      executionId: "execution_auth",
      privacyClassification: "internal",
      freshness: "current",
      retention: "project",
      verificationStatus: "verified",
    };
    expect(artifactReferenceSchema.parse(artifact).id).toBe("artifact_report");
    expect(() =>
      artifactReferenceSchema.parse({ ...artifact, contentLocation: ".env.production" }),
    ).toThrow();
  });
  it("validates Token Ledger measurement and honest savings", () => {
    const ledger = {
      executionId: "execution_auth",
      categories: { task: { tokens: 100, status: "measured_by_target_tokenizer" } },
      baselineTokens: 200,
      compiledTokens: 100,
      grossSaving: 100,
      optimizationOverhead: 20,
      netSaving: 80,
      mandatoryCoverage: true,
      qualityResult: "passed",
      reworkResult: "none",
    };
    expect(tokenLedgerRecordSchema.parse(ledger).netSaving).toBe(80);
    expect(() => tokenLedgerRecordSchema.parse({ ...ledger, mandatoryCoverage: false })).toThrow();
  });
  it("parses identical records deterministically", () => {
    expect(JSON.stringify(normalizedTaskCardSchema.parse(task))).toBe(
      JSON.stringify(normalizedTaskCardSchema.parse(structuredClone(task))),
    );
  });
});
