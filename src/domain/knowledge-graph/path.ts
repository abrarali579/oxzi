import { buildKnowledgeGraphIndexes } from "./indexes";
import { parseKnowledgeGraph } from "./schemas";
import { isTemporallyValid, temporalQuerySchema } from "./temporal";
import type { GraphEdgeType } from "./enums";
import type { GraphNodeId } from "./identifiers";
import type { KnowledgeGraphPath, TemporalQuery } from "./types";

export function findKnowledgeGraphPath(
  input: unknown,
  fromNodeId: GraphNodeId,
  toNodeId: GraphNodeId,
  options: {
    relationshipTypes?: GraphEdgeType[];
    minimumConfidence?: number;
    temporalQuery?: TemporalQuery;
    maxDepth?: number;
    visitLimit?: number;
  } = {},
): KnowledgeGraphPath | null {
  const graph = parseKnowledgeGraph(input);
  const indexes = buildKnowledgeGraphIndexes(graph);
  if (!indexes.nodeById.has(fromNodeId) || !indexes.nodeById.has(toNodeId))
    throw new Error("Path endpoints must exist");
  const allowed = options.relationshipTypes ? new Set(options.relationshipTypes) : null;
  const temporal = temporalQuerySchema.parse(options.temporalQuery ?? { mode: "current" });
  const maxDepth = options.maxDepth ?? 8;
  const visitLimit = options.visitLimit ?? 1000;
  const queue = [{ nodeIds: [fromNodeId], edgeIds: [] as string[], confidence: 100 }];
  const visited = new Set<string>([fromNodeId]);
  let visits = 0;

  while (queue.length > 0 && visits < visitLimit) {
    const candidate = queue.shift()!;
    const currentId = candidate.nodeIds.at(-1)! as GraphNodeId;
    visits += 1;
    if (currentId === toNodeId) {
      const edges = candidate.edgeIds.map((id) => graph.edges.find((edge) => edge.id === id)!);
      return {
        fromNodeId,
        toNodeId,
        nodeIds: candidate.nodeIds as GraphNodeId[],
        edgeIds: edges.map((edge) => edge.id),
        relationshipTypes: edges.map((edge) => edge.type),
        minimumConfidence: candidate.confidence,
        evidenceRefs: [...new Set(edges.flatMap((edge) => edge.evidenceRefs))].sort(),
        temporallyValid: edges.every((edge) => isTemporallyValid(edge, temporal)),
        unresolvedGaps: edges
          .filter((edge) => edge.provenance.derivationMethod === "unresolved")
          .map((edge) => edge.id),
        truncated: false,
      };
    }
    if (candidate.edgeIds.length >= maxDepth) continue;
    const edges = [...(indexes.outgoingByNodeId.get(currentId) ?? [])]
      .filter(
        (edge) =>
          (!allowed || allowed.has(edge.type)) &&
          edge.confidence >= (options.minimumConfidence ?? 0),
      )
      .filter(
        (edge) =>
          isTemporallyValid(edge, temporal) &&
          isTemporallyValid(indexes.nodeById.get(edge.toNodeId)!, temporal),
      )
      .sort((left, right) => right.confidence - left.confidence || left.id.localeCompare(right.id));
    for (const edge of edges) {
      if (candidate.nodeIds.includes(edge.toNodeId) || visited.has(edge.toNodeId)) continue;
      visited.add(edge.toNodeId);
      queue.push({
        nodeIds: [...candidate.nodeIds, edge.toNodeId],
        edgeIds: [...candidate.edgeIds, edge.id],
        confidence: Math.min(candidate.confidence, edge.confidence),
      });
    }
  }
  return null;
}
