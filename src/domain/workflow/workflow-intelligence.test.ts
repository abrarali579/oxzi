import { describe, expect, it } from "vitest";

import { contentFingerprint } from "../knowledge-graph";
import { introspectionReportSchema, recoveryActionSchema, skillSurfaceRecordSchema } from ".";

const now = "2026-07-23T00:00:00.000Z";
const fingerprint = contentFingerprint({ skill: "review" });
const skill = {
  id: "skill_review",
  name: "Focused review",
  version: "1.0.0",
  activationConditions: ["review task"],
  compatibleTaskTypes: ["review"],
  incompatibleConditions: [],
  riskLevel: "low" as const,
  requiredInputs: ["diff"],
  requiredTools: [],
  supportedAgentProfileRefs: ["agent:local"],
  estimatedContextOverhead: { value: 100, status: "character_estimated" as const },
  outputContractRef: "contract:review",
  approvalPolicyRef: "manual",
  evaluationStatus: "evaluated" as const,
};
const evidence = {
  id: "skill_evidence_review",
  skillId: "skill_review",
  repositoryRevision: "abc123",
  evidenceType: "task_history" as const,
  repositoryEvidenceRefs: ["repo:test:review"],
  stackAligned: true,
  freshness: "current" as const,
  observedAt: now,
};
const failure = {
  id: "failure_capture_build",
  taskId: "task:build",
  category: "environment" as const,
  failingCommandOrScope: "npm run build",
  exactErrorOrFinding: "Operation not permitted",
  evidenceRefs: ["log:build"],
  repeatedCount: 2,
  capturedAt: now,
};
const hypothesis = {
  id: "diagnostic_hypothesis_ipc",
  failureCaptureId: failure.id,
  hypothesis: "Sandbox blocks local IPC",
  discriminatingCheck: "Run with approved build permission",
  expectedEvidence: "Build succeeds outside sandbox",
  confidence: 90,
  status: "supported" as const,
};
const recovery = {
  id: "recovery_action_build",
  failureCaptureId: failure.id,
  hypothesisId: hypothesis.id,
  action: "Rerun build with approved permission",
  actionFingerprint: contentFingerprint({ action: "approved build" }),
  reversible: true,
  containmentScope: ["build process"],
  verificationEvidenceRefs: ["log:build-success"],
  result: "succeeded" as const,
};

describe("Selective skill and self-diagnostic contracts", () => {
  it("requires repository evidence for DAILY classification", () => {
    const record = {
      skill,
      availability: "daily",
      evidence: [],
      discoverable: true,
      fullInstructionsLoadedByDefault: false,
      estimatedActivationOverheadTokens: 100,
      compatibility: "compatible",
      conflictRefs: [],
      lastUsedAt: now,
      successHistoryRefs: ["run:1"],
      recommendation: "activate",
      fingerprint,
    };
    expect(() => skillSurfaceRecordSchema.parse(record)).toThrow(
      /requires current repository evidence/,
    );
  });

  it("keeps LIBRARY skills discoverable", () => {
    const result = skillSurfaceRecordSchema.parse({
      skill,
      availability: "library",
      evidence: [],
      discoverable: true,
      fullInstructionsLoadedByDefault: false,
      estimatedActivationOverheadTokens: 100,
      compatibility: "unknown",
      conflictRefs: [],
      lastUsedAt: null,
      successHistoryRefs: [],
      recommendation: "available_on_demand",
      fingerprint,
    });
    expect(result.discoverable).toBe(true);
  });

  it("rejects off-stack DAILY classification", () => {
    expect(() =>
      skillSurfaceRecordSchema.parse({
        skill,
        availability: "daily",
        evidence: [{ ...evidence, stackAligned: false }],
        discoverable: true,
        fullInstructionsLoadedByDefault: false,
        estimatedActivationOverheadTokens: 100,
        compatibility: "compatible",
        conflictRefs: [],
        lastUsedAt: null,
        successHistoryRefs: [],
        recommendation: "review",
        fingerprint,
      }),
    ).toThrow();
  });

  it("requires a captured failure in diagnostic reports", () => {
    expect(() =>
      introspectionReportSchema.parse({
        id: "introspection_build",
        hypotheses: [hypothesis],
        recoveryActions: [],
        verifiedRootCause: null,
        remainingUncertainty: [],
        preventiveInsightProposals: [],
        status: "blocked",
        escalationRef: null,
      }),
    ).toThrow();
  });

  it("requires identical failed recovery attempts to escalate", () => {
    const failed = { ...recovery, result: "failed" as const };
    expect(() =>
      introspectionReportSchema.parse({
        id: "introspection_build",
        failureCapture: failure,
        hypotheses: [hypothesis],
        recoveryActions: [failed, { ...failed, id: "recovery_action_build_again" }],
        verifiedRootCause: null,
        remainingUncertainty: ["sandbox"],
        preventiveInsightProposals: [],
        status: "blocked",
        escalationRef: null,
      }),
    ).toThrow(/must escalate/);
  });

  it("requires verification evidence for contained recovery", () => {
    expect(() =>
      recoveryActionSchema.parse({ ...recovery, verificationEvidenceRefs: [] }),
    ).toThrow();
  });
});
