import { z } from "zod";

import { implementationSliceSchema, type ConstitutionRule } from "../governance";
import { contentFingerprint, stableJson, type JsonValue } from "../knowledge-graph";
import {
  fileBoundariesSchema,
  taskCardSchema,
  taskCardValidationReportSchema,
  type FileBoundaries,
  type TaskCard,
  type TaskCardValidationReport,
  type TaskCardValidationRequirement,
} from "./schemas";
import {
  TASK_CARD_COMPILER_VERSION,
  createTaskCardFinding,
  createTaskCardId,
  sortTaskCardFindings,
} from "./utils";

const DEFAULT_PROTECTED_FILES = [
  ".env",
  ".env.*",
  ".git/**",
  ".review/**",
  "node_modules/**",
  ".next/**",
] as const;

const compileInputSchema = z
  .object({
    slice: implementationSliceSchema,
    constitutionRules: z.array(z.unknown()).default([]),
  })
  .strict();

function sortedUnique<T extends string>(values: readonly T[]): T[] {
  return [...new Set(values)].sort();
}

function calculateTaskCardFingerprint(taskCard: TaskCard) {
  const semantic = Object.fromEntries(
    Object.entries(taskCard).filter(([key]) => key !== "fingerprint"),
  ) as JsonValue;
  return contentFingerprint(semantic);
}

function riskLevel(riskRefs: string[]): TaskCard["riskLevel"] {
  if (riskRefs.some((risk) => /security|secret|destructive|migration|data|privacy/i.test(risk)))
    return "high";
  if (riskRefs.length > 0) return "medium";
  return "low";
}

function mapConstitutionConstraints(rules: unknown[]): string[] {
  return rules
    .map((rule) => {
      const parsed = z
        .object({
          id: z.string().trim().min(1),
          title: z.string().trim().min(1),
          severity: z.enum(["blocking", "required", "advisory"]),
          verificationMethod: z.string().trim().min(1),
        })
        .passthrough()
        .safeParse(rule);
      if (!parsed.success) return null;
      return `constitution:${parsed.data.id}:${parsed.data.severity}:${parsed.data.title}:${parsed.data.verificationMethod}`;
    })
    .filter((entry): entry is string => entry !== null);
}

export function resolveFileBoundaries(input: {
  editableScope: string[];
  protectedScope: string[];
  scope: string[];
  exclusions: string[];
  riskRefs: string[];
  prerequisiteSliceIds: string[];
}): FileBoundaries {
  const protectedFiles = sortedUnique([...DEFAULT_PROTECTED_FILES, ...input.protectedScope]);
  const protectedSet = new Set(protectedFiles);
  const writableFiles = sortedUnique(input.editableScope).filter(
    (entry) => !protectedSet.has(entry),
  );
  const readOnlyFiles = sortedUnique([
    ...input.scope,
    ...input.exclusions,
    ...input.riskRefs,
    ...input.prerequisiteSliceIds.map((id) => `slice:${id}`),
  ]).filter((entry) => !protectedSet.has(entry) && !writableFiles.includes(entry));
  return fileBoundariesSchema.parse({ writableFiles, readOnlyFiles, protectedFiles });
}

function validations(commands: string[]): TaskCardValidationRequirement[] {
  return [
    {
      phase: "pre_execution",
      command: "verify-task-card-boundaries",
      required: true,
      source: "compiler",
    },
    ...commands.map((command) => ({
      phase: "post_execution" as const,
      command,
      required: true as const,
      source: "slice" as const,
    })),
  ];
}

function buildTaskCard(input: z.infer<typeof compileInputSchema>): TaskCard {
  const slice = input.slice;
  const base = {
    taskCardId: createTaskCardId(slice.id, slice.version),
    sourceSliceId: slice.id,
    sourceSliceVersion: slice.version,
    sourceSliceFingerprint: slice.fingerprint,
    technicalPlanId: slice.technicalPlanId,
    technicalPlanVersion: slice.technicalPlanVersion,
    technicalPlanFingerprint: slice.technicalPlanFingerprint,
    specificationId: slice.specificationId,
    specificationVersion: slice.specificationVersion,
    specificationFingerprint: slice.specificationFingerprint,
    constitutionFingerprint: slice.constitutionFingerprint,
    goal: slice.goal,
    scope: sortedUnique(slice.scope),
    exclusions: sortedUnique(slice.exclusions),
    constraints: sortedUnique([
      `slice-kind:${slice.kind}`,
      `rollback:${slice.rollbackStrategy}`,
      ...slice.riskRefs.map((risk) => `risk:${risk}`),
      ...slice.protectedScope.map((scope) => `protected:${scope}`),
      ...mapConstitutionConstraints(input.constitutionRules as ConstitutionRule[]),
    ]),
    acceptanceCriteria: sortedUnique(slice.acceptanceCriterionIds),
    fileBoundaries: resolveFileBoundaries(slice),
    validations: validations(slice.validationCommands),
    riskLevel: riskLevel(slice.riskRefs),
    prerequisiteTaskRefs: sortedUnique(slice.prerequisiteSliceIds.map((id) => `slice:${id}`)),
    artifactOutputRefs: sortedUnique(slice.artifactOutputRefs),
    rollbackStrategy: slice.rollbackStrategy,
    evidenceRefs: sortedUnique(slice.evidenceRefs),
    compilerVersion: TASK_CARD_COMPILER_VERSION,
    fingerprint: contentFingerprint({ placeholder: slice.id }),
  };
  return taskCardSchema.parse({
    ...base,
    fingerprint: calculateTaskCardFingerprint(base as unknown as TaskCard),
  });
}

export function validateTaskCard(input: unknown): TaskCardValidationReport {
  const parsedTaskCard = taskCardSchema.safeParse(input);
  if (!parsedTaskCard.success) {
    const sourceSliceId = z
      .object({ sourceSliceId: implementationSliceSchema.shape.id })
      .passthrough()
      .safeParse(input).data?.sourceSliceId;
    const evidenceRefs = z
      .object({ evidenceRefs: z.array(z.string().trim().min(1)) })
      .passthrough()
      .safeParse(input).data?.evidenceRefs ?? ["evidence:task-card-validation"];
    const findings = sortTaskCardFindings(
      parsedTaskCard.error.issues.map((issue) =>
        createTaskCardFinding({
          ruleId: issue.message.includes("overlap protected files")
            ? "task_card.protected_file_boundary"
            : "task_card.schema_validity",
          category: "structural",
          severity: "blocking",
          message: issue.message,
          evidenceRefs,
          affectedEntityIds: [String(issue.path.join(".") || "task_card")],
          remediation: "Regenerate the Task Card from an approved Implementation Slice.",
          evaluatorVersion: TASK_CARD_COMPILER_VERSION,
        }),
      ),
    );
    return taskCardValidationReportSchema.parse({
      taskCard: null,
      sourceSliceId: sourceSliceId ?? null,
      status: "blocked",
      findings,
      compilerVersion: TASK_CARD_COMPILER_VERSION,
      fingerprint: contentFingerprint({
        sourceSliceId: sourceSliceId ?? null,
        findings,
        compilerVersion: TASK_CARD_COMPILER_VERSION,
      }),
    });
  }
  const taskCard = parsedTaskCard.data;
  const findings = [];
  const writable = new Set(taskCard.fileBoundaries.writableFiles);
  const protectedEntries = taskCard.fileBoundaries.protectedFiles.filter((entry) =>
    writable.has(entry),
  );
  if (protectedEntries.length > 0)
    findings.push(
      createTaskCardFinding({
        ruleId: "task_card.protected_file_boundary",
        category: "controlled_living",
        severity: "blocking",
        message: `Task Card marks protected files writable: ${protectedEntries.join(", ")}`,
        evidenceRefs: taskCard.evidenceRefs,
        affectedEntityIds: [taskCard.taskCardId, ...protectedEntries],
        remediation: "Remove protected paths from writable boundaries before execution.",
        evaluatorVersion: TASK_CARD_COMPILER_VERSION,
      }),
    );
  if (taskCard.validations.length === 0)
    findings.push(
      createTaskCardFinding({
        ruleId: "task_card.validation_required",
        category: "testability",
        severity: "blocking",
        message: "Task Card has no execution validation requirements",
        evidenceRefs: taskCard.evidenceRefs,
        affectedEntityIds: [taskCard.taskCardId],
        remediation: "Attach pre-execution boundary checks and post-execution validations.",
        evaluatorVersion: TASK_CARD_COMPILER_VERSION,
      }),
    );
  const sortedFindings = sortTaskCardFindings(findings);
  return taskCardValidationReportSchema.parse({
    taskCard,
    sourceSliceId: taskCard.sourceSliceId,
    status: sortedFindings.some((finding) => finding.severity === "blocking") ? "blocked" : "valid",
    findings: sortedFindings,
    compilerVersion: TASK_CARD_COMPILER_VERSION,
    fingerprint: contentFingerprint({
      taskCardFingerprint: taskCard.fingerprint,
      findings: sortedFindings,
      compilerVersion: TASK_CARD_COMPILER_VERSION,
    }),
  });
}

export function compileTaskCard(input: unknown): TaskCardValidationReport {
  const parsed = compileInputSchema.parse(input);
  const taskCard = buildTaskCard(parsed);
  return validateTaskCard(taskCard);
}

export function serializeTaskCard(taskCard: TaskCard): string {
  return stableJson(taskCardSchema.parse(taskCard) as unknown as JsonValue);
}
