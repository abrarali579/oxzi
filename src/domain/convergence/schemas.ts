import { z } from "zod";

import { contentFingerprintSchema } from "../knowledge-graph";
import { taskCardIdSchema } from "../task-card";

const nonempty = z.string().trim().min(1);
const refs = z.array(nonempty);

export const codeModificationPatchSchema = z
  .object({
    taskCardId: taskCardIdSchema,
    modifiedFilePaths: refs.min(1),
  })
  .strict();

export const boundaryViolationSchema = z
  .object({
    filePath: nonempty,
    violation: z.enum(["protected_file_modified", "out_of_scope_file_modified"]),
    detail: nonempty,
  })
  .strict();

export const convergenceReportSchema = z
  .object({
    taskCardId: taskCardIdSchema,
    status: z.enum(["APPROVED", "REJECTED"]),
    violations: z.array(boundaryViolationSchema),
    verifiedFilePaths: refs,
    fingerprint: contentFingerprintSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (value.status === "REJECTED" && value.violations.length === 0) {
      context.addIssue({
        code: "custom",
        path: ["violations"],
        message: "A REJECTED convergence report must include at least one violation",
      });
    }
    if (value.status === "APPROVED" && value.violations.length > 0) {
      context.addIssue({
        code: "custom",
        path: ["violations"],
        message: "An APPROVED convergence report must have no violations",
      });
    }
  });

export type CodeModificationPatch = z.infer<typeof codeModificationPatchSchema>;
export type BoundaryViolation = z.infer<typeof boundaryViolationSchema>;
export type ConvergenceReport = z.infer<typeof convergenceReportSchema>;
