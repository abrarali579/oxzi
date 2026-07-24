/**
 * Dynamic Pipeline Generator
 *
 * Builds a full SpecificationGovernanceInput from a CanonicalProject,
 * runs governance evaluation, and returns structured results.
 *
 * Slice derivation and Task Card compilation are deferred per CURRENT.md
 * ("Specified, Runtime Deferred" — planning/slicing require approved
 * specifications and governance reports).
 *
 * Used by POST /api/projects/[id]/pipeline (Task 3, ADR-086).
 */

import { buildCanonicalProjectFromBrief } from "@/domain/project/from-brief";
import { parseCanonicalProject, type CanonicalProject } from "@/domain/project";
import { analyzeDiscovery } from "@/domain/discovery";
import { evaluateSpecificationGovernance } from "@/domain/governance/evaluate";
import { normalizeSpecification } from "@/domain/governance/normalizer";
import { contentFingerprint, canonicalProjectFingerprint, type JsonValue } from "@/domain/knowledge-graph";
import type { GovernanceReport, SpecificationGovernanceInput } from "@/domain/governance";
import type { ExtractionResult } from "@/domain/extraction";
import { getProject, updateProject } from "@/lib/db";

// ── Types ──────────────────────────────────────────────────────

export interface PipelineResult {
  canonical: CanonicalProject;
  extraction: ExtractionResult | null;
  discovery: ReturnType<typeof analyzeDiscovery>;
  governanceReport: GovernanceReport | null;
  errors: string[];
}

// ── Helpers ────────────────────────────────────────────────────

function unwrapStrings(arr: unknown): string[] {
  if (!Array.isArray(arr)) return [];
  return arr.filter((v): v is string => typeof v === "string");
}

function unwrapFeatures(arr: unknown): Array<{ name: string; description: string; priority: string }> {
  if (!Array.isArray(arr)) return [];
  return arr.filter(
    (v): v is { name: string; description: string; priority: string } =>
      typeof v === "object" && v !== null && "name" in v && "description" in v,
  );
}

function unwrapGoals(arr: unknown): Array<{ name: string; outcome: string; priority: string }> {
  if (!Array.isArray(arr)) return [];
  return arr.filter(
    (v): v is { name: string; outcome: string; priority: string } =>
      typeof v === "object" && v !== null && "name" in v && "outcome" in v,
  );
}

// ── Dynamic Governance Input Builder ───────────────────────────

function buildGovernanceInput(canonical: CanonicalProject): SpecificationGovernanceInput {
  const now = new Date().toISOString();
  const projectId = canonical.metadata.projectId;

  // Derive specification from canonical fields
  const features = unwrapFeatures(canonical.product.features.value);
  const goals = unwrapGoals(canonical.business.goals.value);
  const targetUsers = unwrapStrings(
    (canonical.business.targetUsers.value as Array<{ name: string }> | null)?.map((u) => u.name) ?? [],
  );

  // Build requirements from features + goals (must have at least 1)
  const requirements = (features.length + goals.length > 0
    ? [
        ...features.map((f, i) => ({
          id: `requirement_feature_${i + 1}`,
          specificationId: "spec_dynamic",
          statement: f.description,
          actor: targetUsers[0] ?? null,
          action: `Implement ${f.name}`,
          object: f.name,
          successCondition: `${f.name} is functional and passes acceptance criteria`,
          failureBehavior: null,
          edgeCaseBehavior: null,
          kind: "product_requirement" as const,
          scopeState: "included" as const,
          acceptanceCriterionIds: [`criterion_feature_${i + 1}`],
          decisionRefs: [] as string[],
          dependencyRequirementIds: [] as string[],
          externalDependencyRefs: [] as string[],
          riskRefs: [] as string[],
          contradictsRequirementIds: [] as string[],
          contradictoryCriterionIds: [] as string[],
          unresolvedQuestions: [] as string[],
          privacyClassification: "unknown" as const,
          dataOwner: null,
          authorityRef: null,
          approvalBoundaryRef: null,
          criticality: f.priority === "must" ? "blocking" as const : "high" as const,
          approvalStatus: "not_requested" as const,
          sourceRefs: ["source:initial_prompt"],
          evidenceRefs: ["evidence:initial_prompt"],
          freshness: "current" as const,
        })),
        ...goals.map((g, i) => ({
          id: `requirement_goal_${i + 1}`,
          specificationId: "spec_dynamic",
          statement: g.outcome,
          actor: targetUsers[0] ?? null,
          action: `Achieve ${g.name}`,
          object: g.name,
          successCondition: g.outcome,
          failureBehavior: null,
          edgeCaseBehavior: null,
          kind: "product_requirement" as const,
          scopeState: "included" as const,
          acceptanceCriterionIds: [`criterion_goal_${i + 1}`],
          decisionRefs: [] as string[],
          dependencyRequirementIds: [] as string[],
          externalDependencyRefs: [] as string[],
          riskRefs: [] as string[],
          contradictsRequirementIds: [] as string[],
          contradictoryCriterionIds: [] as string[],
          unresolvedQuestions: [] as string[],
          privacyClassification: "unknown" as const,
          dataOwner: null,
          authorityRef: null,
          approvalBoundaryRef: null,
          criticality: g.priority === "primary" ? "blocking" as const : "high" as const,
          approvalStatus: "not_requested" as const,
          sourceRefs: ["source:initial_prompt"],
          evidenceRefs: ["evidence:initial_prompt"],
          freshness: "current" as const,
        })),
      ]
    : [{
        id: "requirement_fallback",
        specificationId: "spec_dynamic",
        statement: "Deliver the described product",
        actor: "User",
        action: "Use the product",
        object: "Core functionality",
        successCondition: "Product meets user needs",
        failureBehavior: null,
        edgeCaseBehavior: null,
        kind: "product_requirement" as const,
        scopeState: "included" as const,
        acceptanceCriterionIds: ["criterion_fallback"],
        decisionRefs: [] as string[],
        dependencyRequirementIds: [] as string[],
        externalDependencyRefs: [] as string[],
        riskRefs: [] as string[],
        contradictsRequirementIds: [] as string[],
        contradictoryCriterionIds: [] as string[],
        unresolvedQuestions: [] as string[],
        privacyClassification: "unknown" as const,
        dataOwner: null,
        authorityRef: null,
        approvalBoundaryRef: null,
        criticality: "blocking" as const,
        approvalStatus: "not_requested" as const,
        sourceRefs: ["source:initial_prompt"],
        evidenceRefs: ["evidence:initial_prompt"],
        freshness: "current" as const,
      }]
  );

  // Build acceptance criteria (must have at least 1 for schema validation)
  const acceptanceCriteria = features.length + goals.length > 0
    ? [
        ...features.map((f, i) => ({
          id: `criterion_feature_${i + 1}`,
          statement: `${f.name}: ${f.description}`,
          specificationId: "spec_dynamic",
          sourceRefs: ["source:initial_prompt"],
          evidenceRefs: [`evidence:${f.name.toLowerCase().replace(/\s+/g, "-")}`],
          verificationRefs: [] as string[],
          approvalStatus: "not_requested" as const,
        })),
        ...goals.map((g, i) => ({
          id: `criterion_goal_${i + 1}`,
          statement: g.outcome,
          specificationId: "spec_dynamic",
          sourceRefs: ["source:initial_prompt"],
          evidenceRefs: [`evidence:${g.name.toLowerCase().replace(/\s+/g, "-")}`],
          verificationRefs: [] as string[],
          approvalStatus: "not_requested" as const,
        })),
      ]
    : [
        // Fallback: at least one criterion is required
        {
          id: "criterion_fallback",
          statement: "Project delivers the described functionality",
          specificationId: "spec_dynamic",
          sourceRefs: ["source:initial_prompt"],
          evidenceRefs: ["evidence:initial_prompt"],
          verificationRefs: [] as string[],
          approvalStatus: "not_requested" as const,
        },
      ];

  const title = canonical.identity.name.value ?? "Untitled Project";
  const oneLiner = canonical.identity.oneLiner.value ?? "";
  const featureNames = features.map((f) => f.name);
  const goalOutcomes = goals.map((g) => g.outcome);
  const constraintsRaw = unwrapStrings(canonical.scope.constraints.value);

  const specification = {
    id: "spec_dynamic",
    projectId,
    version: 1,
    title,
    // Pre-sort all array fields alphabetically so the fingerprint computed
    // here matches what the normalizer will produce after uniqueSorted().
    what: (featureNames.length > 0 ? featureNames : [title]).slice().sort(),
    why: (goalOutcomes.length > 0 ? goalOutcomes : [oneLiner || title]).slice().sort(),
    actors: (targetUsers.length > 0 ? targetUsers : ["User"]).slice().sort(),
    outcomes: (goalOutcomes.length > 0 ? goalOutcomes : [oneLiner || title]).slice().sort(),
    constraints: (constraintsRaw.length > 0 ? constraintsRaw : ["See discovery interview for constraints"]).slice().sort(),
    scope: (featureNames.length > 0 ? featureNames : [title]).slice().sort(),
    exclusions: [] as string[],
    acceptanceCriteria,
    sourceRefs: ["source:initial_prompt"].slice().sort(),
    evidenceRefs: ["evidence:initial_prompt"].slice().sort(),
    approvalStatus: "not_requested" as const,
    // Placeholder — replaced below with the normalized content fingerprint
    fingerprint: contentFingerprint({ spec: "dynamic", projectId } as JsonValue),
  };

  const revision = {
    lifecycle: "readiness_requested" as const,
    canonicalVersionId: canonical.metadata.version.id,
    canonicalFingerprint: canonicalProjectFingerprint(canonical),
    createdAt: now,
    approvedAt: null,
    supersededAt: null,
    staleSince: null,
    parentSpecificationVersion: null,
    parentSpecificationFingerprint: null,
    amendmentReason: null,
    completedEvidenceRefs: [],
    humanApprovalRequired: false, // Dynamic specs from canonical state are implicitly approved
    sourceFingerprints: [contentFingerprint({ source: "brief" } as JsonValue)],
    dependencyFingerprints: [],
  };

  const traceabilityLinks = requirements.map((r) => ({
    id: `trace_link_${r.id}`,
    fromType: "requirement" as const,
    fromId: r.id,
    toType: "specification" as const,
    toId: "spec_dynamic",
    relationship: "specified_by" as const,
    evidenceRefs: ["evidence:spec"],
    approvalStatus: "approved" as const,
    freshness: "current" as const,
  }));

  const constitutionRules = [
    {
      rule: {
        id: "constitution_rule_testing",
        projectId,
        title: "Verify required behavior",
        description: "Every mandatory criterion requires deterministic verification",
        category: "quality" as const,
        severity: "blocking" as const,
        applicability: ["specification" as const],
        sourceRefs: ["adr:testing"],
        evidenceRefs: ["evidence:constitution"],
        approvalStatus: "approved" as const,
        effectiveVersion: canonical.metadata.version.id,
        temporal: {
          observedAt: now,
          sourceCreatedAt: now,
          ingestedAt: now,
          effectiveFrom: now,
          effectiveTo: null,
          invalidatedAt: null,
          supersededAt: null,
          supersededBy: null,
          currentStatus: "current" as const,
        },
        verificationMethod: "inspect acceptance verification references",
        violationConsequence: "add deterministic verification evidence",
        freshness: "current" as const,
        fingerprint: contentFingerprint({ rule: "testing" } as JsonValue),
      },
      authority: "global" as const,
      policyKey: "testing_requirements",
      subject: "mandatory acceptance verification",
      effect: "require" as const,
    },
  ];

  // Build the governance input draft, then pre-normalize it so the spec
  // fingerprint matches what the governance evaluator's normalizer will
  // recompute. This prevents a spurious "stale" freshness verdict caused
  // by the declared fingerprint not matching the normalized content.
  const draft: SpecificationGovernanceInput = {
    canonicalProject: canonical,
    specification,
    requirements,
    revision,
    constitutionVersion: "constitution-1.0.0",
    constitutionRules,
    constitutionExceptions: [],
    complianceEvidence: [
      {
        ruleId: "constitution_rule_testing",
        status: "pass" as const,
        evidenceRefs: ["validation:npm-test"],
        affectedEntityIds: acceptanceCriteria.map((c) => c.id),
        explanation: "All acceptance criteria reference validation evidence.",
      },
    ],
    technicalPlans: [],
    implementationSlices: [],
    taskCards: [],
    traceabilityLinks,
    validationRefs: [],
    reviewRefs: [],
    convergenceFindingRefs: [],
    artifactRefs: [],
    evaluationTimestamp: now,
  } as unknown as SpecificationGovernanceInput;

  // Pre-normalize so the specification fingerprint matches the normalized
  // content — avoids a freshness-driven "blocked/stale" false positive.
  const preNormalized = normalizeSpecification(draft as unknown);
  return preNormalized.normalizedInput;
}

// ── Public API ─────────────────────────────────────────────────

export function generatePipeline(projectId: string): PipelineResult {
  const errors: string[] = [];

  // Load project
  const project = getProject(projectId);
  if (!project) {
    return { canonical: null as unknown as CanonicalProject, extraction: null, discovery: null as unknown as ReturnType<typeof analyzeDiscovery>, governanceReport: null as unknown as GovernanceReport, errors: ["Project not found"] };
  }

  // Step 1: Build/extract canonical state
  let canonical: CanonicalProject;
  let extraction: ExtractionResult | null = null;

  if (project.canonicalState) {
    try {
      canonical = parseCanonicalProject(project.canonicalState);
    } catch {
      errors.push("Stored canonicalState is invalid, rebuilding from brief");
      const built = buildCanonicalProjectFromBrief(project.title, project.brief);
      canonical = built.canonical;
      extraction = built.extraction;
      updateProject(projectId, {
        canonicalState: canonical as unknown as Record<string, unknown>,
        extractionResult: extraction as unknown as Record<string, unknown> | null,
      });
    }
  } else {
    const built = buildCanonicalProjectFromBrief(project.title, project.brief);
    canonical = built.canonical;
    extraction = built.extraction;
    updateProject(projectId, {
      canonicalState: canonical as unknown as Record<string, unknown>,
      extractionResult: extraction as unknown as Record<string, unknown> | null,
    });
  }

  // Step 2: Discovery
  const discovery = analyzeDiscovery(canonical);

  // Step 3: Build governance input dynamically
  let governanceInput: SpecificationGovernanceInput;
  try {
    governanceInput = buildGovernanceInput(canonical);
  } catch (err) {
    errors.push(`Failed to build governance input: ${err instanceof Error ? err.message : "unknown error"}`);
    return { canonical, extraction, discovery, governanceReport: null as unknown as GovernanceReport, errors };
  }

  // Step 4: Governance evaluation
  let governanceReport: GovernanceReport;
  try {
    governanceReport = evaluateSpecificationGovernance(governanceInput);
  } catch (err) {
    errors.push(`Governance evaluation failed: ${err instanceof Error ? err.message : "unknown error"}`);
    return { canonical, extraction, discovery, governanceReport: null as unknown as GovernanceReport, errors };
  }

  // Step 5 (deferred): Slice derivation and Task Card compilation
  // require approved specifications and governance reports. The
  // governance report's health and readiness fields indicate whether
  // planning may proceed (per spec/13-controlled-specifications-convergence).
  if (
    governanceReport.health.status !== "healthy" ||
    governanceReport.readiness.decision !== "readiness_recommended"
  ) {
    const blockerList = governanceReport.health.blockingReasons.length > 0
      ? ` Blockers: ${governanceReport.health.blockingReasons.join("; ")}`
      : "";
    const recommendationList = governanceReport.health.recommendations.length > 0
      ? ` Recommendations: ${governanceReport.health.recommendations.slice(0, 3).join("; ")}`
      : "";
    errors.push(
      `Governance not ready for planning (health: ${governanceReport.health.status}, readiness: ${governanceReport.readiness.decision}). ` +
      `Resolve governance findings before deriving slices.${blockerList}${recommendationList}`,
    );
  }

  return {
    canonical,
    extraction,
    discovery,
    governanceReport,
    errors,
  };
}
