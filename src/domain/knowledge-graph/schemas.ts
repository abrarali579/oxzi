import { z } from "zod";

import {
  approvalStatusSchema,
  lifecycleStatusSchema,
  projectIdSchema,
  versionIdSchema,
  timestampSchema,
} from "../project";
import {
  derivationMethodSchema,
  graphEdgeTypeSchema,
  graphNodeTypeSchema,
  mandatoryCoverageStatusSchema,
  measurementStatusSchema,
  traversalDirectionSchema,
} from "./enums";
import { contentFingerprintSchema, graphEdgeIdSchema, graphNodeIdSchema } from "./identifiers";
import type { JsonValue, KnowledgeGraph } from "./types";
import { freshnessMetadataSchema, temporalMetadataSchema } from "./temporal";

function isJsonValue(value: unknown, seen = new Set<object>()): value is JsonValue {
  if (value === null || typeof value === "string" || typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value !== "object") return false;
  if (seen.has(value)) return false;
  seen.add(value);
  if (Array.isArray(value)) return value.every((item) => isJsonValue(item, seen));
  if (Object.getPrototypeOf(value) !== Object.prototype) return false;
  return Object.values(value).every((item) => isJsonValue(item, seen));
}

export const jsonValueSchema = z.custom<JsonValue>(isJsonValue, "Must be JSON-safe data");
const stringReferenceSchema = z.string().trim().min(1);

export const graphLifecycleMetadataSchema = z
  .object({
    projectLifecycle: lifecycleStatusSchema,
    canonicalVersionId: versionIdSchema,
    canonicalVersionNumber: z.number().int().positive(),
  })
  .strict();

export const knowledgeGraphNodeSchema = z
  .object({
    id: graphNodeIdSchema,
    type: graphNodeTypeSchema,
    label: z.string().trim().min(1),
    sourceRefs: z.array(stringReferenceSchema).min(1),
    evidenceRefs: z.array(stringReferenceSchema),
    confidence: z.number().finite().min(0).max(100),
    lifecycle: graphLifecycleMetadataSchema,
    temporal: temporalMetadataSchema,
    freshness: freshnessMetadataSchema,
    provenance: z
      .object({
        derivationMethod: derivationMethodSchema,
        episodeRefs: z.array(stringReferenceSchema),
      })
      .strict(),
    schemaVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
    projectorVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
    order: z.number().int().nonnegative(),
    approvalStatus: approvalStatusSchema.optional(),
    attributes: z.record(z.string(), jsonValueSchema),
    fingerprint: contentFingerprintSchema,
  })
  .strict();

export const knowledgeGraphEdgeSchema = z
  .object({
    id: graphEdgeIdSchema,
    type: graphEdgeTypeSchema,
    fromNodeId: graphNodeIdSchema,
    toNodeId: graphNodeIdSchema,
    sourceRefs: z.array(stringReferenceSchema).min(1),
    evidenceRefs: z.array(stringReferenceSchema),
    confidence: z.number().finite().min(0).max(100),
    lifecycle: graphLifecycleMetadataSchema,
    temporal: temporalMetadataSchema,
    freshness: freshnessMetadataSchema,
    provenance: z
      .object({
        derivationMethod: derivationMethodSchema,
        episodeRefs: z.array(stringReferenceSchema),
      })
      .strict(),
    schemaVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
    projectorVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
    order: z.number().int().nonnegative(),
    approvalStatus: approvalStatusSchema.optional(),
    inferred: z.boolean(),
    fingerprint: contentFingerprintSchema,
  })
  .strict();

export const knowledgeGraphMetadataSchema = z
  .object({
    projectId: projectIdSchema,
    canonicalVersionId: versionIdSchema,
    canonicalVersionNumber: z.number().int().positive(),
    canonicalProjectHash: contentFingerprintSchema,
    graphSchemaVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
    projectorVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
    graphFingerprint: contentFingerprintSchema,
    projectedAt: timestampSchema,
  })
  .strict();

export const knowledgeGraphSchema = z
  .object({
    metadata: knowledgeGraphMetadataSchema,
    nodes: z.array(knowledgeGraphNodeSchema),
    edges: z.array(knowledgeGraphEdgeSchema),
  })
  .strict()
  .superRefine((graph, context) => {
    const nodeIds = new Set<string>();
    const edgeIds = new Set<string>();
    graph.nodes.forEach((node, index) => {
      if (nodeIds.has(node.id)) {
        context.addIssue({
          code: "custom",
          path: ["nodes", index, "id"],
          message: "Duplicate node ID",
        });
      }
      nodeIds.add(node.id);
      if (node.order !== index) {
        context.addIssue({
          code: "custom",
          path: ["nodes", index, "order"],
          message: "Node order must be contiguous and match serialized order",
        });
      }
      if (new Set(node.sourceRefs).size !== node.sourceRefs.length) {
        context.addIssue({
          code: "custom",
          path: ["nodes", index, "sourceRefs"],
          message: "Source references must be unique",
        });
      }
      if (new Set(node.evidenceRefs).size !== node.evidenceRefs.length) {
        context.addIssue({
          code: "custom",
          path: ["nodes", index, "evidenceRefs"],
          message: "Evidence references must be unique",
        });
      }
    });
    graph.nodes.forEach((node, index) => {
      if (node.temporal.supersededBy && !nodeIds.has(node.temporal.supersededBy)) {
        context.addIssue({
          code: "custom",
          path: ["nodes", index, "temporal", "supersededBy"],
          message: "Superseded-by reference must target a graph node",
        });
      }
    });
    graph.edges.forEach((edge, index) => {
      if (edgeIds.has(edge.id)) {
        context.addIssue({
          code: "custom",
          path: ["edges", index, "id"],
          message: "Duplicate edge ID",
        });
      }
      edgeIds.add(edge.id);
      if (!nodeIds.has(edge.fromNodeId) || !nodeIds.has(edge.toNodeId)) {
        context.addIssue({
          code: "custom",
          path: ["edges", index],
          message: "Graph edges cannot contain dangling node references",
        });
      }
      if (edge.order !== index) {
        context.addIssue({
          code: "custom",
          path: ["edges", index, "order"],
          message: "Edge order must be contiguous and match serialized order",
        });
      }
    });
  });

export const tokenEstimateSchema = z
  .object({ value: z.number().int().nonnegative().nullable(), status: measurementStatusSchema })
  .strict();

export const truncationMetadataSchema = z
  .object({
    truncated: z.boolean(),
    reasons: z.array(z.string().trim().min(1)),
    omittedNodeCount: z.number().int().nonnegative(),
    omittedCategories: z.array(graphNodeTypeSchema),
    mandatoryCoverageStatus: mandatoryCoverageStatusSchema,
    minimumSafeTokenEstimate: tokenEstimateSchema,
  })
  .strict();

export const traversalVisitSchema = z
  .object({
    nodeId: graphNodeIdSchema,
    depth: z.number().int().nonnegative(),
    pathNodeIds: z.array(graphNodeIdSchema).min(1),
    pathEdgeIds: z.array(graphEdgeIdSchema),
    minimumPathConfidence: z.number().min(0).max(100),
  })
  .strict();

export const traversalResultSchema = z
  .object({
    seedNodeIds: z.array(graphNodeIdSchema).min(1),
    direction: traversalDirectionSchema,
    visits: z.array(traversalVisitSchema).min(1),
    traversedEdgeIds: z.array(graphEdgeIdSchema),
    uncertainEdgeIds: z.array(graphEdgeIdSchema),
    suppressedHubNodeIds: z.array(graphNodeIdSchema),
    cyclesDetected: z.array(
      z
        .object({
          fromNodeId: graphNodeIdSchema,
          toNodeId: graphNodeIdSchema,
          edgeId: graphEdgeIdSchema,
        })
        .strict(),
    ),
    truncation: truncationMetadataSchema,
  })
  .strict();

export function parseKnowledgeGraph(input: unknown): KnowledgeGraph {
  return knowledgeGraphSchema.parse(input) as KnowledgeGraph;
}
