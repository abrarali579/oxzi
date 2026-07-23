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

// ── Step 9: Spec-to-Code Convergence ────────────────────────────

export const divergenceSeveritySchema = z.enum(["CRITICAL", "WARNING"]);

export const divergenceItemSchema = z
  .object({
    criterionId: nonempty,
    severity: divergenceSeveritySchema,
    message: nonempty,
    targetFile: nonempty,
  })
  .strict();

export const convergenceItemSchema = z
  .object({
    criterionId: nonempty,
    status: z.enum(["pass", "fail", "skip"]),
    detail: nonempty,
    targetFile: nonempty,
  })
  .strict();

export const convergenceMatrixSchema = z
  .object({
    totalCriteria: z.number().int().nonnegative(),
    passed: z.number().int().nonnegative(),
    failed: z.number().int().nonnegative(),
    skipped: z.number().int().nonnegative(),
    score: z.number().min(0).max(100),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.passed + value.failed + value.skipped !== value.totalCriteria) {
      context.addIssue({
        code: "custom",
        path: ["totalCriteria"],
        message: "passed + failed + skipped must equal totalCriteria",
      });
    }
  });

export const specToCodeConvergenceReportSchema = z
  .object({
    reportId: nonempty,
    taskCardId: taskCardIdSchema,
    status: z.enum(["CONVERGED", "DIVERGED"]),
    score: z.number().min(0).max(100),
    divergences: z.array(divergenceItemSchema),
    convergences: z.array(convergenceItemSchema),
    matrix: convergenceMatrixSchema,
    timestamp: nonempty,
    fingerprint: contentFingerprintSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (value.status === "DIVERGED" && value.divergences.length === 0) {
      context.addIssue({
        code: "custom",
        path: ["divergences"],
        message: "A DIVERGED report must include at least one divergence item",
      });
    }
  });

// ── Legacy schemas (kept for backward compat) ──────────────────

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
export type DivergenceItem = z.infer<typeof divergenceItemSchema>;
export type ConvergenceItem = z.infer<typeof convergenceItemSchema>;
export type ConvergenceMatrix = z.infer<typeof convergenceMatrixSchema>;
export type SpecToCodeConvergenceReport = z.infer<typeof specToCodeConvergenceReportSchema>;