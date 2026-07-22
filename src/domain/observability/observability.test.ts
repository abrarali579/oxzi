import { describe, expect, it } from "vitest";

import { contentFingerprint } from "../knowledge-graph";
import {
  experimentRunSchema,
  experimentSchema,
  observabilityDatasetSchema,
  traceBundleSchema,
} from ".";

const now = "2026-07-23T00:00:00.000Z";
const fingerprint = contentFingerprint({ trace: 1 });
const versions = {
  canonicalProjectVersionId: "version_oxzire_v1",
  constitutionVersionRef: "constitution:1",
  specificationVersionRefs: ["spec:1"],
  technicalPlanVersionRefs: ["plan:1"],
  knowledgeGraphVersionRef: "graph:2",
  repositoryGraphVersionRef: "repo-graph:1",
  taskCardVersionRef: "task-card:1",
  contextPackageVersionRef: "context:1",
  promptProgramVersionId: "prompt_version_review_1",
  rendererVersionRef: "renderer:1",
  exampleVersionRefs: [],
  workflowPolicyVersionRef: "workflow:1",
  skillVersionRefs: [],
  targetAgentProfile: { profileId: "agent_profile_local", revision: 1, fingerprint },
  modelProfileVersionRef: "model:1",
  evaluationSuiteId: "eval_suite_review",
  parserVersionRefs: ["parser:typescript:1"],
  structuredOutputContractVersionRef: "ai-contract:1",
};
const trace = {
  id: "trace_review",
  projectId: "project_oxzire_3d",
  taskCardId: "task_card_review",
  executionPassportId: "passport_review",
  executionId: "execution_review",
  environment: "test" as const,
  startedAt: now,
  endedAt: now,
  status: "completed" as const,
  userSessionRef: null,
  privacyMode: "metadata_only" as const,
  retentionPolicyRef: "retention:metadata",
  tags: ["review"],
  metadataRefs: ["metadata:1"],
  versions,
  fingerprint,
};
const rootSpan = {
  id: "span_root",
  traceId: "trace_review",
  parentSpanId: null,
  operationType: "agent_operation" as const,
  inputArtifactRef: "artifact:input",
  outputArtifactRef: "artifact:output",
  startedAt: now,
  endedAt: now,
  status: "completed" as const,
  inputTokens: 100,
  outputTokens: 20,
  cacheReadTokens: 0,
  cacheWriteTokens: 0,
  costAmount: null,
  costCurrency: null,
  errorRef: null,
  providerProfileRef: null,
  modelProfileRef: "model:1",
  agentProfileRef: "agent:1",
  artifactRefs: ["artifact:output"],
  evaluationRefs: ["evaluation:1"],
};
const bundle = {
  trace,
  retentionPolicy: {
    policyId: "retention:metadata",
    version: "1",
    retentionDays: 30,
    deletionMode: "automatic" as const,
    rawContentAllowed: false,
    secretRedactionRequired: true,
    crossProjectAggregationAllowed: false,
  },
  spans: [rootSpan],
  generations: [],
  observations: [],
  evaluationLinks: [],
};

describe("Observability contracts", () => {
  it("accepts a valid trace hierarchy", () => {
    expect(traceBundleSchema.parse(bundle).spans).toHaveLength(1);
  });

  it("rejects a missing span parent", () => {
    expect(() =>
      traceBundleSchema.parse({
        ...bundle,
        spans: [{ ...rootSpan, id: "span_child", parentSpanId: "span_missing" }],
      }),
    ).toThrow(/parent must exist/);
  });

  it("requires exact execution-version references", () => {
    expect(() =>
      traceBundleSchema.parse({
        ...bundle,
        trace: { ...trace, versions: { ...versions, rendererVersionRef: "" } },
      }),
    ).toThrow();
  });

  it("validates privacy modes", () => {
    expect(() =>
      traceBundleSchema.parse({ ...bundle, trace: { ...trace, privacyMode: "public" } }),
    ).toThrow();
  });

  it("forbids raw content under metadata-only mode", () => {
    expect(() =>
      traceBundleSchema.parse({
        ...bundle,
        generations: [
          {
            id: "generation_review",
            traceId: trace.id,
            spanId: rootSpan.id,
            promptProgramVersionId: "prompt_version_review_1",
            rendererVersionRef: "renderer:1",
            contextPackageVersionRef: "context:1",
            targetModelProfileRef: "model:1",
            tokenizerRef: null,
            inputTokens: 100,
            outputTokens: 20,
            cacheTokens: 0,
            latencyMs: 10,
            finishReason: "stop",
            parsedContractResultRef: "result:1",
            rawInputArtifactRef: "artifact:raw-input",
            rawOutputArtifactRef: null,
            rawContentRetentionPolicyRef: "retention:metadata",
          },
        ],
      }),
    ).toThrow(/Metadata-only/);
  });

  it("requires consent and anonymization for global datasets", () => {
    expect(() =>
      observabilityDatasetSchema.parse({
        id: "dataset_global",
        version: 1,
        name: "Global benchmark",
        partition: "approved_anonymized_global",
        privacyClassification: "internal",
        provenanceRefs: ["source:consent"],
        globalUseConsent: false,
        anonymized: true,
        immutable: true,
        fingerprint,
      }),
    ).toThrow(/explicit consent/);
  });

  it("requires reproducible experiment versions and separate datasets", () => {
    expect(() =>
      experimentSchema.parse({
        id: "experiment_review",
        version: 1,
        hypothesis: "Improve review accuracy",
        trainingDatasetRef: "dataset:same",
        unseenValidationDatasetRef: "dataset:same",
        regressionDatasetRefs: ["dataset:regression"],
        promptProgramCandidateRefs: ["candidate:1"],
        baselineRef: "baseline:1",
        evaluationSuiteId: "eval_suite_review",
        requiredVersionRefs: ["renderer:1"],
        statisticalLimitations: ["small sample"],
        approvalState: "approved",
      }),
    ).toThrow(/must be separate/);
    expect(() =>
      experimentRunSchema.parse({
        id: "experiment_run_review",
        experimentId: "experiment_review",
        experimentVersion: 1,
        datasetVersionRefs: ["dataset:training:1"],
        promptProgramVersionRefs: ["prompt_version_review_1"],
        agentProfileRefs: ["agent:1"],
        modelProfileRefs: ["model:1"],
        contextCompilerVersionRef: "context:1",
        evaluationSuiteId: "eval_suite_review",
        baselineResultRef: "result:baseline",
        resultRefs: ["result:candidate"],
        tokenLedgerRef: "ledger:1",
        latencyResultRef: "latency:1",
        qualityResultRef: "quality:1",
        reworkResultRef: "rework:1",
        failedResultRefs: [],
        releaseRecommendation: "review_required",
        startedAt: now,
        completedAt: now,
      }),
    ).toThrow();
  });
});
