import { z } from "zod";

import {
  contentFingerprint,
  contentFingerprintSchema,
  stableJson,
  type JsonValue,
} from "../knowledge-graph";
import { timestampSchema } from "../project";

const nonempty = z.string().trim().min(1);
const refs = z.array(nonempty);
const id = <T extends string>(prefix: string) =>
  z
    .string()
    .regex(new RegExp(`^${prefix}_[a-z0-9]+(?:_[a-z0-9]+)*$`))
    .brand<T>();

export const parserAdapterIdSchema = id<"ParserAdapterId">("parser_adapter");
export const repositorySnapshotIdSchema = id<"RepositorySnapshotId">("repo_snapshot");
export const parsedFileIdSchema = id<"ParsedFileId">("parsed_file");
export const repositorySymbolIdSchema = id<"RepositorySymbolId">("repo_symbol");
export const structuralRelationshipIdSchema = id<"StructuralRelationshipId">("structural_edge");
export const structuralQueryIdSchema = id<"StructuralQueryId">("structural_query");
export const structuralMatchIdSchema = id<"StructuralMatchId">("structural_match");
export const structuralRuleIdSchema = id<"StructuralRuleId">("structural_rule");
export const ruleFindingIdSchema = id<"RuleFindingId">("rule_finding");
export const transformationPreviewIdSchema = id<"TransformationPreviewId">("transform_preview");

export const sourcePositionSchema = z
  .object({
    line: z.number().int().positive(),
    column: z.number().int().nonnegative(),
    byte: z.number().int().nonnegative(),
  })
  .strict();
export const sourceRangeSchema = z
  .object({ start: sourcePositionSchema, end: sourcePositionSchema })
  .strict()
  .superRefine((value, context) => {
    if (value.start.byte > value.end.byte)
      context.addIssue({
        code: "custom",
        path: ["end"],
        message: "Source range end must not precede start",
      });
  });

export const parserAdapterMetadataSchema = z
  .object({
    id: parserAdapterIdSchema,
    version: nonempty,
    supportedLanguage: nonempty,
    grammarVersion: nonempty,
    applicableExtensions: refs.min(1),
    errorTolerant: z.boolean(),
    incrementalUpdates: z.boolean(),
    capabilities: z
      .object({
        changedRanges: z.boolean(),
        nodeTraversal: z.boolean(),
        symbolExtraction: z.boolean(),
        relationshipExtraction: z.boolean(),
        structuralQuery: z.boolean(),
        serialization: z.boolean(),
      })
      .strict(),
    fingerprint: contentFingerprintSchema,
  })
  .strict();

export const repositorySnapshotSchema = z
  .object({
    id: repositorySnapshotIdSchema,
    repositoryRevision: nonempty,
    rootFingerprint: contentFingerprintSchema,
    capturedAt: timestampSchema,
    fileManifestRef: nonempty,
    changedFilePaths: refs,
    deletedFilePaths: refs,
    excludedPathPatterns: refs,
    languageDetectionVersion: nonempty,
    freshness: z.enum(["current", "stale", "unknown"]),
  })
  .strict();

export const changedRangeSchema = z
  .object({
    oldRange: sourceRangeSchema.nullable(),
    newRange: sourceRangeSchema.nullable(),
    changeType: z.enum(["insert", "delete", "replace"]),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.oldRange === null && value.newRange === null)
      context.addIssue({
        code: "custom",
        message: "A changed range requires an old or new range",
      });
  });

export const syntaxErrorRegionSchema = z
  .object({
    range: sourceRangeSchema,
    message: nonempty,
    recoverable: z.boolean(),
    parserNodeType: nonempty.nullable(),
  })
  .strict();

export const symbolRecordSchema = z
  .object({
    id: repositorySymbolIdSchema,
    parsedFileId: parsedFileIdSchema,
    name: nonempty,
    qualifiedName: nonempty,
    kind: z.enum([
      "module",
      "class",
      "interface",
      "type",
      "function",
      "method",
      "variable",
      "constant",
      "route",
      "schema",
      "test",
      "unknown",
    ]),
    range: sourceRangeSchema,
    exported: z.boolean(),
    sourceEvidenceRefs: refs.min(1),
    fingerprint: contentFingerprintSchema,
  })
  .strict();

export const structuralRelationshipSchema = z
  .object({
    id: structuralRelationshipIdSchema,
    parsedFileId: parsedFileIdSchema,
    fromSymbolId: repositorySymbolIdSchema,
    toSymbolId: repositorySymbolIdSchema.nullable(),
    unresolvedTarget: nonempty.nullable(),
    type: z.enum([
      "imports",
      "exports",
      "calls",
      "references",
      "extends",
      "implements",
      "tests",
      "configures",
    ]),
    range: sourceRangeSchema,
    derivationMethod: z.enum(["parsed_structure", "symbol_resolution", "repository_graph"]),
    confidence: z.number().min(0).max(100),
    evidenceRefs: refs.min(1),
    freshness: z.enum(["current", "stale", "unknown"]),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.toSymbolId === null && value.unresolvedTarget === null)
      context.addIssue({
        code: "custom",
        path: ["toSymbolId"],
        message: "Structural relationship requires a resolved or unresolved target",
      });
  });

export const parsedFileRecordSchema = z
  .object({
    id: parsedFileIdSchema,
    snapshotId: repositorySnapshotIdSchema,
    repositoryRevision: nonempty,
    filePath: nonempty,
    language: nonempty,
    contentHash: z.string().regex(/^sha256:[0-9a-f]{64}$/),
    parserId: parserAdapterIdSchema,
    parserVersion: nonempty,
    grammarVersion: nonempty,
    syntaxTreeFingerprint: contentFingerprintSchema,
    changedRanges: z.array(changedRangeSchema),
    syntaxErrorRegions: z.array(syntaxErrorRegionSchema),
    symbols: z.array(symbolRecordSchema),
    relationships: z.array(structuralRelationshipSchema),
    freshness: z.enum([
      "current",
      "stale_parser",
      "stale_grammar",
      "stale_content",
      "deleted",
      "unknown",
    ]),
    parsedAt: timestampSchema,
    fingerprint: contentFingerprintSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (value.symbols.some((symbol) => symbol.parsedFileId !== value.id))
      context.addIssue({
        code: "custom",
        path: ["symbols"],
        message: "Symbols must belong to the parsed file",
      });
    if (value.relationships.some((relationship) => relationship.parsedFileId !== value.id))
      context.addIssue({
        code: "custom",
        path: ["relationships"],
        message: "Relationships must belong to the parsed file",
      });
  });

export const structuralQuerySchema = z
  .object({
    id: structuralQueryIdSchema,
    version: nonempty,
    type: z.enum(["pattern", "symbol", "node_type", "relationship", "rule"]),
    language: nonempty,
    pattern: nonempty.nullable(),
    symbolName: nonempty.nullable(),
    nodeType: nonempty.nullable(),
    relationshipType: nonempty.nullable(),
    metavariableNames: refs,
    contextualConstraints: refs,
    exclusions: refs,
    fileScope: refs.min(1),
    resultLimit: z.number().int().positive(),
    parserVersionRef: nonempty,
  })
  .strict()
  .superRefine((value, context) => {
    const discriminator = {
      pattern: value.pattern,
      symbol: value.symbolName,
      node_type: value.nodeType,
      relationship: value.relationshipType,
      rule: value.pattern,
    }[value.type];
    if (!discriminator)
      context.addIssue({
        code: "custom",
        path: [value.type === "symbol" ? "symbolName" : "pattern"],
        message: "Structural query requires its type-specific selector",
      });
  });

export const structuralMatchSchema = z
  .object({
    id: structuralMatchIdSchema,
    queryId: structuralQueryIdSchema,
    parsedFileId: parsedFileIdSchema,
    filePath: nonempty,
    range: sourceRangeSchema,
    symbolId: repositorySymbolIdSchema.nullable(),
    matchedNodeType: nonempty,
    capturedVariables: z.record(nonempty, nonempty),
    surroundingScopeRef: nonempty,
    parserEvidenceRefs: refs.min(1),
    queryVersion: nonempty,
    confidence: z.number().min(0).max(100),
    freshness: z.enum(["current", "stale", "unknown"]),
  })
  .strict();

export const structuralRuleSchema = z
  .object({
    id: structuralRuleIdSchema,
    version: z.number().int().positive(),
    title: nonempty,
    language: nonempty,
    severity: z.enum(["blocking", "high", "medium", "low", "advisory"]),
    category: z.enum([
      "architecture",
      "security",
      "quality",
      "migration",
      "deprecated_api",
      "repository_convention",
      "framework_practice",
      "task_scope",
      "generated_file_protection",
    ]),
    purpose: nonempty,
    structuralPattern: nonempty,
    relationalConstraints: refs,
    positiveExampleRefs: refs.min(1),
    negativeExampleRefs: refs.min(1),
    fileScope: refs.min(1),
    exclusions: refs,
    fixAvailability: z.enum(["none", "preview_only", "available"]),
    fixRisk: z.enum(["none", "low", "medium", "high"]),
    enforcement: z.enum([
      "detection_only",
      "advisory",
      "blocking",
      "safe_auto_fix",
      "review_required_fix",
    ]),
    constitutionRuleRefs: refs,
    approvalState: z.enum(["draft", "approved", "rejected", "retired"]),
    evaluationHistoryRefs: refs,
    fingerprint: contentFingerprintSchema,
  })
  .strict();

export const ruleFindingSchema = z
  .object({
    id: ruleFindingIdSchema,
    ruleId: structuralRuleIdSchema,
    ruleVersion: z.number().int().positive(),
    matchId: structuralMatchIdSchema,
    repositoryEvidenceRefs: refs.min(1),
    status: z.enum(["evidence_only", "confirmed", "false_positive", "approved_exception"]),
    severity: z.enum(["blocking", "high", "medium", "low", "advisory"]),
    message: nonempty,
    approvalRequired: z.boolean(),
  })
  .strict();

export const transformationPreviewSchema = z
  .object({
    id: transformationPreviewIdSchema,
    ruleId: structuralRuleIdSchema,
    ruleVersion: z.number().int().positive(),
    matchIds: z.array(structuralMatchIdSchema).min(1),
    filePaths: refs.min(1),
    changedRanges: z.array(sourceRangeSchema).min(1),
    diffArtifactRef: nonempty,
    overlapConflictRefs: refs,
    restrictedFileRefs: refs,
    validationCommands: refs.min(1),
    risk: z.enum(["low", "medium", "high"]),
    approvalState: z.enum(["pending", "approved", "rejected"]),
    applied: z.literal(false),
    rollbackPlanRef: nonempty,
  })
  .strict();

export const repositoryUpdateClassificationSchema = z
  .object({
    snapshotId: repositorySnapshotIdSchema,
    classification: z.enum([
      "none",
      "text_only_non_structural",
      "local_structural",
      "public_interface_change",
      "cross_module_structural",
      "configuration_change",
      "generated_artifact_change",
      "deletion",
      "parser_grammar_invalidation",
      "full_rebuild_required",
    ]),
    affectedFileIds: z.array(parsedFileIdSchema),
    deletedFileIds: z.array(parsedFileIdSchema),
    actions: z
      .array(
        z.enum([
          "skip",
          "metadata_refresh",
          "local_file_reparse",
          "local_subgraph_rebuild",
          "dependency_closure_rebuild",
          "project_wide_rebuild",
          "prune_deleted_file",
          "manual_review",
        ]),
      )
      .min(1),
    invalidationFingerprintRefs: refs,
    reason: nonempty,
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.classification === "deletion" &&
      (value.deletedFileIds.length === 0 || !value.actions.includes("prune_deleted_file"))
    )
      context.addIssue({
        code: "custom",
        path: ["actions"],
        message: "Deletion requires deleted file IDs and graph pruning",
      });
    if (
      value.classification === "parser_grammar_invalidation" &&
      !value.actions.some((action) =>
        ["dependency_closure_rebuild", "project_wide_rebuild"].includes(action),
      )
    )
      context.addIssue({
        code: "custom",
        path: ["actions"],
        message: "Parser or grammar invalidation requires an explicit rebuild",
      });
  });

export function createParsedFileFingerprint(input: {
  repositoryRevision: string;
  filePath: string;
  contentHash: string;
  parserId: string;
  parserVersion: string;
  grammarVersion: string;
  extractionRulesVersion: string;
}): string {
  return contentFingerprint(input).toString();
}

export function assessParsedFileCache(
  input: unknown,
  expected: {
    parserId: string;
    parserVersion: string;
    grammarVersion: string;
    contentHash: string;
  },
): {
  reusable: boolean;
  freshness: "current" | "stale_parser" | "stale_grammar" | "stale_content";
} {
  const record = parsedFileRecordSchema.parse(input);
  if (record.parserId !== expected.parserId || record.parserVersion !== expected.parserVersion)
    return { reusable: false, freshness: "stale_parser" };
  if (record.grammarVersion !== expected.grammarVersion)
    return { reusable: false, freshness: "stale_grammar" };
  if (record.contentHash !== expected.contentHash)
    return { reusable: false, freshness: "stale_content" };
  return { reusable: true, freshness: "current" };
}

export function serializeRepositoryIntelligenceContract(input: JsonValue): string {
  return stableJson(input);
}

export type ParserAdapterMetadata = z.infer<typeof parserAdapterMetadataSchema>;
export type RepositorySnapshot = z.infer<typeof repositorySnapshotSchema>;
export type ParsedFileRecord = z.infer<typeof parsedFileRecordSchema>;
export type ChangedRange = z.infer<typeof changedRangeSchema>;
export type SyntaxErrorRegion = z.infer<typeof syntaxErrorRegionSchema>;
export type SymbolRecord = z.infer<typeof symbolRecordSchema>;
export type StructuralRelationship = z.infer<typeof structuralRelationshipSchema>;
export type StructuralQuery = z.infer<typeof structuralQuerySchema>;
export type StructuralMatch = z.infer<typeof structuralMatchSchema>;
export type StructuralRule = z.infer<typeof structuralRuleSchema>;
export type RuleFinding = z.infer<typeof ruleFindingSchema>;
export type TransformationPreview = z.infer<typeof transformationPreviewSchema>;
export type RepositoryUpdateClassification = z.infer<typeof repositoryUpdateClassificationSchema>;
