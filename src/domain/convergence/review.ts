import { contentFingerprint } from "../knowledge-graph";
import { taskCardSchema, type TaskCard } from "../task-card";
import {
  codeModificationPatchSchema,
  convergenceReportSchema,
  type CodeModificationPatch,
  type ConvergenceReport,
} from "./schemas";

export function reviewConvergence(input: { taskCard: unknown; patch: unknown }): ConvergenceReport {
  const taskCard = taskCardSchema.parse(input.taskCard) as TaskCard;
  const patch = codeModificationPatchSchema.parse(input.patch) as CodeModificationPatch;

  const boundaries = taskCard.fileBoundaries;
  const protectedSet = new Set(boundaries.protectedFiles);
  const allPermittedSet = new Set(boundaries.writableFiles);

  const violations: {
    filePath: string;
    violation: "protected_file_modified" | "out_of_scope_file_modified";
    detail: string;
  }[] = [];

  const verifiedFilePaths: string[] = [];

  for (const filePath of patch.modifiedFilePaths) {
    if (protectedSet.has(filePath)) {
      violations.push({
        filePath,
        violation: "protected_file_modified",
        detail: `File "${filePath}" is in the protected file boundary and must not be modified`,
      });
    } else if (!allPermittedSet.has(filePath)) {
      violations.push({
        filePath,
        violation: "out_of_scope_file_modified",
        detail: `File "${filePath}" is not in the writable scope for this task card`,
      });
    } else {
      verifiedFilePaths.push(filePath);
    }
  }

  const status = violations.length === 0 ? "APPROVED" : "REJECTED";

  return convergenceReportSchema.parse({
    taskCardId: taskCard.taskCardId,
    status,
    violations,
    verifiedFilePaths,
    fingerprint: contentFingerprint({
      taskCardId: taskCard.taskCardId,
      modifiedFilePaths: patch.modifiedFilePaths,
      violations,
    }),
  });
}

export function serializeConvergenceReport(report: ConvergenceReport): string {
  return convergenceReportSchema.parse(report) as unknown as string;
}
