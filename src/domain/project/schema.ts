import { z } from "zod";

import {
  approvalStatusSchema,
  assumptionStatusSchema,
  conflictSeveritySchema,
  conflictStatusSchema,
  criticalitySchema,
  fieldStatusSchema,
  lifecycleStatusSchema,
  sourcePrecedenceSchema,
  sourceTypeSchema,
  type ApprovalStatus,
  type AssumptionStatus,
  type ConflictStatus,
  type Criticality,
  type FieldStatus,
  type SourcePrecedence,
  type SourceType,
} from "./enums";
import {
  assumptionIdSchema,
  conflictIdSchema,
  decisionIdSchema,
  evidenceIdSchema,
  fieldIdSchema,
  projectIdSchema,
  versionIdSchema,
  workspaceIdSchema,
  type AssumptionId,
  type ConflictId,
  type EvidenceId,
  type FieldId,
} from "./identifiers";

const timestampSchema = z.string().datetime({ offset: true });
const nonEmptyStringSchema = z.string().trim().min(1);

export const fieldApprovalMetadataSchema = z
  .object({
    status: approvalStatusSchema,
    approvedAt: timestampSchema.optional(),
    approvedBy: nonEmptyStringSchema.optional(),
  })
  .strict()
  .superRefine((approval, context) => {
    if (approval.status === "approved" && !approval.approvedAt) {
      context.addIssue({
        code: "custom",
        path: ["approvedAt"],
        message: "Approved fields require an approval timestamp",
      });
    }
  });

export const fieldAssumptionMetadataSchema = z
  .object({
    assumptionId: assumptionIdSchema,
    status: assumptionStatusSchema,
  })
  .strict();

export const fieldConflictMetadataSchema = z
  .object({
    conflictId: conflictIdSchema,
    status: conflictStatusSchema,
    severity: conflictSeveritySchema,
  })
  .strict();

export type ProjectField<T> = {
  id: FieldId;
  value: T | null;
  status: FieldStatus;
  confidence: number;
  criticality: Criticality;
  sourceType: SourceType;
  sourcePrecedence: SourcePrecedence;
  evidenceIds: EvidenceId[];
  timestamps: {
    createdAt: string;
    updatedAt: string;
  };
  assumption?: {
    assumptionId: AssumptionId;
    status: AssumptionStatus;
  };
  approval: {
    status: ApprovalStatus;
    approvedAt?: string;
    approvedBy?: string;
  };
  conflict?: {
    conflictId: ConflictId;
    status: ConflictStatus;
    severity: Criticality;
  };
};

export const projectFieldSchema = <T extends z.ZodType>(valueSchema: T) =>
  z
    .object({
      id: fieldIdSchema,
      value: valueSchema.nullable(),
      status: fieldStatusSchema,
      confidence: z.number().min(0).max(100),
      criticality: criticalitySchema,
      sourceType: sourceTypeSchema,
      sourcePrecedence: sourcePrecedenceSchema,
      evidenceIds: z.array(evidenceIdSchema),
      timestamps: z
        .object({
          createdAt: timestampSchema,
          updatedAt: timestampSchema,
        })
        .strict(),
      assumption: fieldAssumptionMetadataSchema.optional(),
      approval: fieldApprovalMetadataSchema,
      conflict: fieldConflictMetadataSchema.optional(),
    })
    .strict()
    .superRefine((field, context) => {
      const candidate = field as typeof field & { value: unknown };

      if (candidate.status === "missing" && candidate.value !== null) {
        context.addIssue({
          code: "custom",
          path: ["value"],
          message: "Missing fields must have a null value",
        });
      }

      if (candidate.status !== "missing" && candidate.value === null) {
        context.addIssue({
          code: "custom",
          path: ["value"],
          message: "Resolved or conflicted fields must retain a candidate value",
        });
      }

      if (candidate.status === "conflicted" && !candidate.conflict) {
        context.addIssue({
          code: "custom",
          path: ["conflict"],
          message: "Conflicted fields require conflict metadata",
        });
      }

      if (
        candidate.status === "inferred" &&
        (candidate.criticality === "blocking" || candidate.criticality === "high") &&
        candidate.evidenceIds.length === 0
      ) {
        context.addIssue({
          code: "custom",
          path: ["evidenceIds"],
          message: "Critical inferred fields require evidence",
        });
      }

      if (
        field.approval.status === "approved" &&
        field.conflict?.status === "open" &&
        field.conflict.severity === "blocking"
      ) {
        context.addIssue({
          code: "custom",
          path: ["approval", "status"],
          message: "Approved fields cannot contain unresolved blocking conflicts",
        });
      }
    });

export const fieldEvidenceSchema = z
  .object({
    id: evidenceIdSchema,
    sourceType: sourceTypeSchema,
    sourceId: nonEmptyStringSchema,
    excerpt: nonEmptyStringSchema.optional(),
    interpretation: nonEmptyStringSchema,
    createdAt: timestampSchema,
  })
  .strict();

export const assumptionSchema = z
  .object({
    id: assumptionIdSchema,
    fieldIds: z.array(fieldIdSchema).min(1),
    statement: nonEmptyStringSchema,
    status: assumptionStatusSchema,
    impact: criticalitySchema,
    rationale: nonEmptyStringSchema.optional(),
    replacementAssumptionId: assumptionIdSchema.optional(),
    createdAt: timestampSchema,
    updatedAt: timestampSchema,
  })
  .strict();

export const decisionSchema = z
  .object({
    id: decisionIdSchema,
    fieldIds: z.array(fieldIdSchema),
    title: nonEmptyStringSchema,
    decision: nonEmptyStringSchema,
    rationale: nonEmptyStringSchema,
    status: approvalStatusSchema,
    decidedAt: timestampSchema.optional(),
    createdAt: timestampSchema,
    updatedAt: timestampSchema,
  })
  .strict();

export const conflictSchema = z
  .object({
    id: conflictIdSchema,
    fieldIds: z.array(fieldIdSchema).min(1),
    evidenceIds: z.array(evidenceIdSchema),
    summary: nonEmptyStringSchema,
    severity: conflictSeveritySchema,
    status: conflictStatusSchema,
    resolution: nonEmptyStringSchema.optional(),
    createdAt: timestampSchema,
    resolvedAt: timestampSchema.optional(),
  })
  .strict();

export const versionMetadataSchema = z
  .object({
    id: versionIdSchema,
    number: z.number().int().positive(),
    parentVersionId: versionIdSchema.optional(),
    schemaVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
    approvalStatus: approvalStatusSchema,
    createdAt: timestampSchema,
    createdBy: nonEmptyStringSchema,
    approvedAt: timestampSchema.optional(),
    approvedBy: nonEmptyStringSchema.optional(),
  })
  .strict();

const targetUserSchema = z
  .object({
    name: nonEmptyStringSchema,
    needs: z.array(nonEmptyStringSchema).min(1),
    painPoints: z.array(nonEmptyStringSchema),
  })
  .strict();

const goalSchema = z
  .object({
    name: nonEmptyStringSchema,
    outcome: nonEmptyStringSchema,
    priority: z.enum(["primary", "secondary"]),
  })
  .strict();

const successMetricSchema = z
  .object({
    name: nonEmptyStringSchema,
    target: nonEmptyStringSchema,
    measurement: nonEmptyStringSchema,
  })
  .strict();

const featureSchema = z
  .object({
    name: nonEmptyStringSchema,
    description: nonEmptyStringSchema,
    priority: z.enum(["must", "should", "could"]),
    acceptanceCriteria: z.array(nonEmptyStringSchema).min(1),
  })
  .strict();

const userFlowSchema = z
  .object({
    name: nonEmptyStringSchema,
    actor: nonEmptyStringSchema,
    steps: z.array(nonEmptyStringSchema).min(2),
    outcome: nonEmptyStringSchema,
  })
  .strict();

const integrationSchema = z
  .object({
    name: nonEmptyStringSchema,
    purpose: nonEmptyStringSchema,
    direction: z.enum(["inbound", "outbound", "bidirectional"]),
    required: z.boolean(),
  })
  .strict();

const dataEntitySchema = z
  .object({
    name: nonEmptyStringSchema,
    purpose: nonEmptyStringSchema,
    owner: nonEmptyStringSchema,
  })
  .strict();

const riskSchema = z
  .object({
    name: nonEmptyStringSchema,
    impact: criticalitySchema,
    mitigation: nonEmptyStringSchema,
  })
  .strict();

const milestoneSchema = z
  .object({
    name: nonEmptyStringSchema,
    exitCriteria: z.array(nonEmptyStringSchema).min(1),
  })
  .strict();

const stringField = () => projectFieldSchema(nonEmptyStringSchema);
const stringArrayField = () => projectFieldSchema(z.array(nonEmptyStringSchema));

export const identitySchema = z
  .object({
    name: stringField(),
    oneLiner: stringField(),
    projectType: projectFieldSchema(
      z.enum(["website", "saas_application", "automation_system", "internal_tool", "other"]),
    ),
    industry: stringField(),
    currentStage: stringField(),
  })
  .strict();

export const businessSchema = z
  .object({
    problem: stringField(),
    solution: stringField(),
    targetUsers: projectFieldSchema(z.array(targetUserSchema)),
    geography: stringArrayField(),
    businessModel: stringField(),
    goals: projectFieldSchema(z.array(goalSchema)),
    successMetrics: projectFieldSchema(z.array(successMetricSchema)),
  })
  .strict();

export const scopeSchema = z
  .object({
    inScope: stringArrayField(),
    outOfScope: stringArrayField(),
    constraints: stringArrayField(),
    assumptionSummaries: stringArrayField(),
    dependencies: stringArrayField(),
  })
  .strict();

export const productSchema = z
  .object({
    platforms: stringArrayField(),
    coreUserFlows: projectFieldSchema(z.array(userFlowSchema)),
    features: projectFieldSchema(z.array(featureSchema)),
    roles: stringArrayField(),
    permissions: stringArrayField(),
    contentRequirements: stringArrayField(),
  })
  .strict();

export const visualSchema = z
  .object({
    personality: stringArrayField(),
    visualKeywords: stringArrayField(),
    avoidList: stringArrayField(),
    themes: stringArrayField(),
    colors: stringArrayField(),
    typography: stringArrayField(),
    layoutRules: stringArrayField(),
    motionRules: stringArrayField(),
    threeDRules: stringArrayField(),
    references: stringArrayField(),
  })
  .strict();

const publicEnvironmentSchema = z.record(nonEmptyStringSchema, z.string());

export const technicalSchema = z
  .object({
    preferredStack: stringArrayField(),
    architectureStyle: stringField(),
    dataEntities: projectFieldSchema(z.array(dataEntitySchema)),
    integrations: projectFieldSchema(z.array(integrationSchema)),
    authentication: stringField(),
    storage: stringField(),
    backgroundJobs: stringField(),
    security: stringArrayField(),
    privacy: stringArrayField(),
    deployment: stringField(),
    publicEnvironment: projectFieldSchema(publicEnvironmentSchema),
  })
  .strict();

export const qualitySchema = z
  .object({
    performance: stringArrayField(),
    accessibility: stringArrayField(),
    testing: stringArrayField(),
    observability: stringArrayField(),
    localization: stringArrayField(),
    seo: stringArrayField(),
  })
  .strict();

export const executionSchema = z
  .object({
    phases: stringArrayField(),
    milestones: projectFieldSchema(z.array(milestoneSchema)),
    acceptanceCriteria: stringArrayField(),
    risks: projectFieldSchema(z.array(riskSchema)),
    openDecisionIds: projectFieldSchema(z.array(decisionIdSchema)),
    currentTask: stringField(),
    nextTask: stringField(),
  })
  .strict();

export const completenessSchema = z
  .object({
    criticalCompleteness: z.number().min(0).max(100),
    overallCompleteness: z.number().min(0).max(100),
    contradictionCount: z.number().int().nonnegative(),
    blockingQuestionCount: z.number().int().nonnegative(),
    assumptionCount: z.number().int().nonnegative(),
  })
  .strict();

export const lifecycleEventSchema = z
  .object({
    status: lifecycleStatusSchema,
    enteredAt: timestampSchema,
  })
  .strict();

export const projectMetadataSchema = z
  .object({
    projectId: projectIdSchema,
    workspaceId: workspaceIdSchema,
    lifecycle: lifecycleStatusSchema,
    approvalStatus: approvalStatusSchema,
    createdAt: timestampSchema,
    updatedAt: timestampSchema,
    lifecycleHistory: z.array(lifecycleEventSchema).min(1),
    version: versionMetadataSchema,
  })
  .strict();

const metadataRecordsSchema = z
  .object({
    evidence: z.array(fieldEvidenceSchema),
    assumptions: z.array(assumptionSchema),
    decisions: z.array(decisionSchema),
    conflicts: z.array(conflictSchema),
    completeness: completenessSchema,
  })
  .strict();

const lifecycleTransitions: Readonly<Record<string, readonly string[]>> = {
  draft: ["analyzing"],
  analyzing: ["discovery_required", "discovery_skipped"],
  discovery_required: ["understanding_review"],
  discovery_skipped: ["understanding_review"],
  understanding_review: ["architecture_ready"],
  architecture_ready: ["bible_generated"],
  bible_generated: ["approved"],
  approved: ["in_build"],
  in_build: ["maintained"],
  maintained: [],
};

const readyLifecycleStatuses = new Set([
  "architecture_ready",
  "bible_generated",
  "approved",
  "in_build",
  "maintained",
]);

const approvedLifecycleStatuses = new Set(["approved", "in_build", "maintained"]);
const criticalitiesThatBlockReadiness = new Set(["blocking", "high"]);
const secretEnvironmentKey =
  /(?:^|_)(?:secret|token|password|passwd|private(?:_key)?|credential|api_?key|access_?key|session)(?:_|$)/i;
const publicEnvironmentKey = /^(?:NEXT_PUBLIC_|PUBLIC_)[A-Z0-9_]+$/;
const placeholder =
  /(?:\b(?:TODO|TBD)\b|\{\{[^}]+\}\}|<\s*placeholder\s*>|\[(?:placeholder|insert|replace|fill)[^\]]*\])/i;

type UnknownProjectField = ProjectField<unknown>;

function allProjectFields(project: {
  identity: Record<string, unknown>;
  business: Record<string, unknown>;
  scope: Record<string, unknown>;
  product: Record<string, unknown>;
  visual: Record<string, unknown>;
  technical: Record<string, unknown>;
  quality: Record<string, unknown>;
  execution: Record<string, unknown>;
}): UnknownProjectField[] {
  return [
    ...Object.values(project.identity),
    ...Object.values(project.business),
    ...Object.values(project.scope),
    ...Object.values(project.product),
    ...Object.values(project.visual),
    ...Object.values(project.technical),
    ...Object.values(project.quality),
    ...Object.values(project.execution),
  ] as UnknownProjectField[];
}

function containsPlaceholder(value: unknown): boolean {
  if (typeof value === "string") return placeholder.test(value);
  if (Array.isArray(value)) return value.some(containsPlaceholder);
  if (value && typeof value === "object") {
    return Object.values(value).some(containsPlaceholder);
  }
  return false;
}

const canonicalProjectObjectSchema = z
  .object({
    metadata: projectMetadataSchema,
    identity: identitySchema,
    business: businessSchema,
    scope: scopeSchema,
    product: productSchema,
    visual: visualSchema,
    technical: technicalSchema,
    quality: qualitySchema,
    execution: executionSchema,
    meta: metadataRecordsSchema,
  })
  .strict();

export const canonicalProjectSchema = canonicalProjectObjectSchema.superRefine(
  (project, context) => {
    const fields = allProjectFields(project);
    const fieldIds = new Set(fields.map((field) => field.id));
    const evidenceIds = new Set(project.meta.evidence.map((evidence) => evidence.id));
    const assumptionIds = new Set(project.meta.assumptions.map((assumption) => assumption.id));
    const conflictIds = new Set(project.meta.conflicts.map((conflict) => conflict.id));

    const reportDuplicateIds = (ids: string[], path: (string | number)[]) => {
      if (new Set(ids).size !== ids.length) {
        context.addIssue({ code: "custom", path, message: "Identifiers must be unique" });
      }
    };

    reportDuplicateIds(
      fields.map((field) => field.id),
      ["identity"],
    );
    reportDuplicateIds(
      project.meta.evidence.map((item) => item.id),
      ["meta", "evidence"],
    );
    reportDuplicateIds(
      project.meta.assumptions.map((item) => item.id),
      ["meta", "assumptions"],
    );
    reportDuplicateIds(
      project.meta.decisions.map((item) => item.id),
      ["meta", "decisions"],
    );
    reportDuplicateIds(
      project.meta.conflicts.map((item) => item.id),
      ["meta", "conflicts"],
    );

    for (const field of fields) {
      for (const evidenceId of field.evidenceIds) {
        if (!evidenceIds.has(evidenceId)) {
          context.addIssue({
            code: "custom",
            path: ["meta", "evidence"],
            message: `Field ${field.id} references unknown evidence ${evidenceId}`,
          });
        }
      }

      if (field.assumption && !assumptionIds.has(field.assumption.assumptionId)) {
        context.addIssue({
          code: "custom",
          path: ["meta", "assumptions"],
          message: `Field ${field.id} references unknown assumption ${field.assumption.assumptionId}`,
        });
      }

      if (field.conflict && !conflictIds.has(field.conflict.conflictId)) {
        context.addIssue({
          code: "custom",
          path: ["meta", "conflicts"],
          message: `Field ${field.id} references unknown conflict ${field.conflict.conflictId}`,
        });
      }

      if (field.assumption) {
        const assumption = project.meta.assumptions.find(
          (item) => item.id === field.assumption?.assumptionId,
        );
        if (assumption && assumption.status !== field.assumption.status) {
          context.addIssue({
            code: "custom",
            path: ["meta", "assumptions"],
            message: `Field ${field.id} has stale assumption metadata`,
          });
        }
      }

      if (field.conflict) {
        const conflict = project.meta.conflicts.find(
          (item) => item.id === field.conflict?.conflictId,
        );
        if (
          conflict &&
          (conflict.status !== field.conflict.status ||
            conflict.severity !== field.conflict.severity)
        ) {
          context.addIssue({
            code: "custom",
            path: ["meta", "conflicts"],
            message: `Field ${field.id} has stale conflict metadata`,
          });
        }
      }
    }

    for (const assumption of project.meta.assumptions) {
      if (assumption.status === "accepted" && !assumption.rationale) {
        context.addIssue({
          code: "custom",
          path: ["meta", "assumptions"],
          message: `Accepted assumption ${assumption.id} requires rationale`,
        });
      }
      for (const fieldId of assumption.fieldIds) {
        if (!fieldIds.has(fieldId)) {
          context.addIssue({
            code: "custom",
            path: ["meta", "assumptions"],
            message: `Assumption ${assumption.id} references unknown field ${fieldId}`,
          });
        }
      }
    }

    for (const decision of project.meta.decisions) {
      for (const fieldId of decision.fieldIds) {
        if (!fieldIds.has(fieldId)) {
          context.addIssue({
            code: "custom",
            path: ["meta", "decisions"],
            message: `Decision ${decision.id} references unknown field ${fieldId}`,
          });
        }
      }
    }

    for (const conflict of project.meta.conflicts) {
      for (const fieldId of conflict.fieldIds) {
        if (!fieldIds.has(fieldId)) {
          context.addIssue({
            code: "custom",
            path: ["meta", "conflicts"],
            message: `Conflict ${conflict.id} references unknown field ${fieldId}`,
          });
        }
      }
      for (const evidenceId of conflict.evidenceIds) {
        if (!evidenceIds.has(evidenceId)) {
          context.addIssue({
            code: "custom",
            path: ["meta", "conflicts"],
            message: `Conflict ${conflict.id} references unknown evidence ${evidenceId}`,
          });
        }
      }

      if (conflict.status === "open" && conflict.severity === "blocking") {
        const approvedField = fields.find(
          (field) => conflict.fieldIds.includes(field.id) && field.approval.status === "approved",
        );
        if (approvedField) {
          context.addIssue({
            code: "custom",
            path: ["meta", "conflicts"],
            message: `Approved field ${approvedField.id} cannot retain an unresolved blocking conflict`,
          });
        }
      }
    }

    const history = project.metadata.lifecycleHistory;
    if (history[0]?.status !== "draft") {
      context.addIssue({
        code: "custom",
        path: ["metadata", "lifecycleHistory", 0, "status"],
        message: "Lifecycle history must begin in draft",
      });
    }
    if (history.at(-1)?.status !== project.metadata.lifecycle) {
      context.addIssue({
        code: "custom",
        path: ["metadata", "lifecycle"],
        message: "Current lifecycle must equal the final lifecycle history entry",
      });
    }
    for (let index = 1; index < history.length; index += 1) {
      const previous = history[index - 1]?.status;
      const current = history[index]?.status;
      if (previous && current && !lifecycleTransitions[previous]?.includes(current)) {
        context.addIssue({
          code: "custom",
          path: ["metadata", "lifecycleHistory", index, "status"],
          message: `Invalid lifecycle transition from ${previous} to ${current}`,
        });
      }
      if (
        history[index - 1] &&
        history[index] &&
        Date.parse(history[index - 1].enteredAt) > Date.parse(history[index].enteredAt)
      ) {
        context.addIssue({
          code: "custom",
          path: ["metadata", "lifecycleHistory", index, "enteredAt"],
          message: "Lifecycle timestamps must be chronological",
        });
      }
    }

    if (
      project.metadata.approvalStatus === "approved" &&
      !approvedLifecycleStatuses.has(project.metadata.lifecycle)
    ) {
      context.addIssue({
        code: "custom",
        path: ["metadata", "approvalStatus"],
        message: "Project approval is inconsistent with the current lifecycle",
      });
    }

    if (
      project.metadata.version.approvalStatus === "approved" &&
      !project.metadata.version.approvedAt
    ) {
      context.addIssue({
        code: "custom",
        path: ["metadata", "version", "approvedAt"],
        message: "Approved versions require an approval timestamp",
      });
    }

    if (
      project.metadata.version.approvalStatus === "approved" &&
      !approvedLifecycleStatuses.has(project.metadata.lifecycle)
    ) {
      context.addIssue({
        code: "custom",
        path: ["metadata", "version", "approvalStatus"],
        message: "Version approval is inconsistent with the current lifecycle",
      });
    }

    const isReady = readyLifecycleStatuses.has(project.metadata.lifecycle);
    const unresolvedCriticalFields = fields.filter(
      (field) =>
        criticalitiesThatBlockReadiness.has(field.criticality) &&
        (field.status === "missing" || field.status === "conflicted"),
    );
    const blockingConflicts = project.meta.conflicts.filter(
      (conflict) => conflict.status === "open" && conflict.severity === "blocking",
    );
    const unresolvedHighAssumptions = project.meta.assumptions.filter(
      (assumption) =>
        criticalitiesThatBlockReadiness.has(assumption.impact) && assumption.status === "proposed",
    );

    if (
      isReady &&
      (unresolvedCriticalFields.length > 0 ||
        blockingConflicts.length > 0 ||
        unresolvedHighAssumptions.length > 0)
    ) {
      context.addIssue({
        code: "custom",
        path: ["metadata", "lifecycle"],
        message:
          "Architecture-ready and later lifecycle states cannot contain unresolved critical fields, blocking conflicts, or high-impact proposed assumptions",
      });
    }

    if (
      (project.metadata.version.approvalStatus === "approved" ||
        approvedLifecycleStatuses.has(project.metadata.lifecycle)) &&
      containsPlaceholder(project)
    ) {
      context.addIssue({
        code: "custom",
        path: ["metadata", "version"],
        message: "Approved project versions cannot contain placeholders",
      });
    }

    const publicEnvironment = project.technical.publicEnvironment.value;
    if (publicEnvironment) {
      for (const key of Object.keys(publicEnvironment)) {
        if (!publicEnvironmentKey.test(key) || secretEnvironmentKey.test(key)) {
          context.addIssue({
            code: "custom",
            path: ["technical", "publicEnvironment", "value", key],
            message:
              "Public environment data may contain only explicitly public, non-secret fields",
          });
        }
      }
    }
  },
);

export type CanonicalProject = z.infer<typeof canonicalProjectSchema>;
export type FieldEvidence = z.infer<typeof fieldEvidenceSchema>;
export type Assumption = z.infer<typeof assumptionSchema>;
export type Decision = z.infer<typeof decisionSchema>;
export type Conflict = z.infer<typeof conflictSchema>;
export type VersionMetadata = z.infer<typeof versionMetadataSchema>;

export function parseCanonicalProject(input: unknown): CanonicalProject {
  return canonicalProjectSchema.parse(input);
}

function sortJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortJsonValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nestedValue]) => [key, sortJsonValue(nestedValue)]),
    );
  }
  return value;
}

export function serializeCanonicalProject(input: unknown): string {
  return JSON.stringify(sortJsonValue(parseCanonicalProject(input)));
}
