import { contentFingerprint, stableJson, type JsonValue } from "../knowledge-graph";
import { taskCardSchema, type TaskCard } from "../task-card";
import {
  compiledContextIdSchema,
  compiledContextSchema,
  contextCompilerInputSchema,
  contextItemIdSchema,
  type CompiledContext,
  type ContextItem,
  type ContextSelectionReason,
} from "./schemas";

export const CONTEXT_COMPILER_VERSION = "context-compiler-canonical-v1.0.0";

const characterEstimate = (text: string) => Math.ceil(text.length / 4);
const sortedUnique = <T extends string>(values: readonly T[]): T[] => [...new Set(values)].sort();
const suffix = (value: JsonValue) => contentFingerprint(value).replace("fp_f1_", "");

function contextItemId(value: JsonValue) {
  return contextItemIdSchema.parse(`context_item_${suffix(value)}`);
}

function compiledContextId(taskCard: TaskCard) {
  return compiledContextIdSchema.parse(
    `compiled_context_${suffix({
      taskCardId: taskCard.taskCardId,
      taskCardFingerprint: taskCard.fingerprint,
      compilerVersion: CONTEXT_COMPILER_VERSION,
    })}`,
  );
}

function calculateContextItemFingerprint(item: Omit<ContextItem, "fingerprint">) {
  return contentFingerprint(item as unknown as JsonValue);
}

function calculateCompiledContextFingerprint(context: Omit<CompiledContext, "fingerprint">) {
  return contentFingerprint(context as unknown as JsonValue);
}

function specificationText(specification: {
  title: string;
  what: string[];
  why: string[];
  actors: string[];
  outcomes: string[];
  constraints: string[];
  scope: string[];
  exclusions: string[];
  acceptanceCriteria: { id: string; statement: string; verificationRefs: string[] }[];
}) {
  return [
    `Specification: ${specification.title}`,
    `What: ${specification.what.join("; ")}`,
    `Why: ${specification.why.join("; ")}`,
    `Actors: ${specification.actors.join("; ")}`,
    `Outcomes: ${specification.outcomes.join("; ")}`,
    `Scope: ${specification.scope.join("; ")}`,
    `Exclusions: ${specification.exclusions.join("; ") || "none"}`,
    `Constraints: ${specification.constraints.join("; ") || "none"}`,
    `Acceptance Criteria: ${specification.acceptanceCriteria
      .map(
        (criterion) =>
          `${criterion.id}: ${criterion.statement} [${criterion.verificationRefs.join(", ") || "no verification refs"}]`,
      )
      .join("; ")}`,
  ].join("\n");
}

function decisionText(decision: {
  title: string;
  decision: string;
  rationale: string;
  status: string;
}) {
  return [
    `Decision: ${decision.title}`,
    `Status: ${decision.status}`,
    `Decision: ${decision.decision}`,
    `Rationale: ${decision.rationale}`,
  ].join("\n");
}

function constitutionRuleText(rule: {
  title: string;
  description: string;
  category: string;
  severity: string;
  verificationMethod: string;
  violationConsequence: string;
}) {
  return [
    `Constitution Rule: ${rule.title}`,
    `Category: ${rule.category}`,
    `Severity: ${rule.severity}`,
    `Rule: ${rule.description}`,
    `Verification: ${rule.verificationMethod}`,
    `Violation Consequence: ${rule.violationConsequence}`,
  ].join("\n");
}

function buildItem(input: {
  artifactKind: ContextItem["artifactKind"];
  artifactId: string;
  title: string;
  text: string;
  selectionReasons: ContextSelectionReason[];
  sourceRefs: string[];
  evidenceRefs: string[];
}): ContextItem {
  const base = {
    id: contextItemId({
      artifactKind: input.artifactKind,
      artifactId: input.artifactId,
      selectionReasons: sortedUnique(input.selectionReasons),
    }),
    artifactKind: input.artifactKind,
    artifactId: input.artifactId,
    title: input.title,
    text: input.text,
    selectionReasons: sortedUnique(input.selectionReasons),
    sourceRefs: sortedUnique(input.sourceRefs),
    evidenceRefs: sortedUnique(input.evidenceRefs),
  };
  return {
    ...base,
    fingerprint: calculateContextItemFingerprint(base),
  };
}

export function compileCanonicalContext(input: unknown): CompiledContext {
  const parsed = contextCompilerInputSchema.parse(input);
  const taskCard = taskCardSchema.parse(parsed.taskCard);
  const items: ContextItem[] = [];
  const omittedRefs: string[] = [];

  const specification = parsed.specifications.find(
    (candidate) =>
      candidate.id === taskCard.specificationId &&
      candidate.version === taskCard.specificationVersion,
  );
  if (specification) {
    const reasons: ContextSelectionReason[] = ["task_specification_reference"];
    if (
      specification.acceptanceCriteria.some((criterion) =>
        taskCard.acceptanceCriteria.includes(criterion.id),
      )
    )
      reasons.push("task_acceptance_criterion_reference");
    items.push(
      buildItem({
        artifactKind: "specification",
        artifactId: specification.id,
        title: specification.title,
        text: specificationText(specification),
        selectionReasons: reasons,
        sourceRefs: specification.sourceRefs,
        evidenceRefs: specification.evidenceRefs,
      }),
    );
  } else {
    omittedRefs.push(
      `missing-specification:${taskCard.specificationId}@${taskCard.specificationVersion}`,
    );
  }

  for (const decision of parsed.decisions) {
    if (
      taskCard.constraints.some((constraint) => constraint.includes(decision.id)) ||
      taskCard.evidenceRefs.some((evidenceRef) => decision.fieldIds.includes(evidenceRef as never))
    ) {
      items.push(
        buildItem({
          artifactKind: "decision",
          artifactId: decision.id,
          title: decision.title,
          text: decisionText(decision),
          selectionReasons: ["task_constraint_reference"],
          sourceRefs: [],
          evidenceRefs: [],
        }),
      );
    }
  }

  for (const rule of parsed.constitutionRules) {
    const referencedByConstraint = taskCard.constraints.some((constraint) =>
      constraint.includes(rule.id),
    );
    const referencedByFingerprint = taskCard.constitutionFingerprint === rule.fingerprint;
    const globallyBlocking = rule.severity === "blocking";
    if (!referencedByConstraint && !referencedByFingerprint && !globallyBlocking) continue;
    const reasons: ContextSelectionReason[] = [];
    if (referencedByConstraint) reasons.push("task_constraint_reference");
    if (referencedByFingerprint) reasons.push("task_constitution_fingerprint");
    if (globallyBlocking) reasons.push("global_blocking_constitution_rule");
    items.push(
      buildItem({
        artifactKind: "constitution_rule",
        artifactId: rule.id,
        title: rule.title,
        text: constitutionRuleText(rule),
        selectionReasons: reasons,
        sourceRefs: rule.sourceRefs,
        evidenceRefs: rule.evidenceRefs,
      }),
    );
  }

  const orderedItems = [...new Map(items.map((item) => [item.id, item])).values()].sort(
    (left, right) =>
      left.artifactKind.localeCompare(right.artifactKind) ||
      left.artifactId.localeCompare(right.artifactId),
  );
  const limitationRefs = [
    "canonical-v1:no-code-parsing",
    "canonical-v1:no-ast-traversal",
    "canonical-v1:no-structural-search",
  ];
  const base = {
    id: compiledContextId(taskCard),
    taskCardId: taskCard.taskCardId,
    taskCardFingerprint: taskCard.fingerprint,
    mode: "canonical_v1" as const,
    items: orderedItems,
    codeContext: [],
    resolvedSpecificationIds: specification ? [specification.id] : [],
    omittedRefs: sortedUnique(omittedRefs),
    limitationRefs,
    sufficiency:
      orderedItems.length > 0 && omittedRefs.length === 0
        ? ("sufficient" as const)
        : ("insufficient" as const),
    metadata: {
      compilerVersion: CONTEXT_COMPILER_VERSION,
      canonicalOnly: true as const,
      codeAwareCompilation: false as const,
      inclusionPolicy: "smallest-sufficient-canonical-artifacts-v1",
      minimumSafeContextEstimate: characterEstimate(
        orderedItems.map((item) => item.text).join("\n\n"),
      ),
    },
  };
  return compiledContextSchema.parse({
    ...base,
    fingerprint: calculateCompiledContextFingerprint(base),
  });
}

export function serializeCompiledContext(context: CompiledContext): string {
  return stableJson(compiledContextSchema.parse(context) as unknown as JsonValue);
}
