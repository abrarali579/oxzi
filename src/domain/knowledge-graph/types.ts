import type { ApprovalStatus, LifecycleStatus, ProjectId, VersionId } from "../project";
import type {
  GraphEdgeType,
  GraphNodeType,
  DerivationMethod,
  FreshnessStatus,
  GraphIntegrityStatus,
  MandatoryCoverageStatus,
  MeasurementStatus,
  TraversalDirection,
  TemporalQueryMode,
  TemporalStatus,
} from "./enums";
import type { ContentFingerprint, GraphEdgeId, GraphNodeId } from "./identifiers";

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export type GraphLifecycleMetadata = {
  projectLifecycle: LifecycleStatus;
  canonicalVersionId: VersionId;
  canonicalVersionNumber: number;
};

export type TemporalMetadata = {
  observedAt: string;
  sourceCreatedAt: string;
  ingestedAt: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  invalidatedAt: string | null;
  supersededAt: string | null;
  supersededBy: GraphNodeId | null;
  currentStatus: TemporalStatus;
};

export type FreshnessMetadata = {
  status: FreshnessStatus;
  checkedAt: string;
  reason: string | null;
};
export type ProvenanceMetadata = { derivationMethod: DerivationMethod; episodeRefs: string[] };
export type TemporalQuery = { mode: TemporalQueryMode; asOf?: string };

export type KnowledgeGraphNode = {
  id: GraphNodeId;
  type: GraphNodeType;
  label: string;
  sourceRefs: string[];
  evidenceRefs: string[];
  confidence: number;
  lifecycle: GraphLifecycleMetadata;
  temporal: TemporalMetadata;
  freshness: FreshnessMetadata;
  provenance: ProvenanceMetadata;
  schemaVersion: string;
  projectorVersion: string;
  order: number;
  approvalStatus?: ApprovalStatus;
  attributes: Record<string, JsonValue>;
  fingerprint: ContentFingerprint;
};

export type KnowledgeGraphEdge = {
  id: GraphEdgeId;
  type: GraphEdgeType;
  fromNodeId: GraphNodeId;
  toNodeId: GraphNodeId;
  sourceRefs: string[];
  evidenceRefs: string[];
  confidence: number;
  lifecycle: GraphLifecycleMetadata;
  temporal: TemporalMetadata;
  freshness: FreshnessMetadata;
  provenance: ProvenanceMetadata;
  schemaVersion: string;
  projectorVersion: string;
  order: number;
  approvalStatus?: ApprovalStatus;
  inferred: boolean;
  fingerprint: ContentFingerprint;
};

export type KnowledgeGraphMetadata = {
  projectId: ProjectId;
  canonicalVersionId: VersionId;
  canonicalVersionNumber: number;
  canonicalProjectHash: ContentFingerprint;
  graphSchemaVersion: string;
  projectorVersion: string;
  graphFingerprint: ContentFingerprint;
  projectedAt: string;
};

export type KnowledgeGraph = {
  metadata: KnowledgeGraphMetadata;
  nodes: KnowledgeGraphNode[];
  edges: KnowledgeGraphEdge[];
};

type GeneratedRecordFields =
  | "order"
  | "fingerprint"
  | "temporal"
  | "freshness"
  | "provenance"
  | "schemaVersion"
  | "projectorVersion";
export type KnowledgeGraphNodeInput = Omit<KnowledgeGraphNode, GeneratedRecordFields> &
  Partial<Pick<KnowledgeGraphNode, Exclude<GeneratedRecordFields, "order" | "fingerprint">>>;
export type KnowledgeGraphEdgeInput = Omit<KnowledgeGraphEdge, GeneratedRecordFields> &
  Partial<Pick<KnowledgeGraphEdge, Exclude<GeneratedRecordFields, "order" | "fingerprint">>>;

export type ReferenceIndexEntry = {
  nodeIds: GraphNodeId[];
  edgeIds: GraphEdgeId[];
};

export type KnowledgeGraphIndexes = {
  nodeById: ReadonlyMap<GraphNodeId, KnowledgeGraphNode>;
  nodesByType: ReadonlyMap<GraphNodeType, readonly KnowledgeGraphNode[]>;
  edgesByType: ReadonlyMap<GraphEdgeType, readonly KnowledgeGraphEdge[]>;
  outgoingByNodeId: ReadonlyMap<GraphNodeId, readonly KnowledgeGraphEdge[]>;
  incomingByNodeId: ReadonlyMap<GraphNodeId, readonly KnowledgeGraphEdge[]>;
  bySourceReference: ReadonlyMap<string, ReferenceIndexEntry>;
  byEvidenceReference: ReadonlyMap<string, ReferenceIndexEntry>;
  nodesByLifecycleState: ReadonlyMap<string, readonly KnowledgeGraphNode[]>;
  currentNodes: readonly KnowledgeGraphNode[];
  nodesByVersion: ReadonlyMap<string, readonly KnowledgeGraphNode[]>;
  nodesByProjectSection: ReadonlyMap<string, readonly KnowledgeGraphNode[]>;
};

export type TokenEstimate = {
  value: number | null;
  status: MeasurementStatus;
};

export type TruncationMetadata = {
  truncated: boolean;
  reasons: string[];
  omittedNodeCount: number;
  omittedCategories: GraphNodeType[];
  mandatoryCoverageStatus: MandatoryCoverageStatus;
  minimumSafeTokenEstimate: TokenEstimate;
};

export type TraversalVisit = {
  nodeId: GraphNodeId;
  depth: number;
  pathNodeIds: GraphNodeId[];
  pathEdgeIds: GraphEdgeId[];
  minimumPathConfidence: number;
};

export type TraversalOptions = {
  seedNodeIds: GraphNodeId[];
  direction?: TraversalDirection;
  relationshipTypes?: GraphEdgeType[];
  nodeTypes?: GraphNodeType[];
  maxDepth?: number;
  resultLimit?: number;
  highDegreeThreshold?: number;
  includeHighDegreeHubs?: boolean;
  uncertaintyThreshold?: number;
  minimumConfidence?: number;
  temporalQuery?: TemporalQuery;
};

export type TraversalResult = {
  seedNodeIds: GraphNodeId[];
  direction: TraversalDirection;
  visits: TraversalVisit[];
  traversedEdgeIds: GraphEdgeId[];
  uncertainEdgeIds: GraphEdgeId[];
  suppressedHubNodeIds: GraphNodeId[];
  cyclesDetected: Array<{ fromNodeId: GraphNodeId; toNodeId: GraphNodeId; edgeId: GraphEdgeId }>;
  truncation: TruncationMetadata;
};

export type ImpactGroups = {
  requirements: GraphNodeId[];
  features: GraphNodeId[];
  decisions: GraphNodeId[];
  risks: GraphNodeId[];
  securityInvariants: GraphNodeId[];
  architectureComponents: GraphNodeId[];
  integrations: GraphNodeId[];
  screens: GraphNodeId[];
  modules: GraphNodeId[];
  files: GraphNodeId[];
  tests: GraphNodeId[];
  documentation: GraphNodeId[];
  blockers: GraphNodeId[];
};

export type ImpactAnalysis = {
  seedNodeIds: GraphNodeId[];
  affected: ImpactGroups;
  directImpactNodeIds: GraphNodeId[];
  transitiveImpactNodeIds: GraphNodeId[];
  uncertainImpactNodeIds: GraphNodeId[];
  blockingImpactNodeIds: GraphNodeId[];
  historicalOnlyImpactNodeIds: GraphNodeId[];
  staleArtifactImpactNodeIds: GraphNodeId[];
  truncation: TruncationMetadata;
};

export type KnowledgeGraphPath = {
  fromNodeId: GraphNodeId;
  toNodeId: GraphNodeId;
  nodeIds: GraphNodeId[];
  edgeIds: GraphEdgeId[];
  relationshipTypes: GraphEdgeType[];
  minimumConfidence: number;
  evidenceRefs: string[];
  temporallyValid: boolean;
  unresolvedGaps: string[];
  truncated: boolean;
};

export type GraphIntegrityIssue = {
  severity: "warning" | "error";
  code: string;
  recordId: string | null;
  message: string;
};

export type GraphIntegrityResult = {
  status: GraphIntegrityStatus;
  issues: GraphIntegrityIssue[];
  orphanNodeIds: GraphNodeId[];
  unresolvedEdgeIds: GraphEdgeId[];
  checkedNodeCount: number;
  checkedEdgeCount: number;
};

export type OmittedSubgraphNode = {
  nodeId: GraphNodeId;
  category: GraphNodeType;
  reason: string;
};

export type TaskSubgraphCoverage = {
  status: Exclude<MandatoryCoverageStatus, "not_assessed">;
  seedCoverage: boolean;
  dependencyCoverage: boolean;
  blockerCoverage: boolean;
  decisionCoverage: boolean;
  securityCoverage: boolean;
  testCoverage: boolean;
  documentationCoverage: boolean;
  missingMandatoryNodeIds: GraphNodeId[];
};

export type TaskSubgraph = {
  canonicalProjectHash: ContentFingerprint;
  graphFingerprint: ContentFingerprint;
  graphSchemaVersion: string;
  projectorVersion: string;
  seedNodes: KnowledgeGraphNode[];
  requirements: KnowledgeGraphNode[];
  applicableConstitutionRules: KnowledgeGraphNode[];
  mandatoryDependencies: KnowledgeGraphNode[];
  blockers: KnowledgeGraphNode[];
  acceptedDecisions: KnowledgeGraphNode[];
  securityInvariants: KnowledgeGraphNode[];
  relevantTests: KnowledgeGraphNode[];
  relevantDocumentation: KnowledgeGraphNode[];
  risks: KnowledgeGraphNode[];
  acceptanceCriteria: KnowledgeGraphNode[];
  implementationEvidence: KnowledgeGraphNode[];
  freshnessStatus: FreshnessStatus;
  includedNodes: KnowledgeGraphNode[];
  includedEdges: KnowledgeGraphEdge[];
  omittedNodes: OmittedSubgraphNode[];
  coverage: TaskSubgraphCoverage;
  truncation: TruncationMetadata;
};
