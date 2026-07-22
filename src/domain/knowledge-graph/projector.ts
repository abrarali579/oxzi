import {
  parseCanonicalProject,
  type ApprovalStatus,
  type CanonicalProject,
  type FieldId,
  type ProjectField,
} from "../project";
import type { GraphEdgeType, GraphNodeType } from "./enums";
import {
  canonicalProjectFingerprint,
  createGraphEdgeId,
  createGraphNodeId,
  finalizeKnowledgeGraph,
  GRAPH_PROJECTOR_VERSION,
  GRAPH_SCHEMA_VERSION,
  stableJson,
} from "./fingerprints";
import type { GraphNodeId } from "./identifiers";
import type {
  GraphLifecycleMetadata,
  JsonValue,
  KnowledgeGraph,
  KnowledgeGraphEdgeInput,
  KnowledgeGraphNodeInput,
} from "./types";

type FieldLocation =
  | `identity.${string}`
  | `business.${string}`
  | `scope.${string}`
  | `product.${string}`
  | `visual.${string}`
  | `technical.${string}`
  | `quality.${string}`
  | `execution.${string}`;

type ProjectionContext = {
  project: CanonicalProject;
  lifecycle: GraphLifecycleMetadata;
  nodes: KnowledgeGraphNodeInput[];
  edges: KnowledgeGraphEdgeInput[];
  fieldNodes: Map<FieldId, GraphNodeId[]>;
  nodeById: Map<GraphNodeId, KnowledgeGraphNodeInput>;
  edgeKeys: Set<string>;
};

const DOCUMENTATION = [
  ["context/01-project-overview.md", "Project Overview"],
  ["context/02-architecture.md", "Architecture"],
  ["context/03-ui-visual-context.md", "UI and Visual Context"],
  ["context/04-code-standards.md", "Code Standards"],
  ["context/05-ai-workflow-rules.md", "AI Workflow Rules"],
  ["context/06-progress-tracker.md", "Progress Tracker"],
] as const;

const DOCUMENTATION_BY_NODE_TYPE: Partial<Record<GraphNodeType, number[]>> = {
  goal: [0],
  user_persona: [0],
  problem: [0],
  solution: [0],
  requirement: [0, 3],
  feature: [0],
  user_flow: [0, 2],
  decision: [1, 5],
  assumption: [0, 5],
  conflict: [5],
  risk: [1, 5],
  architecture_component: [1],
  integration: [1],
  data_entity: [1],
  security_invariant: [1, 3],
  visual_rule: [2],
  test: [3],
  task: [5],
};

function normalizedIdentity(value: string): string {
  return value.normalize("NFKC").toLocaleLowerCase("en-US").trim().replace(/\s+/g, " ");
}

function approval(field: ProjectField<unknown>): ApprovalStatus | undefined {
  return field.approval.status;
}

function addNode(context: ProjectionContext, node: KnowledgeGraphNodeInput): GraphNodeId {
  if (context.nodeById.has(node.id)) {
    throw new Error(`Knowledge Graph projection produced duplicate node ID ${node.id}`);
  }
  context.nodes.push(node);
  context.nodeById.set(node.id, node);
  return node.id;
}

function attachFieldNode(context: ProjectionContext, fieldId: FieldId, nodeId: GraphNodeId) {
  const existing = context.fieldNodes.get(fieldId) ?? [];
  existing.push(nodeId);
  context.fieldNodes.set(fieldId, existing);
}

function addFieldNode(
  context: ProjectionContext,
  options: {
    type: GraphNodeType;
    path: FieldLocation;
    field: ProjectField<unknown>;
    stableKey: string;
    label: string;
    attributes: Record<string, JsonValue>;
  },
): GraphNodeId {
  const nodeId = createGraphNodeId(options.type, `${options.field.id}:${options.stableKey}`);
  addNode(context, {
    id: nodeId,
    type: options.type,
    label: options.label,
    sourceRefs: [`canonical:${options.path}`, options.field.id],
    evidenceRefs: [...options.field.evidenceIds],
    confidence: options.field.confidence,
    lifecycle: context.lifecycle,
    approvalStatus: approval(options.field),
    temporal: {
      observedAt: options.field.timestamps.updatedAt,
      sourceCreatedAt: options.field.timestamps.createdAt,
      ingestedAt: options.field.timestamps.updatedAt,
      effectiveFrom: options.field.timestamps.createdAt,
      effectiveTo: null,
      invalidatedAt: null,
      supersededAt: null,
      supersededBy: null,
      currentStatus: "current",
    },
    attributes: {
      canonicalPath: options.path,
      fieldId: options.field.id,
      fieldStatus: options.field.status,
      criticality: options.field.criticality,
      ...options.attributes,
    },
  });
  attachFieldNode(context, options.field.id, nodeId);
  return nodeId;
}

function projectScalar(
  context: ProjectionContext,
  type: GraphNodeType,
  path: FieldLocation,
  field: ProjectField<string>,
  category?: string,
): GraphNodeId | null {
  if (!field.value?.trim()) return null;
  return addFieldNode(context, {
    type,
    path,
    field,
    stableKey: path,
    label: field.value,
    attributes: { value: field.value, ...(category ? { category } : {}) },
  });
}

function itemLabel(item: JsonValue): string {
  if (typeof item === "string") return item;
  if (item && !Array.isArray(item) && typeof item === "object") {
    for (const key of ["name", "title", "statement", "summary", "decision"]) {
      const value = item[key];
      if (typeof value === "string" && value.trim()) return value;
    }
  }
  return stableJson(item).slice(0, 120);
}

function projectList(
  context: ProjectionContext,
  type: GraphNodeType,
  path: FieldLocation,
  field: ProjectField<unknown[]>,
  category?: string,
): GraphNodeId[] {
  if (!field.value?.length) return [];
  const sorted = (field.value as JsonValue[])
    .map((item, sourceIndex) => ({ item, sourceIndex, label: itemLabel(item) }))
    .sort(
      (left, right) =>
        normalizedIdentity(left.label).localeCompare(normalizedIdentity(right.label)) ||
        stableJson(left.item).localeCompare(stableJson(right.item)) ||
        left.sourceIndex - right.sourceIndex,
    );
  const occurrences = new Map<string, number>();
  return sorted.map(({ item, sourceIndex, label }) => {
    const identity = normalizedIdentity(label);
    const occurrence = occurrences.get(identity) ?? 0;
    occurrences.set(identity, occurrence + 1);
    return addFieldNode(context, {
      type,
      path,
      field,
      stableKey: `${identity}:${occurrence}`,
      label,
      attributes: {
        value: item,
        sourceIndex,
        ...(category ? { category } : {}),
      },
    });
  });
}

function edgeConfidence(
  context: ProjectionContext,
  fromNodeId: GraphNodeId,
  toNodeId: GraphNodeId,
) {
  return Math.min(
    context.nodeById.get(fromNodeId)?.confidence ?? 100,
    context.nodeById.get(toNodeId)?.confidence ?? 100,
  );
}

function addEdge(
  context: ProjectionContext,
  type: GraphEdgeType,
  fromNodeId: GraphNodeId,
  toNodeId: GraphNodeId,
  options: {
    confidence?: number;
    inferred?: boolean;
    sourceRefs?: string[];
    evidenceRefs?: string[];
    approvalStatus?: ApprovalStatus;
    stableKey?: string;
  } = {},
) {
  if (fromNodeId === toNodeId) return;
  const stableKey = options.stableKey ?? "primary";
  const key = `${type}:${fromNodeId}:${toNodeId}:${stableKey}`;
  if (context.edgeKeys.has(key)) return;
  context.edgeKeys.add(key);
  context.edges.push({
    id: createGraphEdgeId(type, fromNodeId, toNodeId, stableKey),
    type,
    fromNodeId,
    toNodeId,
    sourceRefs: options.sourceRefs ?? [`projector:${type}`],
    evidenceRefs: options.evidenceRefs ?? [],
    confidence: options.confidence ?? edgeConfidence(context, fromNodeId, toNodeId),
    lifecycle: context.lifecycle,
    ...(options.approvalStatus ? { approvalStatus: options.approvalStatus } : {}),
    inferred: options.inferred ?? false,
  });
}

function projectMetadataRecords(context: ProjectionContext) {
  for (const decision of context.project.meta.decisions) {
    const nodeId = addNode(context, {
      id: createGraphNodeId("decision", decision.id),
      type: "decision",
      label: decision.title,
      sourceRefs: [`canonical:meta.decisions`, decision.id],
      evidenceRefs: [],
      confidence: 100,
      lifecycle: context.lifecycle,
      approvalStatus: decision.status,
      attributes: decision as unknown as Record<string, JsonValue>,
    });
    for (const fieldId of decision.fieldIds) {
      for (const affectedNodeId of context.fieldNodes.get(fieldId) ?? []) {
        addEdge(context, "decided_by", affectedNodeId, nodeId, {
          sourceRefs: [decision.id, fieldId],
          approvalStatus: decision.status,
        });
      }
    }
  }

  for (const assumption of context.project.meta.assumptions) {
    const nodeId = addNode(context, {
      id: createGraphNodeId("assumption", assumption.id),
      type: "assumption",
      label: assumption.statement,
      sourceRefs: [`canonical:meta.assumptions`, assumption.id],
      evidenceRefs: [],
      confidence: assumption.status === "accepted" ? 100 : 70,
      lifecycle: context.lifecycle,
      attributes: assumption as unknown as Record<string, JsonValue>,
    });
    for (const fieldId of assumption.fieldIds) {
      for (const affectedNodeId of context.fieldNodes.get(fieldId) ?? []) {
        addEdge(context, "assumed_by", affectedNodeId, nodeId, {
          sourceRefs: [assumption.id, fieldId],
          inferred: assumption.status !== "accepted",
        });
      }
    }
  }

  for (const conflict of context.project.meta.conflicts) {
    const nodeId = addNode(context, {
      id: createGraphNodeId("conflict", conflict.id),
      type: "conflict",
      label: conflict.summary,
      sourceRefs: [`canonical:meta.conflicts`, conflict.id],
      evidenceRefs: [...conflict.evidenceIds],
      confidence: 100,
      lifecycle: context.lifecycle,
      attributes: conflict as unknown as Record<string, JsonValue>,
    });
    for (const fieldId of conflict.fieldIds) {
      for (const affectedNodeId of context.fieldNodes.get(fieldId) ?? []) {
        addEdge(context, "conflicts_with", affectedNodeId, nodeId, {
          sourceRefs: [conflict.id, fieldId],
          evidenceRefs: [...conflict.evidenceIds],
        });
        if (conflict.status === "open") {
          addEdge(context, "blocked_by", affectedNodeId, nodeId, {
            sourceRefs: [conflict.id, fieldId],
            evidenceRefs: [...conflict.evidenceIds],
          });
        }
      }
    }
  }
}

export function projectCanonicalProjectToKnowledgeGraph(input: unknown): KnowledgeGraph {
  const project = parseCanonicalProject(input);
  const lifecycle: GraphLifecycleMetadata = {
    projectLifecycle: project.metadata.lifecycle,
    canonicalVersionId: project.metadata.version.id,
    canonicalVersionNumber: project.metadata.version.number,
  };
  const context: ProjectionContext = {
    project,
    lifecycle,
    nodes: [],
    edges: [],
    fieldNodes: new Map(),
    nodeById: new Map(),
    edgeKeys: new Set(),
  };

  const projectNodeId = addNode(context, {
    id: createGraphNodeId("project", project.metadata.projectId),
    type: "project",
    label: project.identity.name.value ?? "Unnamed project",
    sourceRefs: ["canonical:metadata", project.metadata.projectId],
    evidenceRefs: [...project.identity.name.evidenceIds],
    confidence: project.identity.name.confidence,
    lifecycle,
    approvalStatus: project.metadata.approvalStatus,
    attributes: {
      projectId: project.metadata.projectId,
      workspaceId: project.metadata.workspaceId,
      projectType: project.identity.projectType.value,
    },
  });
  const versionNodeId = addNode(context, {
    id: createGraphNodeId("version", project.metadata.version.id),
    type: "version",
    label: `Version ${project.metadata.version.number}`,
    sourceRefs: ["canonical:metadata.version", project.metadata.version.id],
    evidenceRefs: [],
    confidence: 100,
    lifecycle,
    approvalStatus: project.metadata.version.approvalStatus,
    attributes: project.metadata.version as unknown as Record<string, JsonValue>,
  });
  addEdge(context, "derived_from", projectNodeId, versionNodeId, {
    sourceRefs: [project.metadata.version.id],
    approvalStatus: project.metadata.version.approvalStatus,
  });

  const problemId = projectScalar(context, "problem", "business.problem", project.business.problem);
  const solutionId = projectScalar(
    context,
    "solution",
    "business.solution",
    project.business.solution,
  );
  const goalIds = projectList(context, "goal", "business.goals", project.business.goals);
  projectList(context, "user_persona", "business.targetUsers", project.business.targetUsers);
  projectList(
    context,
    "requirement",
    "business.successMetrics",
    project.business.successMetrics,
    "success_metric",
  );

  const scopeRequirementIds = [
    ...projectList(context, "requirement", "scope.inScope", project.scope.inScope, "in_scope"),
    ...projectList(
      context,
      "requirement",
      "scope.outOfScope",
      project.scope.outOfScope,
      "out_of_scope",
    ),
    ...projectList(
      context,
      "requirement",
      "scope.constraints",
      project.scope.constraints,
      "constraint",
    ),
  ];
  const dependencyIds = projectList(
    context,
    "requirement",
    "scope.dependencies",
    project.scope.dependencies,
    "dependency",
  );
  projectList(
    context,
    "requirement",
    "scope.assumptionSummaries",
    project.scope.assumptionSummaries,
    "assumption_summary",
  );

  projectList(context, "requirement", "product.platforms", project.product.platforms, "platform");
  const flowIds = projectList(
    context,
    "user_flow",
    "product.coreUserFlows",
    project.product.coreUserFlows,
  );
  const featureIds = projectList(context, "feature", "product.features", project.product.features);
  projectList(context, "requirement", "product.roles", project.product.roles, "role");
  projectList(
    context,
    "security_invariant",
    "product.permissions",
    project.product.permissions,
    "permission",
  );
  projectList(
    context,
    "requirement",
    "product.contentRequirements",
    project.product.contentRequirements,
    "content",
  );

  for (const [key, field] of Object.entries(project.visual) as Array<
    [keyof CanonicalProject["visual"], ProjectField<string[]>]
  >) {
    projectList(context, "visual_rule", `visual.${key}`, field, key);
  }

  const architectureIds = [
    ...projectList(
      context,
      "architecture_component",
      "technical.preferredStack",
      project.technical.preferredStack,
      "technology",
    ),
    ...[
      projectScalar(
        context,
        "architecture_component",
        "technical.architectureStyle",
        project.technical.architectureStyle,
        "architecture_style",
      ),
    ].filter((value): value is GraphNodeId => value !== null),
    ...[
      projectScalar(
        context,
        "architecture_component",
        "technical.storage",
        project.technical.storage,
        "storage",
      ),
    ].filter((value): value is GraphNodeId => value !== null),
    ...[
      projectScalar(
        context,
        "architecture_component",
        "technical.backgroundJobs",
        project.technical.backgroundJobs,
        "background_jobs",
      ),
    ].filter((value): value is GraphNodeId => value !== null),
    ...[
      projectScalar(
        context,
        "architecture_component",
        "technical.deployment",
        project.technical.deployment,
        "deployment",
      ),
    ].filter((value): value is GraphNodeId => value !== null),
  ];
  projectList(context, "data_entity", "technical.dataEntities", project.technical.dataEntities);
  const integrationIds = projectList(
    context,
    "integration",
    "technical.integrations",
    project.technical.integrations,
  );
  const securityIds = [
    ...projectList(
      context,
      "security_invariant",
      "technical.security",
      project.technical.security,
      "security",
    ),
    ...projectList(
      context,
      "security_invariant",
      "technical.privacy",
      project.technical.privacy,
      "privacy",
    ),
    ...[
      projectScalar(
        context,
        "security_invariant",
        "technical.authentication",
        project.technical.authentication,
        "authentication",
      ),
    ].filter((value): value is GraphNodeId => value !== null),
  ];
  if (project.technical.publicEnvironment.value) {
    for (const [key, value] of Object.entries(project.technical.publicEnvironment.value).sort()) {
      addFieldNode(context, {
        type: "requirement",
        path: "technical.publicEnvironment",
        field: project.technical.publicEnvironment,
        stableKey: key,
        label: key,
        attributes: { category: "public_environment", key, value },
      });
    }
  }

  projectList(
    context,
    "requirement",
    "quality.performance",
    project.quality.performance,
    "performance",
  );
  projectList(
    context,
    "requirement",
    "quality.accessibility",
    project.quality.accessibility,
    "accessibility",
  );
  const testIds = projectList(context, "test", "quality.testing", project.quality.testing);
  projectList(
    context,
    "requirement",
    "quality.observability",
    project.quality.observability,
    "observability",
  );
  projectList(
    context,
    "requirement",
    "quality.localization",
    project.quality.localization,
    "localization",
  );
  projectList(context, "requirement", "quality.seo", project.quality.seo, "seo");

  const taskIds = [
    ...projectList(context, "task", "execution.phases", project.execution.phases, "phase"),
    ...projectList(
      context,
      "task",
      "execution.milestones",
      project.execution.milestones,
      "milestone",
    ),
  ];
  const acceptanceIds = projectList(
    context,
    "requirement",
    "execution.acceptanceCriteria",
    project.execution.acceptanceCriteria,
    "acceptance_criterion",
  );
  const riskIds = projectList(context, "risk", "execution.risks", project.execution.risks);
  for (const [path, field] of [
    ["execution.currentTask", project.execution.currentTask],
    ["execution.nextTask", project.execution.nextTask],
  ] as const) {
    const taskId = projectScalar(
      context,
      "task",
      path,
      field,
      path.endsWith("currentTask") ? "current" : "next",
    );
    if (taskId) taskIds.push(taskId);
  }

  for (const featureId of featureIds) {
    const featureNode = context.nodeById.get(featureId);
    const featureValue = featureNode?.attributes.value;
    if (!featureValue || Array.isArray(featureValue) || typeof featureValue !== "object") continue;
    const criteria = featureValue.acceptanceCriteria;
    if (!Array.isArray(criteria)) continue;
    const sortedCriteria = criteria
      .flatMap((criterion, sourceIndex) =>
        typeof criterion === "string" ? [{ criterion, sourceIndex }] : [],
      )
      .sort(
        (left, right) =>
          normalizedIdentity(left.criterion).localeCompare(normalizedIdentity(right.criterion)) ||
          left.sourceIndex - right.sourceIndex,
      );
    const occurrences = new Map<string, number>();
    sortedCriteria.forEach(({ criterion, sourceIndex }) => {
      const identity = normalizedIdentity(criterion);
      const occurrence = occurrences.get(identity) ?? 0;
      occurrences.set(identity, occurrence + 1);
      const nodeId = addNode(context, {
        id: createGraphNodeId("requirement", `${featureId}:acceptance:${identity}:${occurrence}`),
        type: "requirement",
        label: criterion,
        sourceRefs: [...(featureNode?.sourceRefs ?? []), `derived:${featureId}:acceptanceCriteria`],
        evidenceRefs: [...(featureNode?.evidenceRefs ?? [])],
        confidence: featureNode?.confidence ?? 100,
        lifecycle,
        approvalStatus: featureNode?.approvalStatus,
        attributes: {
          category: "feature_acceptance_criterion",
          featureNodeId: featureId,
          criterion,
          sourceIndex,
        },
      });
      addEdge(context, "validated_by", featureId, nodeId, {
        sourceRefs: [`derived:${featureId}:acceptanceCriteria`],
      });
    });
  }

  projectMetadataRecords(context);

  const episodeNodeByEvidenceId = new Map<string, GraphNodeId>();
  for (const evidence of [...project.meta.evidence].sort((left, right) =>
    left.id.localeCompare(right.id),
  )) {
    const episodeNodeId = addNode(context, {
      id: createGraphNodeId("episode", evidence.id),
      type: "episode",
      label: `${evidence.sourceType}: ${evidence.interpretation}`,
      sourceRefs: ["canonical:meta.evidence", evidence.id, evidence.sourceId],
      evidenceRefs: [evidence.id],
      confidence: 100,
      lifecycle,
      temporal: {
        observedAt: evidence.createdAt,
        sourceCreatedAt: evidence.createdAt,
        ingestedAt: evidence.createdAt,
        effectiveFrom: evidence.createdAt,
        effectiveTo: null,
        invalidatedAt: null,
        supersededAt: null,
        supersededBy: null,
        currentStatus: "current",
      },
      provenance: { derivationMethod: "canonical", episodeRefs: [evidence.id] },
      attributes: evidence as unknown as Record<string, JsonValue>,
    });
    episodeNodeByEvidenceId.set(evidence.id, episodeNodeId);
  }
  for (const node of [...context.nodes]) {
    if (node.type === "episode") continue;
    for (const evidenceId of node.evidenceRefs) {
      const episodeNodeId = episodeNodeByEvidenceId.get(evidenceId);
      if (episodeNodeId) {
        addEdge(context, "evidenced_by", node.id, episodeNodeId, {
          sourceRefs: [evidenceId],
          evidenceRefs: [evidenceId],
        });
      }
    }
  }

  const documentationIds = DOCUMENTATION.map(([path, label]) =>
    addNode(context, {
      id: createGraphNodeId("documentation_artifact", path),
      type: "documentation_artifact",
      label,
      sourceRefs: ["contract:six-living-files", path],
      evidenceRefs: [],
      confidence: 100,
      lifecycle,
      approvalStatus: project.metadata.approvalStatus,
      attributes: { path, artifactKind: "living_context_file" },
    }),
  );

  for (const node of [...context.nodes]) {
    if (["project", "version", "documentation_artifact"].includes(node.type)) continue;
    addEdge(context, "relevant_to", node.id, projectNodeId, {
      confidence: node.confidence,
      inferred: false,
      sourceRefs: node.sourceRefs,
      evidenceRefs: node.evidenceRefs,
    });
    for (const documentationIndex of DOCUMENTATION_BY_NODE_TYPE[node.type] ?? []) {
      const documentationId = documentationIds[documentationIndex];
      if (documentationId) {
        addEdge(context, "documented_in", node.id, documentationId, {
          confidence: node.confidence,
          sourceRefs: ["contract:six-living-files"],
        });
      }
    }
  }
  for (const documentationId of documentationIds) {
    addEdge(context, "rendered_as", projectNodeId, documentationId, {
      sourceRefs: ["contract:six-living-files"],
      approvalStatus: project.metadata.approvalStatus,
    });
  }
  if (problemId && solutionId) addEdge(context, "mitigates", solutionId, problemId);
  for (const featureId of featureIds) {
    if (solutionId) addEdge(context, "implements", featureId, solutionId);
    for (const dependencyId of dependencyIds)
      addEdge(context, "depends_on", featureId, dependencyId);
    for (const securityId of securityIds) addEdge(context, "secured_by", featureId, securityId);
    for (const testId of testIds) addEdge(context, "tested_by", featureId, testId);
    for (const acceptanceId of acceptanceIds)
      addEdge(context, "validated_by", featureId, acceptanceId);
  }
  for (const flowId of flowIds) {
    for (const goalId of goalIds) {
      addEdge(context, "enables", flowId, goalId, {
        confidence: 70,
        inferred: true,
        sourceRefs: ["projector:structural-flow-goal"],
      });
    }
  }
  for (const integrationId of integrationIds) {
    for (const securityId of securityIds) addEdge(context, "secured_by", integrationId, securityId);
  }
  for (const architectureId of architectureIds) {
    for (const integrationId of integrationIds)
      addEdge(context, "depends_on", architectureId, integrationId, {
        confidence: 75,
        inferred: true,
      });
  }
  for (const riskId of riskIds) {
    const risk = context.nodeById.get(riskId)?.attributes.value;
    const impact = risk && !Array.isArray(risk) && typeof risk === "object" ? risk.impact : null;
    if (impact === "blocking") addEdge(context, "blocked_by", projectNodeId, riskId);
    else addEdge(context, "affects", riskId, projectNodeId);
  }
  for (const requirementId of scopeRequirementIds)
    addEdge(context, "relevant_to", requirementId, projectNodeId);
  for (let index = 0; index < taskIds.length - 1; index += 1) {
    addEdge(context, "precedes", taskIds[index]!, taskIds[index + 1]!);
  }

  return finalizeKnowledgeGraph({
    metadata: {
      projectId: project.metadata.projectId,
      canonicalVersionId: project.metadata.version.id,
      canonicalVersionNumber: project.metadata.version.number,
      canonicalProjectHash: canonicalProjectFingerprint(project),
      graphSchemaVersion: GRAPH_SCHEMA_VERSION,
      projectorVersion: GRAPH_PROJECTOR_VERSION,
      projectedAt: project.metadata.updatedAt,
    },
    nodes: context.nodes,
    edges: context.edges,
  });
}
