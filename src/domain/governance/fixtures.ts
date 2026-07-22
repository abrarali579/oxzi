import { contentFingerprint, canonicalProjectFingerprint } from "../knowledge-graph";
import { oxzire3dWebsiteFixture } from "../project";
import { calculateNormalizedSpecificationFingerprint } from "./normalizer";
import {
  constitutionExceptionIdSchema,
  specificationRequirementIdSchema,
  specificationGovernanceInputSchema,
  traceabilityLinkIdSchema,
  type SpecificationGovernanceInput,
} from "./runtime-schemas";
import { acceptanceCriterionIdSchema, constitutionRuleIdSchema } from "./schemas";

const now = "2026-07-23T00:00:00.000Z";
const canonical = oxzire3dWebsiteFixture;
const canonicalFingerprint = canonicalProjectFingerprint(canonical);
const placeholder = contentFingerprint({ placeholder: true });
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

function finalize(input: SpecificationGovernanceInput): SpecificationGovernanceInput {
  const fingerprint = calculateNormalizedSpecificationFingerprint(input);
  return specificationGovernanceInputSchema.parse({
    ...input,
    specification: { ...input.specification, fingerprint },
  });
}

function clone(input: SpecificationGovernanceInput): SpecificationGovernanceInput {
  return structuredClone(input);
}

const baseInput = specificationGovernanceInputSchema.parse({
  canonicalProject: canonical,
  specification: {
    id: "spec_governance",
    projectId: canonical.metadata.projectId,
    version: 1,
    title: "Governed project export",
    what: ["Export one approved project package"],
    why: ["Provide a portable project handoff"],
    actors: ["project owner"],
    outcomes: ["verified export artifact"],
    constraints: ["Do not expose secrets"],
    scope: ["Markdown export"],
    exclusions: ["Automatic deployment"],
    acceptanceCriteria: [
      {
        id: "criterion_export",
        statement: "The exported package passes the configured validation command",
        specificationId: "spec_governance",
        sourceRefs: ["source:brief"],
        evidenceRefs: ["evidence:export"],
        verificationRefs: ["validation:npm-test"],
        approvalStatus: "approved",
      },
    ],
    sourceRefs: ["source:brief"],
    evidenceRefs: ["evidence:spec"],
    approvalStatus: "approved",
    fingerprint: placeholder,
  },
  requirements: [
    {
      id: "requirement_export",
      specificationId: "spec_governance",
      statement: "The project owner exports one validated Markdown package",
      actor: "project owner",
      action: "exports",
      object: "validated Markdown package",
      successCondition: "configured validation command exits successfully",
      failureBehavior: "report the failed command and preserve the prior artifact",
      edgeCaseBehavior: "omit unavailable optional sections without placeholders",
      kind: "product_requirement",
      scopeState: "included",
      acceptanceCriterionIds: ["criterion_export"],
      decisionRefs: [],
      dependencyRequirementIds: [],
      externalDependencyRefs: ["dependency:filesystem"],
      riskRefs: ["risk:secret-exposure"],
      contradictsRequirementIds: [],
      contradictoryCriterionIds: [],
      unresolvedQuestions: [],
      privacyClassification: "internal",
      dataOwner: "project owner",
      authorityRef: "authority:project-owner",
      approvalBoundaryRef: "approval:manual",
      criticality: "blocking",
      approvalStatus: "approved",
      sourceRefs: ["source:brief"],
      evidenceRefs: ["evidence:export"],
      freshness: "current",
    },
  ],
  revision: {
    lifecycle: "readiness_requested",
    canonicalVersionId: canonical.metadata.version.id,
    canonicalFingerprint,
    createdAt: now,
    approvedAt: now,
    supersededAt: null,
    staleSince: null,
    parentSpecificationVersion: null,
    parentSpecificationFingerprint: null,
    amendmentReason: null,
    completedEvidenceRefs: [],
    humanApprovalRequired: true,
    sourceFingerprints: [contentFingerprint({ source: "brief" })],
    dependencyFingerprints: [contentFingerprint({ dependency: "filesystem" })],
  },
  constitutionVersion: "constitution-1.0.0",
  constitutionRules: [
    {
      rule: {
        id: "constitution_rule_testing",
        projectId: canonical.metadata.projectId,
        title: "Verify required behavior",
        description: "Every mandatory criterion requires deterministic verification",
        category: "quality",
        severity: "blocking",
        applicability: ["specification"],
        sourceRefs: ["adr:testing"],
        evidenceRefs: ["evidence:constitution"],
        approvalStatus: "approved",
        effectiveVersion: canonical.metadata.version.id,
        temporal,
        verificationMethod: "inspect acceptance verification references",
        violationConsequence: "add deterministic verification evidence",
        freshness: "current",
        fingerprint: contentFingerprint({ rule: "testing" }),
      },
      authority: "global",
      policyKey: "testing_requirements",
      subject: "mandatory acceptance verification",
      effect: "require",
    },
  ],
  constitutionExceptions: [],
  complianceEvidence: [
    {
      ruleId: "constitution_rule_testing",
      status: "pass",
      evidenceRefs: ["validation:npm-test"],
      affectedEntityIds: ["criterion_export"],
      explanation: "The criterion has an explicit validation reference.",
    },
  ],
  technicalPlans: [],
  implementationSlices: [],
  taskCards: [],
  traceabilityLinks: [
    {
      id: "trace_link_requirement_spec",
      fromType: "requirement",
      fromId: "requirement_export",
      toType: "specification",
      toId: "spec_governance",
      relationship: "specified_by",
      evidenceRefs: ["evidence:spec"],
      approvalStatus: "approved",
      freshness: "current",
    },
  ],
  validationRefs: [],
  reviewRefs: [],
  convergenceFindingRefs: [],
  artifactRefs: [],
  evaluationTimestamp: now,
});

export const implementationReadySpecificationFixture = finalize(baseInput);

export const structurallyIncompleteSpecificationFixture = (() => {
  const value = clone(implementationReadySpecificationFixture);
  value.requirements[0]!.acceptanceCriterionIds = [];
  return finalize(value);
})();

export const ambiguousRequirementSpecificationFixture = (() => {
  const value = clone(implementationReadySpecificationFixture);
  value.requirements[0]!.actor = null;
  return finalize(value);
})();

export const constitutionViolationSpecificationFixture = (() => {
  const value = clone(implementationReadySpecificationFixture);
  value.complianceEvidence[0]!.status = "fail";
  value.complianceEvidence[0]!.explanation = "No configured verification can prove the outcome.";
  return finalize(value);
})();

export const unknownConstitutionEvidenceSpecificationFixture = (() => {
  const value = clone(implementationReadySpecificationFixture);
  value.complianceEvidence = [];
  return finalize(value);
})();

export const contradictoryRequirementsSpecificationFixture = (() => {
  const value = clone(implementationReadySpecificationFixture);
  value.specification.acceptanceCriteria.push({
    id: acceptanceCriterionIdSchema.parse("criterion_no_export"),
    statement: "No export artifact is created",
    specificationId: value.specification.id,
    sourceRefs: ["source:conflict"],
    evidenceRefs: ["evidence:conflict"],
    verificationRefs: ["validation:no-export"],
    approvalStatus: "approved",
  });
  value.requirements[0]!.contradictsRequirementIds = [
    specificationRequirementIdSchema.parse("requirement_no_export"),
  ];
  value.requirements.push({
    ...value.requirements[0]!,
    id: specificationRequirementIdSchema.parse("requirement_no_export"),
    statement: "The system must never create an export artifact",
    action: "prevents",
    object: "export artifacts",
    successCondition: "no export artifact exists",
    acceptanceCriterionIds: [acceptanceCriterionIdSchema.parse("criterion_no_export")],
    contradictsRequirementIds: [specificationRequirementIdSchema.parse("requirement_export")],
    sourceRefs: ["source:conflict"],
    evidenceRefs: ["evidence:conflict"],
  });
  return finalize(value);
})();

export const brokenTraceabilitySpecificationFixture = (() => {
  const value = clone(implementationReadySpecificationFixture);
  value.traceabilityLinks.push({
    id: traceabilityLinkIdSchema.parse("trace_link_broken"),
    fromType: "requirement",
    fromId: "requirement_export",
    toType: "decision",
    toId: "decision_missing",
    relationship: "decided_by",
    evidenceRefs: ["evidence:missing"],
    approvalStatus: "approved",
    freshness: "current",
  });
  return finalize(value);
})();

export const staleSpecificationEvaluationFixture = (() => {
  const value = clone(implementationReadySpecificationFixture);
  value.revision.staleSince = "2026-07-24T00:00:00.000Z";
  return finalize(value);
})();

export const unauthorizedExceptionSpecificationFixture = (() => {
  const value = clone(implementationReadySpecificationFixture);
  value.constitutionExceptions.push({
    id: constitutionExceptionIdSchema.parse("constitution_exception_testing"),
    ruleId: constitutionRuleIdSchema.parse("constitution_rule_testing"),
    specificationId: value.specification.id,
    specificationVersion: value.specification.version,
    approvalStatus: "pending",
    approvedBy: null,
    approvedAt: null,
    justification: "Testing is temporarily unavailable",
    evidenceRefs: ["evidence:exception-request"],
    fingerprint: contentFingerprint({ exception: "testing" }),
  });
  return finalize(value);
})();

export const draftAmendmentSpecificationFixture = (() => {
  const previous = clone(implementationReadySpecificationFixture);
  const next = clone(implementationReadySpecificationFixture);
  next.specification.version = 2;
  next.specification.approvalStatus = "pending";
  next.specification.title = "Governed project export amendment";
  next.revision.lifecycle = "draft";
  next.revision.approvedAt = null;
  next.revision.parentSpecificationVersion = previous.specification.version;
  next.revision.parentSpecificationFingerprint = previous.specification.fingerprint;
  next.revision.amendmentReason = "Clarify export failure behavior";
  return { previous, next: finalize(next) };
})();

export const unverifiableAcceptanceSpecificationFixture = (() => {
  const value = clone(implementationReadySpecificationFixture);
  value.specification.acceptanceCriteria[0]!.statement = "The export works well";
  value.specification.acceptanceCriteria[0]!.verificationRefs = [];
  return finalize(value);
})();

export const nonBlockingWarningSpecificationFixture = (() => {
  const value = clone(implementationReadySpecificationFixture);
  value.requirements[0]!.criticality = "low";
  value.requirements[0]!.failureBehavior = null;
  value.requirements[0]!.riskRefs = [];
  return finalize(value);
})();
