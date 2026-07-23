import { contentFingerprint, type JsonValue } from "../knowledge-graph";
import { governanceFindingIdSchema, type GovernanceFinding } from "../governance";
import { taskCardIdSchema } from "./schemas";

export const TASK_CARD_COMPILER_VERSION = "task-card-compiler-1.0.0";

const suffix = (value: JsonValue) => contentFingerprint(value).replace("fp_f1_", "");

export function createTaskCardId(sliceId: string, sliceVersion: number) {
  return taskCardIdSchema.parse(`task_card_${suffix({ sliceId, sliceVersion })}`);
}

export function createTaskCardFinding(input: Omit<GovernanceFinding, "id">): GovernanceFinding {
  return {
    ...input,
    id: governanceFindingIdSchema.parse(
      `governance_finding_${suffix({
        ruleId: input.ruleId,
        category: input.category,
        severity: input.severity,
        affectedEntityIds: [...input.affectedEntityIds].sort(),
      })}`,
    ),
    evidenceRefs: [...new Set(input.evidenceRefs)].sort(),
    affectedEntityIds: [...new Set(input.affectedEntityIds)].sort(),
  };
}

export function sortTaskCardFindings(findings: GovernanceFinding[]): GovernanceFinding[] {
  const rank = { blocking: 0, warning: 1, info: 2 } as const;
  return [...findings].sort(
    (left, right) =>
      rank[left.severity] - rank[right.severity] ||
      left.ruleId.localeCompare(right.ruleId) ||
      left.id.localeCompare(right.id),
  );
}
