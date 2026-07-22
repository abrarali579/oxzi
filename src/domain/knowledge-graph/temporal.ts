import { z } from "zod";

import { timestampSchema } from "../project";
import { freshnessStatusSchema, temporalQueryModeSchema, temporalStatusSchema } from "./enums";
import { graphNodeIdSchema } from "./identifiers";
import type { KnowledgeGraphEdge, KnowledgeGraphNode, TemporalQuery } from "./types";

export const temporalMetadataSchema = z
  .object({
    observedAt: timestampSchema,
    sourceCreatedAt: timestampSchema,
    ingestedAt: timestampSchema,
    effectiveFrom: timestampSchema,
    effectiveTo: timestampSchema.nullable(),
    invalidatedAt: timestampSchema.nullable(),
    supersededAt: timestampSchema.nullable(),
    supersededBy: graphNodeIdSchema.nullable(),
    currentStatus: temporalStatusSchema,
  })
  .strict()
  .superRefine((value, context) => {
    const from = Date.parse(value.effectiveFrom);
    const to = value.effectiveTo ? Date.parse(value.effectiveTo) : null;
    if (to !== null && to <= from) {
      context.addIssue({
        code: "custom",
        path: ["effectiveTo"],
        message: "Effective end must follow effective start",
      });
    }
    if (value.currentStatus === "superseded" && !value.supersededAt) {
      context.addIssue({
        code: "custom",
        path: ["supersededAt"],
        message: "Superseded records require supersededAt",
      });
    }
  });

export const freshnessMetadataSchema = z
  .object({
    status: freshnessStatusSchema,
    checkedAt: timestampSchema,
    reason: z.string().trim().min(1).nullable(),
  })
  .strict();

export const temporalQuerySchema = z
  .object({ mode: temporalQueryModeSchema, asOf: timestampSchema.optional() })
  .strict()
  .superRefine((value, context) => {
    if (value.mode === "historical" && !value.asOf) {
      context.addIssue({
        code: "custom",
        path: ["asOf"],
        message: "Historical queries require asOf",
      });
    }
  });

export function isTemporallyValid(
  record: Pick<KnowledgeGraphNode | KnowledgeGraphEdge, "temporal">,
  query: TemporalQuery = { mode: "current" },
): boolean {
  if (query.mode === "all") return true;
  if (query.mode === "current") {
    return record.temporal.currentStatus === "current" && record.temporal.effectiveTo === null;
  }
  const at = Date.parse(query.asOf!);
  return (
    Date.parse(record.temporal.effectiveFrom) <= at &&
    (record.temporal.effectiveTo === null || at < Date.parse(record.temporal.effectiveTo))
  );
}
