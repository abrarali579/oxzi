import { parseKnowledgeGraph } from "./schemas";
import type { GraphEdgeType, GraphNodeType } from "./enums";
import type { GraphNodeId } from "./identifiers";
import type {
  KnowledgeGraphEdge,
  KnowledgeGraphIndexes,
  KnowledgeGraphNode,
  ReferenceIndexEntry,
} from "./types";
import { isTemporallyValid } from "./temporal";

function appendMapValue<K, V>(map: Map<K, V[]>, key: K, value: V) {
  const values = map.get(key) ?? [];
  values.push(value);
  map.set(key, values);
}

function appendReference(
  map: Map<string, ReferenceIndexEntry>,
  reference: string,
  kind: "nodeIds" | "edgeIds",
  id: ReferenceIndexEntry[typeof kind][number],
) {
  const entry = map.get(reference) ?? { nodeIds: [], edgeIds: [] };
  if (kind === "nodeIds") entry.nodeIds.push(id as ReferenceIndexEntry["nodeIds"][number]);
  else entry.edgeIds.push(id as ReferenceIndexEntry["edgeIds"][number]);
  map.set(reference, entry);
}

function sortReferenceIndex(map: Map<string, ReferenceIndexEntry>) {
  for (const entry of map.values()) {
    entry.nodeIds.sort();
    entry.edgeIds.sort();
  }
}

export function buildKnowledgeGraphIndexes(input: unknown): KnowledgeGraphIndexes {
  const graph = parseKnowledgeGraph(input);
  const nodeById = new Map<GraphNodeId, KnowledgeGraphNode>();
  const nodesByType = new Map<GraphNodeType, KnowledgeGraphNode[]>();
  const edgesByType = new Map<GraphEdgeType, KnowledgeGraphEdge[]>();
  const outgoingByNodeId = new Map<GraphNodeId, KnowledgeGraphEdge[]>();
  const incomingByNodeId = new Map<GraphNodeId, KnowledgeGraphEdge[]>();
  const bySourceReference = new Map<string, ReferenceIndexEntry>();
  const byEvidenceReference = new Map<string, ReferenceIndexEntry>();
  const nodesByLifecycleState = new Map<string, KnowledgeGraphNode[]>();
  const nodesByVersion = new Map<string, KnowledgeGraphNode[]>();
  const nodesByProjectSection = new Map<string, KnowledgeGraphNode[]>();

  for (const node of graph.nodes) {
    nodeById.set(node.id, node);
    appendMapValue(nodesByType, node.type, node);
    appendMapValue(nodesByLifecycleState, node.temporal.currentStatus, node);
    appendMapValue(nodesByVersion, node.lifecycle.canonicalVersionId, node);
    const canonicalPath = node.attributes.canonicalPath;
    if (typeof canonicalPath === "string")
      appendMapValue(nodesByProjectSection, canonicalPath.split(".")[0]!, node);
    for (const reference of node.sourceRefs) {
      appendReference(bySourceReference, reference, "nodeIds", node.id);
    }
    for (const reference of node.evidenceRefs) {
      appendReference(byEvidenceReference, reference, "nodeIds", node.id);
    }
  }
  for (const edge of graph.edges) {
    appendMapValue(edgesByType, edge.type, edge);
    appendMapValue(outgoingByNodeId, edge.fromNodeId, edge);
    appendMapValue(incomingByNodeId, edge.toNodeId, edge);
    for (const reference of edge.sourceRefs) {
      appendReference(bySourceReference, reference, "edgeIds", edge.id);
    }
    for (const reference of edge.evidenceRefs) {
      appendReference(byEvidenceReference, reference, "edgeIds", edge.id);
    }
  }
  sortReferenceIndex(bySourceReference);
  sortReferenceIndex(byEvidenceReference);

  return {
    nodeById,
    nodesByType,
    edgesByType,
    outgoingByNodeId,
    incomingByNodeId,
    bySourceReference,
    byEvidenceReference,
    nodesByLifecycleState,
    currentNodes: graph.nodes.filter((node) => isTemporallyValid(node)),
    nodesByVersion,
    nodesByProjectSection,
  };
}
