import { contentFingerprint } from "./fingerprints";
import { knowledgeGraphSchema } from "./schemas";
import type { JsonValue, GraphIntegrityIssue, GraphIntegrityResult } from "./types";

export function auditKnowledgeGraphIntegrity(input: unknown): GraphIntegrityResult {
  const parsed = knowledgeGraphSchema.safeParse(input);
  if (!parsed.success) {
    return {
      status: "invalid",
      issues: parsed.error.issues.map((issue) => ({
        severity: "error",
        code: "schema_invalid",
        recordId: null,
        message: issue.message,
      })),
      orphanNodeIds: [],
      unresolvedEdgeIds: [],
      checkedNodeCount: Array.isArray((input as { nodes?: unknown[] })?.nodes)
        ? (input as { nodes: unknown[] }).nodes.length
        : 0,
      checkedEdgeCount: Array.isArray((input as { edges?: unknown[] })?.edges)
        ? (input as { edges: unknown[] }).edges.length
        : 0,
    };
  }
  const graph = parsed.data;
  const issues: GraphIntegrityIssue[] = [];
  const connected = new Set(graph.edges.flatMap((edge) => [edge.fromNodeId, edge.toNodeId]));
  const orphanNodeIds = graph.nodes
    .filter(
      (node) => !connected.has(node.id) && !["project", "version", "episode"].includes(node.type),
    )
    .map((node) => node.id)
    .sort();
  for (const nodeId of orphanNodeIds)
    issues.push({
      severity: "warning",
      code: "orphan_node",
      recordId: nodeId,
      message: "Node has no relationships",
    });
  const unresolvedEdgeIds = graph.edges
    .filter((edge) => edge.provenance.derivationMethod === "unresolved")
    .map((edge) => edge.id)
    .sort();
  for (const edgeId of unresolvedEdgeIds)
    issues.push({
      severity: "warning",
      code: "unresolved_relationship",
      recordId: edgeId,
      message: "Relationship semantics remain unresolved",
    });
  const episodeEvidenceRefs = new Set(
    graph.nodes.filter((node) => node.type === "episode").flatMap((node) => node.evidenceRefs),
  );
  for (const node of graph.nodes) {
    if (
      node.provenance.derivationMethod === "canonical" &&
      !node.sourceRefs.some((reference) => reference.startsWith("canonical:"))
    ) {
      issues.push({
        severity: "error",
        code: "canonical_traceability",
        recordId: node.id,
        message: "Canonical derivation requires a canonical source reference",
      });
    }
    for (const evidenceRef of node.evidenceRefs) {
      if (node.type !== "episode" && !episodeEvidenceRefs.has(evidenceRef)) {
        issues.push({
          severity: "warning",
          code: "unresolved_evidence",
          recordId: node.id,
          message: `Evidence ${evidenceRef} has no Episode`,
        });
      }
    }
    if (node.temporal.supersededBy) {
      const successor = graph.nodes.find(
        (candidate) => candidate.id === node.temporal.supersededBy,
      );
      if (successor?.temporal.currentStatus === "superseded")
        issues.push({
          severity: "warning",
          code: "stale_supersession_target",
          recordId: node.id,
          message: "Supersession target is also superseded",
        });
    }
  }
  for (const requiredType of ["project", "version"] as const) {
    if (!graph.nodes.some((node) => node.type === requiredType))
      issues.push({
        severity: "error",
        code: "mandatory_node_missing",
        recordId: null,
        message: `Graph requires a ${requiredType} node`,
      });
  }
  for (const edge of graph.edges) {
    if (edge.fromNodeId === edge.toNodeId)
      issues.push({
        severity: "error",
        code: "self_edge",
        recordId: edge.id,
        message: "Self edges are not allowed",
      });
    if (
      edge.type === "evidenced_by" &&
      graph.nodes.find((node) => node.id === edge.toNodeId)?.type !== "episode"
    ) {
      issues.push({
        severity: "error",
        code: "invalid_evidence_direction",
        recordId: edge.id,
        message: "evidenced_by must target an Episode",
      });
    }
  }
  for (const node of graph.nodes) {
    const expected = contentFingerprint({
      id: node.id,
      type: node.type,
      label: node.label,
      sourceRefs: node.sourceRefs,
      evidenceRefs: node.evidenceRefs,
      confidence: node.confidence,
      lifecycle: node.lifecycle,
      temporal: node.temporal,
      freshness: node.freshness,
      provenance: node.provenance,
      schemaVersion: node.schemaVersion,
      projectorVersion: node.projectorVersion,
      approvalStatus: node.approvalStatus ?? null,
      attributes: node.attributes,
    } as unknown as JsonValue);
    if (expected !== node.fingerprint)
      issues.push({
        severity: "error",
        code: "invalid_fingerprint",
        recordId: node.id,
        message: "Node fingerprint does not match content",
      });
  }
  for (const edge of graph.edges) {
    const expected = contentFingerprint({
      id: edge.id,
      type: edge.type,
      fromNodeId: edge.fromNodeId,
      toNodeId: edge.toNodeId,
      sourceRefs: edge.sourceRefs,
      evidenceRefs: edge.evidenceRefs,
      confidence: edge.confidence,
      lifecycle: edge.lifecycle,
      temporal: edge.temporal,
      freshness: edge.freshness,
      provenance: edge.provenance,
      schemaVersion: edge.schemaVersion,
      projectorVersion: edge.projectorVersion,
      approvalStatus: edge.approvalStatus ?? null,
      inferred: edge.inferred,
    } as unknown as JsonValue);
    if (expected !== edge.fingerprint)
      issues.push({
        severity: "error",
        code: "invalid_fingerprint",
        recordId: edge.id,
        message: "Edge fingerprint does not match content",
      });
  }
  const stale = graph.nodes.filter((node) => node.freshness.status === "stale");
  const conflicted = graph.nodes.some(
    (node) => node.type === "conflict" && node.temporal.currentStatus === "current",
  );
  const errors = issues.some((issue) => issue.severity === "error");
  const status = errors
    ? "invalid"
    : conflicted
      ? "conflicted"
      : stale.length === graph.nodes.length && stale.length > 0
        ? "stale"
        : stale.length > 0
          ? "partially_stale"
          : issues.length > 0
            ? "valid_with_warnings"
            : "valid";
  const { graphFingerprint, ...metadata } = graph.metadata;
  const expectedGraphFingerprint = contentFingerprint({
    metadata,
    nodes: graph.nodes,
    edges: graph.edges,
  } as unknown as JsonValue);
  if (expectedGraphFingerprint !== graphFingerprint)
    issues.push({
      severity: "error",
      code: "invalid_graph_fingerprint",
      recordId: null,
      message: "Graph fingerprint does not match content",
    });
  const finalErrors = issues.some((issue) => issue.severity === "error");
  const finalStatus = finalErrors ? "invalid" : status;
  return {
    status: finalStatus,
    issues,
    orphanNodeIds,
    unresolvedEdgeIds,
    checkedNodeCount: graph.nodes.length,
    checkedEdgeCount: graph.edges.length,
  };
}
