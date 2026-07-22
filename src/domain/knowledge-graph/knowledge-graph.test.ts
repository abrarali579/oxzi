import { describe, expect, it } from "vitest";

import {
  newsAutomation2026Fixture,
  oxzire3dWebsiteFixture,
  serializeCanonicalProject,
} from "../project";
import {
  analyzeKnowledgeGraphImpact,
  auditKnowledgeGraphIntegrity,
  buildKnowledgeGraphIndexes,
  createGraphEdgeId,
  createGraphNodeId,
  extractTaskSubgraph,
  finalizeKnowledgeGraph,
  findKnowledgeGraphPath,
  parseKnowledgeGraph,
  projectCanonicalProjectToKnowledgeGraph,
  serializeKnowledgeGraph,
  traverseKnowledgeGraph,
  type GraphEdgeType,
  type GraphNodeId,
  type KnowledgeGraph,
  type KnowledgeGraphEdgeInput,
  type KnowledgeGraphNode,
  type KnowledgeGraphNodeInput,
} from ".";

const oxzireGraph = () => projectCanonicalProjectToKnowledgeGraph(oxzire3dWebsiteFixture);

function nodeOfType(graph: KnowledgeGraph, type: KnowledgeGraphNode["type"]) {
  const node = graph.nodes.find((candidate) => candidate.type === type);
  if (!node) throw new Error(`Fixture graph has no ${type} node`);
  return node;
}

function nodeInput(node: KnowledgeGraphNode): KnowledgeGraphNodeInput {
  return {
    id: node.id,
    type: node.type,
    label: node.label,
    sourceRefs: node.sourceRefs,
    evidenceRefs: node.evidenceRefs,
    confidence: node.confidence,
    lifecycle: node.lifecycle,
    ...(node.approvalStatus ? { approvalStatus: node.approvalStatus } : {}),
    attributes: node.attributes,
  };
}

function edgeInputs(graph: KnowledgeGraph): KnowledgeGraphEdgeInput[] {
  return graph.edges.map((edge) => ({
    id: edge.id,
    type: edge.type,
    fromNodeId: edge.fromNodeId,
    toNodeId: edge.toNodeId,
    sourceRefs: edge.sourceRefs,
    evidenceRefs: edge.evidenceRefs,
    confidence: edge.confidence,
    lifecycle: edge.lifecycle,
    ...(edge.approvalStatus ? { approvalStatus: edge.approvalStatus } : {}),
    inferred: edge.inferred,
  }));
}

function metadataInput(graph: KnowledgeGraph) {
  return {
    projectId: graph.metadata.projectId,
    canonicalVersionId: graph.metadata.canonicalVersionId,
    canonicalVersionNumber: graph.metadata.canonicalVersionNumber,
    canonicalProjectHash: graph.metadata.canonicalProjectHash,
    graphSchemaVersion: graph.metadata.graphSchemaVersion,
    projectorVersion: graph.metadata.projectorVersion,
    projectedAt: graph.metadata.projectedAt,
  };
}

function addRelationship(
  graph: KnowledgeGraph,
  type: GraphEdgeType,
  fromNodeId: GraphNodeId,
  toNodeId: GraphNodeId,
  confidence = 100,
) {
  const metadata = {
    projectId: graph.metadata.projectId,
    canonicalVersionId: graph.metadata.canonicalVersionId,
    canonicalVersionNumber: graph.metadata.canonicalVersionNumber,
    canonicalProjectHash: graph.metadata.canonicalProjectHash,
    graphSchemaVersion: graph.metadata.graphSchemaVersion,
    projectorVersion: graph.metadata.projectorVersion,
  };
  return finalizeKnowledgeGraph({
    metadata,
    nodes: graph.nodes.map(nodeInput),
    edges: [
      ...edgeInputs(graph),
      {
        id: createGraphEdgeId(type, fromNodeId, toNodeId, "test"),
        type,
        fromNodeId,
        toNodeId,
        sourceRefs: ["test:relationship"],
        evidenceRefs: [],
        confidence,
        lifecycle: graph.nodes[0]!.lifecycle,
        inferred: true,
      },
    ],
  });
}

describe("Knowledge Graph foundation", () => {
  it("projects identical canonical input deterministically", () => {
    expect(oxzireGraph()).toEqual(oxzireGraph());
  });

  it("serializes identical projection byte-for-byte", () => {
    expect(serializeKnowledgeGraph(oxzireGraph())).toBe(serializeKnowledgeGraph(oxzireGraph()));
  });

  it("keeps node and edge IDs stable", () => {
    const first = oxzireGraph();
    const second = oxzireGraph();
    expect(first.nodes.map((node) => node.id)).toEqual(second.nodes.map((node) => node.id));
    expect(first.edges.map((edge) => edge.id)).toEqual(second.edges.map((edge) => edge.id));
  });

  it("preserves source and evidence traceability in records and indexes", () => {
    const graph = oxzireGraph();
    const feature = nodeOfType(graph, "feature");
    const evidenceId = feature.evidenceRefs[0];
    const sourceRef = feature.sourceRefs.find((reference) => reference.startsWith("canonical:"));
    const indexes = buildKnowledgeGraphIndexes(graph);

    expect(evidenceId).toBeTruthy();
    expect(sourceRef).toBe("canonical:product.features");
    expect(indexes.byEvidenceReference.get(evidenceId!)?.nodeIds).toContain(feature.id);
    expect(indexes.bySourceReference.get(sourceRef!)?.nodeIds).toContain(feature.id);
  });

  it("projects immutable source Episodes and evidence relationships", () => {
    const graph = oxzireGraph();
    const episode = nodeOfType(graph, "episode");
    const evidenceEdge = graph.edges.find(
      (edge) => edge.type === "evidenced_by" && edge.toNodeId === episode.id,
    );
    expect(episode.provenance.episodeRefs.length).toBeGreaterThan(0);
    expect(evidenceEdge?.evidenceRefs.length).toBeGreaterThan(0);
  });

  it("indexes current temporal validity, versions, lifecycle, and project sections", () => {
    const graph = oxzireGraph();
    const indexes = buildKnowledgeGraphIndexes(graph);
    expect(indexes.currentNodes).toHaveLength(graph.nodes.length);
    expect(indexes.nodesByVersion.get(graph.metadata.canonicalVersionId)?.length).toBe(
      graph.nodes.length,
    );
    expect(indexes.nodesByLifecycleState.get("current")?.length).toBe(graph.nodes.length);
    expect(indexes.nodesByProjectSection.get("product")?.length).toBeGreaterThan(0);
  });

  it("preserves superseded facts and supports historical temporal queries", () => {
    const base = oxzireGraph();
    const oldNode = nodeOfType(base, "architecture_component");
    const replacement = base.nodes.find(
      (node) => node.type === "architecture_component" && node.id !== oldNode.id,
    )!;
    const nodes = base.nodes.map(nodeInput).map((node) =>
      node.id === oldNode.id
        ? {
            ...node,
            temporal: {
              observedAt: "2026-01-01T00:00:00.000Z",
              sourceCreatedAt: "2026-01-01T00:00:00.000Z",
              ingestedAt: "2026-01-02T00:00:00.000Z",
              effectiveFrom: "2026-01-01T00:00:00.000Z",
              effectiveTo: "2026-02-01T00:00:00.000Z",
              invalidatedAt: null,
              supersededAt: "2026-02-01T00:00:00.000Z",
              supersededBy: replacement.id,
              currentStatus: "superseded" as const,
            },
          }
        : node,
    );
    const graph = finalizeKnowledgeGraph({
      metadata: metadataInput(base),
      nodes,
      edges: edgeInputs(base),
    });
    const current = traverseKnowledgeGraph(graph, { seedNodeIds: [oldNode.id], maxDepth: 0 });
    const historical = traverseKnowledgeGraph(graph, {
      seedNodeIds: [oldNode.id],
      maxDepth: 0,
      temporalQuery: { mode: "historical", asOf: "2026-01-15T00:00:00.000Z" },
    });
    expect(graph.nodes.find((node) => node.id === oldNode.id)?.temporal.currentStatus).toBe(
      "superseded",
    );
    expect(current.seedNodeIds).toEqual(historical.seedNodeIds);
  });

  it("rejects impossible temporal intervals", () => {
    const graph = structuredClone(oxzireGraph());
    graph.nodes[0]!.temporal.effectiveTo = "2020-01-01T00:00:00.000Z";
    expect(() => parseKnowledgeGraph(graph)).toThrow(/Effective end/);
  });

  it("finds a deterministic evidence-backed path", () => {
    const graph = oxzireGraph();
    const feature = nodeOfType(graph, "feature");
    const solution = nodeOfType(graph, "solution");
    const path = findKnowledgeGraphPath(graph, feature.id, solution.id);
    expect(path?.relationshipTypes).toEqual(["implements"]);
    expect(path?.minimumConfidence).toBeGreaterThan(0);
    expect(path?.temporallyValid).toBe(true);
  });

  it("audits graph integrity and discloses orphans", () => {
    const base = oxzireGraph();
    const template = nodeOfType(base, "requirement");
    const orphan = {
      ...nodeInput(template),
      id: createGraphNodeId("requirement", "orphan:test"),
      label: "Orphan requirement",
      sourceRefs: ["canonical:test.orphan"],
    };
    const graph = finalizeKnowledgeGraph({
      metadata: metadataInput(base),
      nodes: [...base.nodes.map(nodeInput), orphan],
      edges: edgeInputs(base),
    });
    const result = auditKnowledgeGraphIntegrity(graph);
    expect(result.status).toBe("valid_with_warnings");
    expect(result.orphanNodeIds).toContain(orphan.id);
  });

  it("supports deterministic forward traversal", () => {
    const graph = oxzireGraph();
    const feature = nodeOfType(graph, "feature");
    const result = traverseKnowledgeGraph(graph, {
      seedNodeIds: [feature.id],
      relationshipTypes: ["implements"],
    });

    expect(result.visits.map((visit) => visit.nodeId)).toContain(nodeOfType(graph, "solution").id);
  });

  it("supports deterministic reverse traversal", () => {
    const graph = oxzireGraph();
    const solution = nodeOfType(graph, "solution");
    const result = traverseKnowledgeGraph(graph, {
      seedNodeIds: [solution.id],
      direction: "reverse",
      relationshipTypes: ["implements"],
    });

    expect(result.visits.some((visit) => visit.nodeId === nodeOfType(graph, "feature").id)).toBe(
      true,
    );
  });

  it("filters traversal by relationship type", () => {
    const graph = oxzireGraph();
    const feature = nodeOfType(graph, "feature");
    const result = traverseKnowledgeGraph(graph, {
      seedNodeIds: [feature.id],
      relationshipTypes: ["tested_by"],
    });

    expect(
      result.visits.slice(1).every((visit) => {
        return graph.nodes.find((node) => node.id === visit.nodeId)?.type === "test";
      }),
    ).toBe(true);
  });

  it("filters traversal by node type while preserving seeds", () => {
    const graph = oxzireGraph();
    const feature = nodeOfType(graph, "feature");
    const result = traverseKnowledgeGraph(graph, {
      seedNodeIds: [feature.id],
      nodeTypes: ["test"],
    });

    expect(result.visits[0]?.nodeId).toBe(feature.id);
    expect(
      result.visits.slice(1).every((visit) => {
        return graph.nodes.find((node) => node.id === visit.nodeId)?.type === "test";
      }),
    ).toBe(true);
  });

  it("detects cycles without unbounded traversal", () => {
    const base = oxzireGraph();
    const feature = nodeOfType(base, "feature");
    const solution = nodeOfType(base, "solution");
    const graph = addRelationship(base, "implemented_by", solution.id, feature.id);
    const result = traverseKnowledgeGraph(graph, {
      seedNodeIds: [feature.id],
      relationshipTypes: ["implements", "implemented_by"],
      maxDepth: 10,
    });

    expect(result.cyclesDetected).toHaveLength(1);
    expect(result.visits).toHaveLength(2);
  });

  it("preserves every seed when the result cap is smaller than the seed set", () => {
    const graph = oxzireGraph();
    const seeds = graph.nodes.filter((node) => node.type === "feature").slice(0, 2);
    const result = traverseKnowledgeGraph(graph, {
      seedNodeIds: seeds.map((node) => node.id),
      resultLimit: 1,
      maxDepth: 0,
    });

    expect(result.visits.map((visit) => visit.nodeId).sort()).toEqual(
      seeds.map((node) => node.id).sort(),
    );
    expect(result.truncation.reasons).toContain("result_cap_below_seed_count");
  });

  it("discloses result-cap truncation and omitted categories", () => {
    const graph = oxzireGraph();
    const feature = nodeOfType(graph, "feature");
    const result = traverseKnowledgeGraph(graph, {
      seedNodeIds: [feature.id],
      resultLimit: 1,
    });

    expect(result.truncation.truncated).toBe(true);
    expect(result.truncation.reasons).toContain("result_cap_reached");
    expect(result.truncation.omittedNodeCount).toBeGreaterThan(0);
    expect(result.truncation.omittedCategories.length).toBeGreaterThan(0);
  });

  it("suppresses expansion through generic high-degree hubs", () => {
    const graph = oxzireGraph();
    const project = nodeOfType(graph, "project");
    const result = traverseKnowledgeGraph(graph, {
      seedNodeIds: [project.id],
      highDegreeThreshold: 1,
    });

    expect(result.suppressedHubNodeIds).toEqual([project.id]);
    expect(result.truncation.reasons).toContain("high_degree_hub_suppressed");
  });

  it("distinguishes direct from transitive impact", () => {
    const graph = oxzireGraph();
    const feature = nodeOfType(graph, "feature");
    const solution = nodeOfType(graph, "solution");
    const problem = nodeOfType(graph, "problem");
    const impact = analyzeKnowledgeGraphImpact(graph, [feature.id]);

    expect(impact.directImpactNodeIds).toContain(solution.id);
    expect(impact.transitiveImpactNodeIds).toContain(problem.id);
  });

  it("classifies blocking impact", () => {
    const graph = projectCanonicalProjectToKnowledgeGraph(newsAutomation2026Fixture);
    const project = nodeOfType(graph, "project");
    const impact = analyzeKnowledgeGraphImpact(graph, [project.id]);

    expect(impact.blockingImpactNodeIds.length).toBeGreaterThan(0);
    expect(impact.affected.blockers).toEqual(impact.blockingImpactNodeIds);
  });

  it("discloses low-confidence structural relationships", () => {
    const graph = oxzireGraph();
    const userFlow = nodeOfType(graph, "user_flow");
    const result = traverseKnowledgeGraph(graph, {
      seedNodeIds: [userFlow.id],
      relationshipTypes: ["enables"],
    });
    const impact = analyzeKnowledgeGraphImpact(graph, [userFlow.id]);

    expect(result.uncertainEdgeIds.length).toBeGreaterThan(0);
    expect(impact.uncertainImpactNodeIds.length).toBeGreaterThan(0);
  });

  it("preserves mandatory task-subgraph coverage even below the requested cap", () => {
    const graph = oxzireGraph();
    const seeds = [nodeOfType(graph, "feature").id, nodeOfType(graph, "architecture_component").id];
    const subgraph = extractTaskSubgraph(graph, seeds, { resultLimit: 1 });

    expect(subgraph.coverage.status).toBe("complete");
    expect(subgraph.coverage.seedCoverage).toBe(true);
    expect(subgraph.coverage.securityCoverage).toBe(true);
    expect(subgraph.coverage.testCoverage).toBe(true);
    expect(subgraph.coverage.documentationCoverage).toBe(true);
    expect(subgraph.truncation.reasons).toContain("result_cap_below_mandatory_set");
    expect(subgraph.truncation.minimumSafeTokenEstimate.status).toBe("character_estimated");
  });

  it("does not mutate canonical state during projection", () => {
    const project = structuredClone(oxzire3dWebsiteFixture);
    const before = serializeCanonicalProject(project);
    projectCanonicalProjectToKnowledgeGraph(project);

    expect(serializeCanonicalProject(project)).toBe(before);
  });

  it("changes only relevant content fingerprints when canonical content changes", () => {
    const original = oxzireGraph();
    const changedProject = structuredClone(oxzire3dWebsiteFixture);
    changedProject.product.features.value![0]!.description += " with a deterministic fallback";
    const changed = projectCanonicalProjectToKnowledgeGraph(changedProject);
    const originalFeature = original.nodes.find(
      (node) =>
        node.type === "feature" && node.label === changedProject.product.features.value![0]!.name,
    )!;
    const changedFeature = changed.nodes.find((node) => node.id === originalFeature.id)!;
    const originalGoal = nodeOfType(original, "goal");
    const changedGoal = changed.nodes.find((node) => node.id === originalGoal.id)!;

    expect(changed.metadata.canonicalProjectHash).not.toBe(original.metadata.canonicalProjectHash);
    expect(changed.metadata.graphFingerprint).not.toBe(original.metadata.graphFingerprint);
    expect(changedFeature.fingerprint).not.toBe(originalFeature.fingerprint);
    expect(changedGoal.fingerprint).toBe(originalGoal.fingerprint);
  });

  it("projects both canonical fixtures into valid nonempty graphs", () => {
    for (const fixture of [oxzire3dWebsiteFixture, newsAutomation2026Fixture]) {
      const graph = projectCanonicalProjectToKnowledgeGraph(fixture);
      expect(parseKnowledgeGraph(graph)).toEqual(graph);
      expect(graph.nodes.length).toBeGreaterThan(20);
      expect(graph.edges.length).toBeGreaterThan(20);
    }
  });

  it("rejects unknown types, duplicate IDs, and dangling edges", () => {
    const graph = oxzireGraph();
    const unknownType = structuredClone(graph) as unknown as {
      nodes: Array<Record<string, unknown>>;
    };
    unknownType.nodes[0]!.type = "unknown_node";
    expect(() => parseKnowledgeGraph(unknownType)).toThrow();

    const duplicate = structuredClone(graph);
    duplicate.nodes[1]!.id = duplicate.nodes[0]!.id;
    expect(() => parseKnowledgeGraph(duplicate)).toThrow(/Duplicate node ID/);

    const dangling = structuredClone(graph);
    dangling.edges[0]!.toNodeId = "kg_node_project_deadbeefdead" as GraphNodeId;
    expect(() => parseKnowledgeGraph(dangling)).toThrow(/dangling node references/);
  });
});
