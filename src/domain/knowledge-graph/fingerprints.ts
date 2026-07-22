import { serializeCanonicalProject, type CanonicalProject } from "../project";
import { contentFingerprintSchema, graphEdgeIdSchema, graphNodeIdSchema } from "./identifiers";
import { parseKnowledgeGraph } from "./schemas";
import type { ContentFingerprint, GraphEdgeId, GraphNodeId } from "./identifiers";
import type {
  JsonValue,
  KnowledgeGraph,
  KnowledgeGraphEdgeInput,
  KnowledgeGraphMetadata,
  KnowledgeGraphNodeInput,
} from "./types";

export const GRAPH_SCHEMA_VERSION = "2.0.0";
export const GRAPH_PROJECTOR_VERSION = "2.0.0";

function sortedJsonValue(value: JsonValue): JsonValue {
  if (Array.isArray(value)) return value.map(sortedJsonValue);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, sortedJsonValue(nested)]),
    );
  }
  return value;
}

export function stableJson(value: JsonValue): string {
  return JSON.stringify(sortedJsonValue(value));
}

export function contentFingerprint(value: JsonValue): ContentFingerprint {
  const input = stableJson(value);
  let first = 2166136261;
  let second = 2246822507;
  for (const byte of new TextEncoder().encode(input)) {
    first ^= byte;
    first = Math.imul(first, 16777619);
    second ^= byte;
    second = Math.imul(second, 3266489909);
  }
  const hexadecimal = `${(first >>> 0).toString(16).padStart(8, "0")}${(second >>> 0)
    .toString(16)
    .padStart(8, "0")}`;
  return contentFingerprintSchema.parse(`fp_f1_${hexadecimal}`);
}

function identitySlug(value: string): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("en-US")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);
}

function fingerprintSuffix(value: string): string {
  return contentFingerprint(value).replace("fp_f1_", "").slice(0, 12);
}

export function createGraphNodeId(type: string, stableKey: string): GraphNodeId {
  const slug = identitySlug(type);
  return graphNodeIdSchema.parse(`kg_node_${slug}_${fingerprintSuffix(stableKey)}`);
}

export function createGraphEdgeId(
  type: string,
  fromNodeId: GraphNodeId,
  toNodeId: GraphNodeId,
  stableKey = "primary",
): GraphEdgeId {
  const slug = identitySlug(type);
  return graphEdgeIdSchema.parse(
    `kg_edge_${slug}_${fingerprintSuffix(`${fromNodeId}:${toNodeId}:${stableKey}`)}`,
  );
}

export function canonicalProjectFingerprint(project: CanonicalProject): ContentFingerprint {
  return contentFingerprint(JSON.parse(serializeCanonicalProject(project)) as JsonValue);
}

type FinalizeGraphInput = {
  metadata: Omit<KnowledgeGraphMetadata, "graphFingerprint" | "projectedAt"> & {
    projectedAt?: string;
  };
  nodes: KnowledgeGraphNodeInput[];
  edges: KnowledgeGraphEdgeInput[];
};

export function finalizeKnowledgeGraph(input: FinalizeGraphInput): KnowledgeGraph {
  const projectedAt = input.metadata.projectedAt ?? "1970-01-01T00:00:00.000Z";
  const common = (record: KnowledgeGraphNodeInput | KnowledgeGraphEdgeInput) => ({
    temporal: record.temporal ?? {
      observedAt: projectedAt,
      sourceCreatedAt: projectedAt,
      ingestedAt: projectedAt,
      effectiveFrom: projectedAt,
      effectiveTo: null,
      invalidatedAt: null,
      supersededAt: null,
      supersededBy: null,
      currentStatus: "current" as const,
    },
    freshness: record.freshness ?? {
      status: "current" as const,
      checkedAt: projectedAt,
      reason: null,
    },
    provenance: record.provenance ?? {
      derivationMethod: record.sourceRefs.some((reference) => reference.startsWith("canonical:"))
        ? ("canonical" as const)
        : ("inferred" as const),
      episodeRefs: [...new Set(record.evidenceRefs)].sort(),
    },
    schemaVersion: record.schemaVersion ?? GRAPH_SCHEMA_VERSION,
    projectorVersion: record.projectorVersion ?? GRAPH_PROJECTOR_VERSION,
  });
  const nodes = [...input.nodes]
    .sort((left, right) => left.type.localeCompare(right.type) || left.id.localeCompare(right.id))
    .map((node, order) => ({
      ...node,
      ...common(node),
      sourceRefs: [...new Set(node.sourceRefs)].sort(),
      evidenceRefs: [...new Set(node.evidenceRefs)].sort(),
      order,
      fingerprint: contentFingerprint({
        id: node.id,
        type: node.type,
        label: node.label,
        sourceRefs: [...new Set(node.sourceRefs)].sort(),
        evidenceRefs: [...new Set(node.evidenceRefs)].sort(),
        confidence: node.confidence,
        lifecycle: node.lifecycle,
        ...common(node),
        approvalStatus: node.approvalStatus ?? null,
        attributes: node.attributes,
      } as JsonValue),
    }));
  const edges = [...input.edges]
    .sort(
      (left, right) =>
        left.type.localeCompare(right.type) ||
        left.fromNodeId.localeCompare(right.fromNodeId) ||
        left.toNodeId.localeCompare(right.toNodeId) ||
        left.id.localeCompare(right.id),
    )
    .map((edge, order) => ({
      ...edge,
      ...common(edge),
      sourceRefs: [...new Set(edge.sourceRefs)].sort(),
      evidenceRefs: [...new Set(edge.evidenceRefs)].sort(),
      order,
      fingerprint: contentFingerprint({
        id: edge.id,
        type: edge.type,
        fromNodeId: edge.fromNodeId,
        toNodeId: edge.toNodeId,
        sourceRefs: [...new Set(edge.sourceRefs)].sort(),
        evidenceRefs: [...new Set(edge.evidenceRefs)].sort(),
        confidence: edge.confidence,
        lifecycle: edge.lifecycle,
        ...common(edge),
        approvalStatus: edge.approvalStatus ?? null,
        inferred: edge.inferred,
      } as JsonValue),
    }));
  const metadata = { ...input.metadata, projectedAt };
  const graphWithoutFingerprint = { metadata, nodes, edges };
  return parseKnowledgeGraph({
    ...graphWithoutFingerprint,
    metadata: {
      ...metadata,
      graphFingerprint: contentFingerprint(graphWithoutFingerprint as unknown as JsonValue),
    },
  });
}

export function serializeKnowledgeGraph(input: unknown): string {
  const graph = parseKnowledgeGraph(input);
  return stableJson(graph as unknown as JsonValue);
}
