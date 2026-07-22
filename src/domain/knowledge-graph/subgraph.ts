import { buildKnowledgeGraphIndexes } from "./indexes";
import { stableJson } from "./fingerprints";
import { parseKnowledgeGraph } from "./schemas";
import { traverseKnowledgeGraph } from "./traversal";
import type { GraphNodeId } from "./identifiers";
import type { JsonValue, KnowledgeGraphNode, TaskSubgraph, TraversalResult } from "./types";

const CLOSURE_RELATIONSHIPS = [
  "depends_on",
  "implements",
  "implemented_by",
  "blocked_by",
  "conflicts_with",
  "decided_by",
  "assumed_by",
  "secured_by",
  "validated_by",
  "tested_by",
  "documented_in",
  "evidenced_by",
  "governed_by",
  "satisfies",
] as const;

function uniqueSorted(values: Iterable<GraphNodeId>) {
  return [...new Set(values)].sort();
}

function reachedNodeIds(...traversals: TraversalResult[]) {
  return uniqueSorted(
    traversals.flatMap((traversal) => traversal.visits.map((visit) => visit.nodeId)),
  );
}

function nodesByIds(
  nodeIds: Iterable<GraphNodeId>,
  indexes: ReturnType<typeof buildKnowledgeGraphIndexes>,
) {
  return uniqueSorted(nodeIds)
    .map((nodeId) => indexes.nodeById.get(nodeId))
    .filter((node): node is KnowledgeGraphNode => node !== undefined)
    .sort((left, right) => left.order - right.order);
}

function isAcceptedDecision(node: KnowledgeGraphNode) {
  return node.type === "decision" && node.approvalStatus === "approved";
}

function isBlocker(node: KnowledgeGraphNode) {
  const value = node.attributes.value;
  const record =
    value && !Array.isArray(value) && typeof value === "object" ? value : node.attributes;
  return (
    (node.type === "conflict" && record.status === "open") ||
    (node.type === "risk" && (record.impact === "blocking" || record.severity === "blocking"))
  );
}

export function extractTaskSubgraph(
  input: unknown,
  seedNodeIds: GraphNodeId[],
  options: { maxDepth?: number; resultLimit?: number; highDegreeThreshold?: number } = {},
): TaskSubgraph {
  const graph = parseKnowledgeGraph(input);
  const indexes = buildKnowledgeGraphIndexes(graph);
  const resultLimit = options.resultLimit ?? 120;
  const common = {
    seedNodeIds,
    relationshipTypes: [...CLOSURE_RELATIONSHIPS],
    maxDepth: options.maxDepth ?? 4,
    resultLimit,
    highDegreeThreshold: options.highDegreeThreshold ?? 25,
  };
  const forward = traverseKnowledgeGraph(graph, { ...common, direction: "forward" });
  const reverse = traverseKnowledgeGraph(graph, { ...common, direction: "reverse" });
  const reachedIds = reachedNodeIds(forward, reverse);
  const reached = nodesByIds(reachedIds, indexes);

  const mandatoryDependencies = reached.filter((node) =>
    ["requirement", "architecture_component", "integration", "data_entity"].includes(node.type),
  );
  const requirements = reached.filter((node) => node.type === "requirement");
  const applicableConstitutionRules = reached.filter((node) => node.type === "constitutional_rule");
  const blockers = reached.filter(isBlocker);
  const acceptedDecisions = reached.filter(isAcceptedDecision);
  const securityInvariants = reached.filter((node) => node.type === "security_invariant");
  const relevantTests = reached.filter((node) => node.type === "test");
  const relevantDocumentation = reached.filter((node) => node.type === "documentation_artifact");
  const risks = reached.filter((node) => node.type === "risk");
  const acceptanceCriteria = reached.filter(
    (node) =>
      node.type === "acceptance_criterion" ||
      (node.type === "requirement" && node.attributes.category === "acceptance_criterion"),
  );
  const implementationEvidence = reached.filter((node) =>
    ["repository_file", "implementation_module", "symbol", "artifact", "execution_record"].includes(
      node.type,
    ),
  );
  const seedNodes = nodesByIds(seedNodeIds, indexes);
  const mandatoryIds = new Set<GraphNodeId>(
    [
      ...seedNodes,
      ...mandatoryDependencies,
      ...blockers,
      ...acceptedDecisions,
      ...securityInvariants,
      ...relevantTests,
      ...relevantDocumentation,
    ].map((node) => node.id),
  );
  const effectiveLimit = Math.max(resultLimit, mandatoryIds.size);
  const optional = reached.filter((node) => !mandatoryIds.has(node.id));
  const selectedIds = new Set<GraphNodeId>(mandatoryIds);
  for (const node of optional) {
    if (selectedIds.size >= effectiveLimit) break;
    selectedIds.add(node.id);
  }
  const includedNodes = nodesByIds(selectedIds, indexes);
  const includedEdges = graph.edges.filter(
    (edge) => selectedIds.has(edge.fromNodeId) && selectedIds.has(edge.toNodeId),
  );
  const missingMandatoryNodeIds = uniqueSorted(
    [...mandatoryIds].filter((nodeId) => !selectedIds.has(nodeId)),
  );
  const coverage = {
    status: missingMandatoryNodeIds.length === 0 ? ("complete" as const) : ("incomplete" as const),
    seedCoverage: seedNodes.length === new Set(seedNodeIds).size,
    dependencyCoverage: mandatoryDependencies.every((node) => selectedIds.has(node.id)),
    blockerCoverage: blockers.every((node) => selectedIds.has(node.id)),
    decisionCoverage: acceptedDecisions.every((node) => selectedIds.has(node.id)),
    securityCoverage: securityInvariants.every((node) => selectedIds.has(node.id)),
    testCoverage: relevantTests.every((node) => selectedIds.has(node.id)),
    documentationCoverage: relevantDocumentation.every((node) => selectedIds.has(node.id)),
    missingMandatoryNodeIds,
  };
  const mandatoryEstimate = Math.ceil(
    stableJson(nodesByIds(mandatoryIds, indexes) as unknown as JsonValue).length / 4,
  );
  const traversalReasons = new Set([...forward.truncation.reasons, ...reverse.truncation.reasons]);
  if (mandatoryIds.size > resultLimit) traversalReasons.add("result_cap_below_mandatory_set");
  const reachedButExcluded = reached.filter((node) => !selectedIds.has(node.id));
  const reachedIdSet = new Set(reachedIds);
  const omittedNodes = graph.nodes
    .filter((node) => !selectedIds.has(node.id))
    .map((node) => ({
      nodeId: node.id,
      category: node.type,
      reason: reachedIdSet.has(node.id)
        ? "result cap after preserving mandatory context"
        : "outside justified dependency closure",
    }))
    .sort((left, right) => left.nodeId.localeCompare(right.nodeId));

  return {
    canonicalProjectHash: graph.metadata.canonicalProjectHash,
    graphFingerprint: graph.metadata.graphFingerprint,
    graphSchemaVersion: graph.metadata.graphSchemaVersion,
    projectorVersion: graph.metadata.projectorVersion,
    seedNodes,
    requirements,
    applicableConstitutionRules,
    mandatoryDependencies,
    blockers,
    acceptedDecisions,
    securityInvariants,
    relevantTests,
    relevantDocumentation,
    risks,
    acceptanceCriteria,
    implementationEvidence,
    freshnessStatus: includedNodes.some((node) => node.freshness.status === "stale")
      ? "stale"
      : includedNodes.some((node) => node.freshness.status === "unknown")
        ? "unknown"
        : "current",
    includedNodes,
    includedEdges,
    omittedNodes,
    coverage,
    truncation: {
      truncated: traversalReasons.size > 0 || reachedButExcluded.length > 0,
      reasons: [...traversalReasons].sort(),
      omittedNodeCount: omittedNodes.length,
      omittedCategories: [...new Set(omittedNodes.map((node) => node.category))].sort(),
      mandatoryCoverageStatus: coverage.status,
      minimumSafeTokenEstimate: {
        value: mandatoryEstimate,
        status: "character_estimated",
      },
    },
  };
}
