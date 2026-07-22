import { describe, expect, it } from "vitest";

import { contentFingerprint } from "../knowledge-graph";
import {
  assessParsedFileCache,
  changedRangeSchema,
  createParsedFileFingerprint,
  parsedFileRecordSchema,
  parserAdapterMetadataSchema,
  repositoryUpdateClassificationSchema,
  ruleFindingSchema,
  serializeRepositoryIntelligenceContract,
  structuralMatchSchema,
  structuralQuerySchema,
  transformationPreviewSchema,
} from ".";

const now = "2026-07-23T00:00:00.000Z";
const fp = contentFingerprint({ repo: 1 });
const hash = `sha256:${"a".repeat(64)}`;
const range = {
  start: { line: 1, column: 0, byte: 0 },
  end: { line: 1, column: 10, byte: 10 },
};
const parsedFile = {
  id: "parsed_file_index",
  snapshotId: "repo_snapshot_main",
  repositoryRevision: "abc123",
  filePath: "src/index.ts",
  language: "typescript",
  contentHash: hash,
  parserId: "parser_adapter_typescript",
  parserVersion: "1.0.0",
  grammarVersion: "1.0.0",
  syntaxTreeFingerprint: fp,
  changedRanges: [],
  syntaxErrorRegions: [
    { range, message: "Missing token", recoverable: true, parserNodeType: "ERROR" },
  ],
  symbols: [],
  relationships: [],
  freshness: "current" as const,
  parsedAt: now,
  fingerprint: fp,
};

describe("Repository Intelligence contracts", () => {
  it("validates parser adapter metadata", () => {
    expect(
      parserAdapterMetadataSchema.parse({
        id: "parser_adapter_typescript",
        version: "1.0.0",
        supportedLanguage: "typescript",
        grammarVersion: "1.0.0",
        applicableExtensions: [".ts", ".tsx"],
        errorTolerant: true,
        incrementalUpdates: true,
        capabilities: {
          changedRanges: true,
          nodeTraversal: true,
          symbolExtraction: true,
          relationshipExtraction: true,
          structuralQuery: true,
          serialization: true,
        },
        fingerprint: fp,
      }).supportedLanguage,
    ).toBe("typescript");
  });

  it("creates stable parsed-file fingerprints", () => {
    const input = {
      repositoryRevision: "abc123",
      filePath: "src/index.ts",
      contentHash: hash,
      parserId: "parser_adapter_typescript",
      parserVersion: "1",
      grammarVersion: "1",
      extractionRulesVersion: "1",
    };
    expect(createParsedFileFingerprint(input)).toBe(createParsedFileFingerprint({ ...input }));
  });

  it("validates changed ranges", () => {
    expect(() =>
      changedRangeSchema.parse({
        oldRange: { start: range.end, end: range.start },
        newRange: null,
        changeType: "delete",
      }),
    ).toThrow(/must not precede/);
  });

  it("keeps recoverable syntax errors visible", () => {
    expect(parsedFileRecordSchema.parse(parsedFile).syntaxErrorRegions[0]?.recoverable).toBe(true);
  });

  it("validates structural query selectors", () => {
    expect(() =>
      structuralQuerySchema.parse({
        id: "structural_query_symbol",
        version: "1",
        type: "symbol",
        language: "typescript",
        pattern: null,
        symbolName: null,
        nodeType: null,
        relationshipType: null,
        metavariableNames: [],
        contextualConstraints: [],
        exclusions: [],
        fileScope: ["src/"],
        resultLimit: 10,
        parserVersionRef: "parser:1",
      }),
    ).toThrow(/type-specific selector/);
  });

  it("requires structural matches to retain a source range", () => {
    const match = {
      id: "structural_match_console",
      queryId: "structural_query_console",
      parsedFileId: parsedFile.id,
      filePath: parsedFile.filePath,
      range,
      symbolId: null,
      matchedNodeType: "call_expression",
      capturedVariables: { function: "console.log" },
      surroundingScopeRef: "scope:module",
      parserEvidenceRefs: ["tree:node:1"],
      queryVersion: "1",
      confidence: 100,
      freshness: "current",
    };
    expect(structuralMatchSchema.parse(match).range.start.line).toBe(1);
    expect(() => structuralMatchSchema.parse({ ...match, range: undefined })).toThrow();
  });

  it("requires rule and repository evidence for findings", () => {
    const finding = {
      id: "rule_finding_console",
      ruleId: "structural_rule_console",
      ruleVersion: 1,
      matchId: "structural_match_console",
      repositoryEvidenceRefs: ["tree:node:1"],
      status: "evidence_only",
      severity: "advisory",
      message: "Console logging detected",
      approvalRequired: false,
    };
    expect(ruleFindingSchema.parse(finding).status).toBe("evidence_only");
    expect(() => ruleFindingSchema.parse({ ...finding, repositoryEvidenceRefs: [] })).toThrow();
  });

  it("keeps transformation previews non-applying", () => {
    const preview = {
      id: "transform_preview_console",
      ruleId: "structural_rule_console",
      ruleVersion: 1,
      matchIds: ["structural_match_console"],
      filePaths: ["src/index.ts"],
      changedRanges: [range],
      diffArtifactRef: "artifact:diff",
      overlapConflictRefs: [],
      restrictedFileRefs: [],
      validationCommands: ["npm test"],
      risk: "low",
      approvalState: "pending",
      applied: false,
      rollbackPlanRef: "rollback:git",
    };
    expect(transformationPreviewSchema.parse(preview).applied).toBe(false);
    expect(() => transformationPreviewSchema.parse({ ...preview, applied: true })).toThrow();
  });

  it("invalidates cache records after parser changes", () => {
    expect(
      assessParsedFileCache(parsedFile, {
        parserId: parsedFile.parserId,
        parserVersion: "2.0.0",
        grammarVersion: parsedFile.grammarVersion,
        contentHash: hash,
      }),
    ).toEqual({ reusable: false, freshness: "stale_parser" });
  });

  it("requires graph pruning for deletions", () => {
    expect(() =>
      repositoryUpdateClassificationSchema.parse({
        snapshotId: parsedFile.snapshotId,
        classification: "deletion",
        affectedFileIds: [],
        deletedFileIds: [parsedFile.id],
        actions: ["local_subgraph_rebuild"],
        invalidationFingerprintRefs: [fp],
        reason: "File deleted",
      }),
    ).toThrow(/graph pruning/);
  });

  it("serializes contracts deterministically", () => {
    expect(serializeRepositoryIntelligenceContract({ b: 2, a: 1 })).toBe('{"a":1,"b":2}');
  });

  it("rejects invalid records", () => {
    expect(() => parsedFileRecordSchema.parse({ ...parsedFile, contentHash: "abc123" })).toThrow();
  });
});
