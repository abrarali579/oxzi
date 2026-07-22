import { buildKnowledgeGraphIndexes } from "./indexes";
import { parseKnowledgeGraph } from "./schemas";
import { traverseKnowledgeGraph } from "./traversal";
import type { GraphNodeType } from "./enums";
import type { GraphNodeId } from "./identifiers";
import type { ImpactAnalysis, ImpactGroups, TraversalResult } from "./types";

const GROUP_BY_TYPE: Partial<Record<GraphNodeType, keyof Omit<ImpactGroups, "blockers">>> = {
  requirement: "requirements",
  feature: "features",
  decision: "decisions",
  risk: "risks",
  security_invariant: "securityInvariants",
  architecture_component: "architectureComponents",
  integration: "integrations",
  ui_screen: "screens",
  implementation_module: "modules",
  repository_file: "files",
  test: "tests",
  documentation_artifact: "documentation",
};

function uniqueSorted(values: Iterable<GraphNodeId>) {
  return [...new Set(values)].sort();
}

function mergeTruncation(forward: TraversalResult, reverse: TraversalResult) {
  return {
    truncated: forward.truncation.truncated || reverse.truncation.truncated,
    reasons: [...new Set([...forward.truncation.reasons, ...reverse.truncation.reasons])].sort(),
    omittedNodeCount: forward.truncation.omittedNodeCount + reverse.truncation.omittedNodeCount,
    omittedCategories: [
      ...new Set([
        ...forward.truncation.omittedCategories,
        ...reverse.truncation.omittedCategories,
      ]),
    ].sort(),
    mandatoryCoverageStatus: "not_assessed" as const,
    minimumSafeTokenEstimate: { value: null, status: "unavailable" as const },
  };
}

export function analyzeKnowledgeGraphImpact(
  input: unknown,
  seedNodeIds: GraphNodeId[],
  options: { maxDepth?: number; resultLimit?: number; uncertaintyThreshold?: number } = {},
): ImpactAnalysis {
  const graph = parseKnowledgeGraph(input);
  const indexes = buildKnowledgeGraphIndexes(graph);
  const common = {
    seedNodeIds,
    maxDepth: options.maxDepth ?? 4,
    resultLimit: options.resultLimit ?? 500,
    uncertaintyThreshold: options.uncertaintyThreshold ?? 80,
  };
  const forward = traverseKnowledgeGraph(graph, { ...common, direction: "forward" });
  const reverse = traverseKnowledgeGraph(graph, { ...common, direction: "reverse" });
  const historicalForward = traverseKnowledgeGraph(graph, {
    ...common,
    direction: "forward",
    temporalQuery: { mode: "all" },
  });
  const historicalReverse = traverseKnowledgeGraph(graph, {
    ...common,
    direction: "reverse",
    temporalQuery: { mode: "all" },
  });
  const visits = [...forward.visits, ...reverse.visits];
  const direct = uniqueSorted(
    visits.filter((visit) => visit.depth === 1).map((visit) => visit.nodeId),
  );
  const transitive = uniqueSorted(
    visits.filter((visit) => visit.depth > 1).map((visit) => visit.nodeId),
  ).filter((nodeId) => !direct.includes(nodeId));
  const uncertain = uniqueSorted(
    visits
      .filter((visit) => visit.minimumPathConfidence < (options.uncertaintyThreshold ?? 80))
      .map((visit) => visit.nodeId),
  );
  const blocking = uniqueSorted(
    visits.flatMap((visit) => {
      const node = indexes.nodeById.get(visit.nodeId)!;
      const value = node.attributes.value;
      const record =
        value && !Array.isArray(value) && typeof value === "object" ? value : node.attributes;
      const severity = record.severity ?? record.impact;
      const status = record.status;
      const pathHasBlockingEdge = visit.pathEdgeIds.some((edgeId) => {
        const edge = graph.edges.find((candidate) => candidate.id === edgeId);
        return edge?.type === "blocked_by" || edge?.type === "conflicts_with";
      });
      const activeBlocker =
        (node.type === "conflict" && status === "open") ||
        (node.type === "risk" && severity === "blocking");
      return activeBlocker || pathHasBlockingEdge ? [visit.nodeId] : [];
    }),
  );
  const currentIds = new Set(visits.map((visit) => visit.nodeId));
  const historicalOnly = uniqueSorted(
    [...historicalForward.visits, ...historicalReverse.visits]
      .map((visit) => visit.nodeId)
      .filter((nodeId) => !currentIds.has(nodeId)),
  );
  const staleArtifacts = uniqueSorted(
    [...historicalForward.visits, ...historicalReverse.visits]
      .map((visit) => visit.nodeId)
      .filter((nodeId) => {
        const node = indexes.nodeById.get(nodeId)!;
        return (
          node.freshness.status === "stale" &&
          ["artifact", "documentation_artifact", "task_card", "execution_passport"].includes(
            node.type,
          )
        );
      }),
  );
  const affected: ImpactGroups = {
    requirements: [],
    features: [],
    decisions: [],
    risks: [],
    securityInvariants: [],
    architectureComponents: [],
    integrations: [],
    screens: [],
    modules: [],
    files: [],
    tests: [],
    documentation: [],
    blockers: blocking,
  };
  for (const nodeId of uniqueSorted(visits.map((visit) => visit.nodeId))) {
    const node = indexes.nodeById.get(nodeId)!;
    const group = GROUP_BY_TYPE[node.type];
    if (group) affected[group].push(nodeId);
  }
  for (const group of Object.keys(affected) as Array<keyof ImpactGroups>) {
    affected[group] = uniqueSorted(affected[group]);
  }

  return {
    seedNodeIds: uniqueSorted(seedNodeIds),
    affected,
    directImpactNodeIds: direct,
    transitiveImpactNodeIds: transitive,
    uncertainImpactNodeIds: uncertain,
    blockingImpactNodeIds: blocking,
    historicalOnlyImpactNodeIds: historicalOnly,
    staleArtifactImpactNodeIds: staleArtifacts,
    truncation: mergeTruncation(forward, reverse),
  };
}
