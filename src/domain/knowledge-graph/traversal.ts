import { buildKnowledgeGraphIndexes } from "./indexes";
import { parseKnowledgeGraph, traversalResultSchema } from "./schemas";
import type { GraphEdgeType, GraphNodeType } from "./enums";
import type { GraphEdgeId, GraphNodeId } from "./identifiers";
import type {
  KnowledgeGraphEdge,
  TraversalOptions,
  TraversalResult,
  TraversalVisit,
} from "./types";
import { isTemporallyValid, temporalQuerySchema } from "./temporal";

const DEFAULT_MAX_DEPTH = 3;
const DEFAULT_RESULT_LIMIT = 100;
const DEFAULT_HUB_THRESHOLD = 25;
const DEFAULT_UNCERTAINTY_THRESHOLD = 80;
const GENERIC_HUB_TYPES = new Set<GraphNodeType>(["project", "version", "documentation_artifact"]);

function uniqueSorted<T extends string>(values: Iterable<T>): T[] {
  return [...new Set(values)].sort();
}

function adjacentEdges(
  nodeId: GraphNodeId,
  direction: "forward" | "reverse",
  indexes: ReturnType<typeof buildKnowledgeGraphIndexes>,
  relationshipTypes?: Set<GraphEdgeType>,
): readonly KnowledgeGraphEdge[] {
  const edges =
    direction === "forward"
      ? (indexes.outgoingByNodeId.get(nodeId) ?? [])
      : (indexes.incomingByNodeId.get(nodeId) ?? []);
  return relationshipTypes ? edges.filter((edge) => relationshipTypes.has(edge.type)) : edges;
}

function neighborId(edge: KnowledgeGraphEdge, direction: "forward" | "reverse") {
  return direction === "forward" ? edge.toNodeId : edge.fromNodeId;
}

export function traverseKnowledgeGraph(input: unknown, options: TraversalOptions): TraversalResult {
  const graph = parseKnowledgeGraph(input);
  const indexes = buildKnowledgeGraphIndexes(graph);
  const direction = options.direction ?? "forward";
  const maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH;
  const resultLimit = options.resultLimit ?? DEFAULT_RESULT_LIMIT;
  const highDegreeThreshold = options.highDegreeThreshold ?? DEFAULT_HUB_THRESHOLD;
  const uncertaintyThreshold = options.uncertaintyThreshold ?? DEFAULT_UNCERTAINTY_THRESHOLD;
  const minimumConfidence = options.minimumConfidence ?? 0;
  const temporalQuery = temporalQuerySchema.parse(options.temporalQuery ?? { mode: "current" });
  if (!Number.isInteger(maxDepth) || maxDepth < 0)
    throw new Error("maxDepth must be a nonnegative integer");
  if (!Number.isInteger(resultLimit) || resultLimit < 1)
    throw new Error("resultLimit must be a positive integer");
  if (!Number.isInteger(highDegreeThreshold) || highDegreeThreshold < 1) {
    throw new Error("highDegreeThreshold must be a positive integer");
  }

  const seedNodeIds = uniqueSorted(options.seedNodeIds);
  if (seedNodeIds.length === 0) throw new Error("Traversal requires at least one seed node");
  for (const seedNodeId of seedNodeIds) {
    if (!indexes.nodeById.has(seedNodeId)) throw new Error(`Unknown traversal seed ${seedNodeId}`);
  }
  const relationshipTypes = options.relationshipTypes
    ? new Set(options.relationshipTypes)
    : undefined;
  const nodeTypes = options.nodeTypes ? new Set(options.nodeTypes) : undefined;
  const effectiveLimit = Math.max(resultLimit, seedNodeIds.length);
  const queue: TraversalVisit[] = seedNodeIds.map((nodeId) => ({
    nodeId,
    depth: 0,
    pathNodeIds: [nodeId],
    pathEdgeIds: [],
    minimumPathConfidence: 100,
  }));
  const visits = new Map<GraphNodeId, TraversalVisit>(queue.map((visit) => [visit.nodeId, visit]));
  const traversedEdgeIds = new Set<GraphEdgeId>();
  const uncertainEdgeIds = new Set<GraphEdgeId>();
  const suppressedHubNodeIds = new Set<GraphNodeId>();
  const cycles = new Map<
    string,
    { fromNodeId: GraphNodeId; toNodeId: GraphNodeId; edgeId: GraphEdgeId }
  >();
  const omittedNodeIds = new Set<GraphNodeId>();
  const omittedCategories = new Set<GraphNodeType>();
  const reasons = new Set<string>();

  while (queue.length > 0) {
    const visit = queue.shift()!;
    const edges = adjacentEdges(visit.nodeId, direction, indexes, relationshipTypes);
    const currentNode = indexes.nodeById.get(visit.nodeId)!;
    if (
      !options.includeHighDegreeHubs &&
      GENERIC_HUB_TYPES.has(currentNode.type) &&
      edges.length > highDegreeThreshold
    ) {
      suppressedHubNodeIds.add(visit.nodeId);
      reasons.add("high_degree_hub_suppressed");
      for (const edge of edges) {
        const adjacentId = neighborId(edge, direction);
        if (!visits.has(adjacentId)) {
          omittedNodeIds.add(adjacentId);
          omittedCategories.add(indexes.nodeById.get(adjacentId)!.type);
        }
      }
      continue;
    }
    if (visit.depth >= maxDepth) {
      for (const edge of edges) {
        const adjacentId = neighborId(edge, direction);
        if (!visits.has(adjacentId)) {
          omittedNodeIds.add(adjacentId);
          omittedCategories.add(indexes.nodeById.get(adjacentId)!.type);
          reasons.add("depth_limit_reached");
        }
      }
      continue;
    }

    for (const edge of edges) {
      if (edge.confidence < minimumConfidence || !isTemporallyValid(edge, temporalQuery)) continue;
      const adjacentId = neighborId(edge, direction);
      const adjacentNode = indexes.nodeById.get(adjacentId)!;
      if (!isTemporallyValid(adjacentNode, temporalQuery)) continue;
      if (nodeTypes && !nodeTypes.has(adjacentNode.type) && !seedNodeIds.includes(adjacentId)) {
        continue;
      }
      if (visit.pathNodeIds.includes(adjacentId)) {
        const cycle = { fromNodeId: visit.nodeId, toNodeId: adjacentId, edgeId: edge.id };
        cycles.set(`${cycle.fromNodeId}:${cycle.toNodeId}:${cycle.edgeId}`, cycle);
        continue;
      }
      if (visits.has(adjacentId)) continue;
      if (visits.size >= effectiveLimit) {
        omittedNodeIds.add(adjacentId);
        omittedCategories.add(adjacentNode.type);
        reasons.add("result_cap_reached");
        continue;
      }
      const nextVisit: TraversalVisit = {
        nodeId: adjacentId,
        depth: visit.depth + 1,
        pathNodeIds: [...visit.pathNodeIds, adjacentId],
        pathEdgeIds: [...visit.pathEdgeIds, edge.id],
        minimumPathConfidence: Math.min(visit.minimumPathConfidence, edge.confidence),
      };
      visits.set(adjacentId, nextVisit);
      queue.push(nextVisit);
      traversedEdgeIds.add(edge.id);
      if (edge.confidence < uncertaintyThreshold) uncertainEdgeIds.add(edge.id);
    }
  }
  if (seedNodeIds.length > resultLimit) reasons.add("result_cap_below_seed_count");

  return traversalResultSchema.parse({
    seedNodeIds,
    direction,
    visits: [...visits.values()].sort(
      (left, right) => left.depth - right.depth || left.nodeId.localeCompare(right.nodeId),
    ),
    traversedEdgeIds: uniqueSorted(traversedEdgeIds),
    uncertainEdgeIds: uniqueSorted(uncertainEdgeIds),
    suppressedHubNodeIds: uniqueSorted(suppressedHubNodeIds),
    cyclesDetected: [...cycles.values()].sort(
      (left, right) =>
        left.fromNodeId.localeCompare(right.fromNodeId) ||
        left.toNodeId.localeCompare(right.toNodeId) ||
        left.edgeId.localeCompare(right.edgeId),
    ),
    truncation: {
      truncated: reasons.size > 0,
      reasons: [...reasons].sort(),
      omittedNodeCount: omittedNodeIds.size,
      omittedCategories: [...omittedCategories].sort(),
      mandatoryCoverageStatus: "not_assessed",
      minimumSafeTokenEstimate: { value: null, status: "unavailable" },
    },
  }) as TraversalResult;
}
