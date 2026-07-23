import { lstatSync, readdirSync, readFileSync, realpathSync } from "node:fs";
import { basename, extname, join, relative, resolve, sep } from "node:path";
import { contentFingerprint, stableJson, type JsonValue } from "../knowledge-graph";

// ── Safe oxc-parser import (eval-based to hide from Turbopack) ──

let oxcParser: unknown = null;
let oxcLoadAttempted = false;

function getOxcParser(): unknown {
  if (!oxcLoadAttempted) {
    oxcLoadAttempted = true;
    try {
      oxcParser = eval('require')("oxc-parser");
    } catch {
      // Native WASM bindings unavailable — functions that need AST will return empty results
    }
  }
  if (!oxcParser) {
    throw new Error("oxc-parser native bindings not available");
  }
  return oxcParser;
}

/**
 * Safe wrapper around oxc-parser's parseSync.
 * Returns an empty AST when native bindings are unavailable (e.g. in Turbopack dev).
 */
function parseASTSafe(filePath: string, content: string): { program: { body: Array<Record<string, unknown>> } } {
  try {
    const parser = getOxcParser() as { parseSync: (path: string, content: string) => { program: { body: Array<Record<string, unknown>> } } };
    return parser.parseSync(filePath, content);
  } catch {
    return { program: { body: [] } };
  }
}
import {
  dependencyEdgeSchema,
  fileNodeSchema,
  repositoryManifestSchema,
  sourceRangeSchema,
  parsedFileIdSchema,
  repositorySymbolIdSchema,
  structuralRelationshipIdSchema,
  symbolRecordSchema,
  structuralRelationshipSchema,
  type DependencyEdge,
  type FileNode,
  type RepositoryManifest,
  type SymbolRecord,
  type StructuralRelationship,
} from "./schemas";

// ── Exclusion -------------------------------------------------------

const ALWAYS_EXCLUDED_DIRS = new Set([
  "node_modules",
  ".git",
  ".review",
  ".next",
  "out",
  "build",
  ".vercel",
]);
const ALWAYS_EXCLUDED_FILES = new Set([
  ".DS_Store",
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "bun.lock",
  ".gitignore",
  ".gitkeep",
]);

const PARSABLE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".mts", ".cts"]);

// ── Hard Limits & OOM Protection ──────────────────────────────────

/** Maximum number of files to traverse per scan. */
export const MAX_FILES_PER_SCAN = 5_000;

/** Maximum total AST content bytes to parse per scan. */
export const MAX_AST_CONTENT_BYTES = 50 * 1024 * 1024; // 50 MB

/**
 * Error type emitted when repository size exceeds configured limits.
 */
export interface SizeBoundaryExceeded {
  kind: "SizeBoundaryExceeded";
  message: string;
  limit: { maxFiles: number; maxContentBytes: number };
  actual: { filesScanned: number; contentBytesRead: number };
}

export function isSizeBoundaryExceeded(err: unknown): err is SizeBoundaryExceeded {
  return (
    typeof err === "object" &&
    err !== null &&
    (err as SizeBoundaryExceeded).kind === "SizeBoundaryExceeded"
  );
}

// ── AST-based parsing (V2) ──────────────────────────────────────

interface AstNode {
  type: string;
  start: number;
  end: number;
  [key: string]: unknown;
}

function toSourcePosition(pos: number, lines: number[]): { line: number; column: number } {
  // Binary search to find which line this position falls on
  let low = 0;
  let high = lines.length - 1;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (lines[mid]! <= pos) low = mid;
    else high = mid - 1;
  }
  const lineStart = lines[low]!;
  return { line: low + 1, column: pos - lineStart };
}

function buildLineStarts(content: string): number[] {
  const starts = [0];
  for (let i = 0; i < content.length; i++) {
    if (content[i] === "\n") starts.push(i + 1);
  }
  return starts;
}

function makeSourceRange(
  start: number,
  end: number,
  lines: number[],
): {
  start: { line: number; column: number; byte: number };
  end: { line: number; column: number; byte: number };
} {
  return sourceRangeSchema.parse({
    start: { ...toSourcePosition(start, lines), byte: start },
    end: { ...toSourcePosition(end, lines), byte: end },
  });
}

function nodeName(node: AstNode): string {
  if (node.type === "ExportNamedDeclaration" || node.type === "ExportDefaultDeclaration") {
    const decl = node.declaration as AstNode | undefined;
    if (decl?.type === "VariableDeclaration") {
      const vars = decl.declarations as AstNode[] | undefined;
      if (vars?.[0]?.id) return ((vars[0].id as AstNode).name as string) ?? "";
    }
    if (
      decl?.type === "FunctionDeclaration" ||
      decl?.type === "ClassDeclaration" ||
      decl?.type === "TSInterfaceDeclaration" ||
      decl?.type === "TSTypeAliasDeclaration"
    ) {
      return ((decl.id as AstNode | undefined)?.name as string) ?? "";
    }
  }
  return "";
}

export function parseFileAST(
  content: string,
  filePath: string,
): {
  symbols: SymbolRecord[];
  relationships: StructuralRelationship[];
  exports: string[];
  imports: string[];
} {
  const lines = buildLineStarts(content);
  const parsed = parseASTSafe(filePath, content);
  const symbols: SymbolRecord[] = [];
  const relationships: StructuralRelationship[] = [];
  const exportNames: string[] = [];
  const importSpecifiers: string[] = [];
  const fileId = parsedFileIdSchema.parse(
    `parsed_file_${contentFingerprint({ filePath }).replace("fp_f1_", "").slice(0, 16)}`,
  );

  const body = parsed.program.body ?? [];

  for (const stmt of body) {
    const node = stmt as AstNode;

    // ── Imports ───────────────────────────────────────────────
    if (node.type === "ImportDeclaration") {
      const source = node.source as AstNode | undefined;
      const specifier = (source?.value as string) ?? "";
      if (specifier) importSpecifiers.push(specifier);

      // Create symbol for each import specifier
      const specifiers = node.specifiers as AstNode[] | undefined;
      if (specifiers) {
        for (const spec of specifiers) {
          const local = spec.local as AstNode | undefined;
          const name = (local?.name as string) ?? "";
          if (name) {
            symbols.push(
              symbolRecordSchema.parse({
                id: repositorySymbolIdSchema.parse(
                  `repo_symbol_${contentFingerprint({ fileId, name }).replace("fp_f1_", "").slice(0, 16)}`,
                ),
                parsedFileId: fileId,
                name,
                qualifiedName: name,
                kind: "variable",
                range: makeSourceRange(node.start!, node.end!, lines),
                exported: false,
                sourceEvidenceRefs: [`ast:${filePath}`],
                fingerprint: contentFingerprint({ fileId, name }),
              }),
            );
          }
        }
      }

      // Create relationship for the import
      relationships.push(
        structuralRelationshipSchema.parse({
          id: structuralRelationshipIdSchema.parse(
            `structural_edge_${contentFingerprint({ fileId, source: specifier }).replace("fp_f1_", "").slice(0, 16)}`,
          ),
          parsedFileId: fileId,
          fromSymbolId: repositorySymbolIdSchema.parse(
            `repo_symbol_${contentFingerprint({ fileId, name: "__module__" }).replace("fp_f1_", "").slice(0, 16)}`,
          ),
          toSymbolId: null,
          unresolvedTarget: specifier,
          type: "imports",
          range: makeSourceRange(node.start!, node.end!, lines),
          derivationMethod: "parsed_structure",
          confidence: 100,
          evidenceRefs: [`ast:${filePath}`],
          freshness: "current",
        }),
      );
    }

    // ── Exports ───────────────────────────────────────────────
    if (node.type === "ExportNamedDeclaration" || node.type === "ExportDefaultDeclaration") {
      const name = nodeName(node);
      if (name) exportNames.push(name);

      // Handle export specifier lists: export { greet, VERSION }
      const specifiers = node.specifiers as AstNode[] | undefined;
      if (specifiers && specifiers.length > 0) {
        for (const spec of specifiers) {
          const local = spec.local as AstNode | undefined;
          const exported = spec.exported as AstNode | undefined;
          const exportName = (exported?.name as string) ?? (local?.name as string) ?? "";
          if (exportName) exportNames.push(exportName);

          if (exportName) {
            symbols.push(
              symbolRecordSchema.parse({
                id: repositorySymbolIdSchema.parse(
                  `repo_symbol_${contentFingerprint({ fileId, name: `export_${exportName}` })
                    .replace("fp_f1_", "")
                    .slice(0, 16)}`,
                ),
                parsedFileId: fileId,
                name: exportName,
                qualifiedName: exportName,
                kind: "variable",
                range: makeSourceRange(node.start!, node.end!, lines),
                exported: true,
                sourceEvidenceRefs: [`ast:${filePath}`],
                fingerprint: contentFingerprint({ fileId, name: `export_${exportName}` }),
              }),
            );

            relationships.push(
              structuralRelationshipSchema.parse({
                id: structuralRelationshipIdSchema.parse(
                  `structural_edge_${contentFingerprint({ fileId, name: `export_${exportName}` })
                    .replace("fp_f1_", "")
                    .slice(0, 16)}`,
                ),
                parsedFileId: fileId,
                fromSymbolId: repositorySymbolIdSchema.parse(
                  `repo_symbol_${contentFingerprint({ fileId, name: `export_${exportName}` })
                    .replace("fp_f1_", "")
                    .slice(0, 16)}`,
                ),
                toSymbolId: null,
                unresolvedTarget: exportName,
                type: "exports",
                range: makeSourceRange(node.start!, node.end!, lines),
                derivationMethod: "parsed_structure",
                confidence: 100,
                evidenceRefs: [`ast:${filePath}`],
                freshness: "current",
              }),
            );
          }
        }
      }

      // Create symbol for export
      if (name) {
        symbols.push(
          symbolRecordSchema.parse({
            id: repositorySymbolIdSchema.parse(
              `repo_symbol_${contentFingerprint({ fileId, name: `export_${name}` })
                .replace("fp_f1_", "")
                .slice(0, 16)}`,
            ),
            parsedFileId: fileId,
            name,
            qualifiedName: name,
            kind: node.type === "ExportDefaultDeclaration" ? "function" : "variable",
            range: makeSourceRange(node.start!, node.end!, lines),
            exported: true,
            sourceEvidenceRefs: [`ast:${filePath}`],
            fingerprint: contentFingerprint({ fileId, name: `export_${name}` }),
          }),
        );

        // Create relationship for the export
        relationships.push(
          structuralRelationshipSchema.parse({
            id: structuralRelationshipIdSchema.parse(
              `structural_edge_${contentFingerprint({ fileId, name: `export_${name}` })
                .replace("fp_f1_", "")
                .slice(0, 16)}`,
            ),
            parsedFileId: fileId,
            fromSymbolId: symbolRecordSchema.parse(symbols[symbols.length - 1]!).id,
            toSymbolId: null,
            unresolvedTarget: name,
            type: "exports",
            range: makeSourceRange(node.start!, node.end!, lines),
            derivationMethod: "parsed_structure",
            confidence: 100,
            evidenceRefs: [`ast:${filePath}`],
            freshness: "current",
          }),
        );
      }

      // Check for re-exports (export ... from '...')
      const source = node.source as AstNode | undefined;
      if (source?.value) {
        importSpecifiers.push(source.value as string);
      }
    }

    // ── Function/class declarations (non-exported) ────────────
    if (node.type === "FunctionDeclaration" || node.type === "ClassDeclaration") {
      const id = node.id as AstNode | undefined;
      const name = (id?.name as string) ?? "";
      if (name) {
        symbols.push(
          symbolRecordSchema.parse({
            id: repositorySymbolIdSchema.parse(
              `repo_symbol_${contentFingerprint({ fileId, name }).replace("fp_f1_", "").slice(0, 16)}`,
            ),
            parsedFileId: fileId,
            name,
            qualifiedName: name,
            kind: node.type === "FunctionDeclaration" ? "function" : "class",
            range: makeSourceRange(node.start!, node.end!, lines),
            exported: false,
            sourceEvidenceRefs: [`ast:${filePath}`],
            fingerprint: contentFingerprint({ fileId, name }),
          }),
        );
      }
    }

    // ── Call expressions (for console.log detection etc.) ─────
    if (node.type === "ExpressionStatement") {
      const expr = node.expression as AstNode | undefined;
      if (expr?.type === "CallExpression") {
        const callee = expr.callee as AstNode | undefined;
        if (callee?.type === "MemberExpression") {
          const obj = callee.object as AstNode | undefined;
          const prop = callee.property as AstNode | undefined;
          const fullName = `${(obj as AstNode | undefined)?.name ?? ""}.${(prop as AstNode | undefined)?.name ?? ""}`;
          if (fullName) {
            symbols.push(
              symbolRecordSchema.parse({
                id: repositorySymbolIdSchema.parse(
                  `repo_symbol_${contentFingerprint({ fileId, name: fullName }).replace("fp_f1_", "").slice(0, 16)}`,
                ),
                parsedFileId: fileId,
                name: fullName,
                qualifiedName: fullName,
                kind: "function",
                range: makeSourceRange(node.start!, node.end!, lines),
                exported: false,
                sourceEvidenceRefs: [`ast:${filePath}`],
                fingerprint: contentFingerprint({ fileId, name: fullName }),
              }),
            );
          }
        }
      }
    }
  }

  return {
    symbols,
    relationships,
    exports: [...new Set(exportNames)].sort(),
    imports: [...new Set(importSpecifiers)].sort(),
  };
}

// ── Structural Query ─────────────────────────────────────────────

export interface StructuralQueryPattern {
  type:
    | "call_expression"
    | "import_declaration"
    | "export_declaration"
    | "function_declaration"
    | "class_declaration";
  calleeName?: string;
}

export function queryStructuralRules(
  content: string,
  filePath: string,
  pattern: StructuralQueryPattern,
): {
  type: string;
  name: string;
  range: {
    start: { line: number; column: number; byte: number };
    end: { line: number; column: number; byte: number };
  };
}[] {
  const lines = buildLineStarts(content);
  const parsed = parseASTSafe(filePath, content);
  const body = parsed.program.body ?? [];
  const results: { type: string; name: string; range: ReturnType<typeof makeSourceRange> }[] = [];

  for (const stmt of body) {
    const node = stmt as AstNode;

    if (pattern.type === "call_expression") {
      if (node.type === "ExpressionStatement") {
        const expr = node.expression as AstNode | undefined;
        if (expr?.type === "CallExpression") {
          const callee = expr.callee as AstNode | undefined;
          let name = "";
          if (callee?.type === "MemberExpression") {
            const obj = callee.object as AstNode | undefined;
            const prop = callee.property as AstNode | undefined;
            name = `${(obj as AstNode | undefined)?.name ?? ""}.${(prop as AstNode | undefined)?.name ?? ""}`;
          } else if (callee?.type === "Identifier") {
            name = (callee.name as string) ?? "";
          }
          if (!pattern.calleeName || name === pattern.calleeName) {
            results.push({
              type: "call_expression",
              name,
              range: makeSourceRange(node.start!, node.end!, lines),
            });
          }
        }
      }
    }

    if (pattern.type === "import_declaration" && node.type === "ImportDeclaration") {
      const source = node.source as AstNode | undefined;
      results.push({
        type: "import_declaration",
        name: (source?.value as string) ?? "",
        range: makeSourceRange(node.start!, node.end!, lines),
      });
    }

    if (
      pattern.type === "export_declaration" &&
      (node.type === "ExportNamedDeclaration" || node.type === "ExportDefaultDeclaration")
    ) {
      results.push({
        type: "export_declaration",
        name: nodeName(node),
        range: makeSourceRange(node.start!, node.end!, lines),
      });
    }
  }

  return results;
}

function isHidden(pathSegment: string): boolean {
  return pathSegment.startsWith(".") && pathSegment !== "." && pathSegment !== "..";
}

function shouldExclude(absolutePath: string, root: string): boolean {
  const relativePath = relative(root, absolutePath);
  const segments = relativePath.split(sep).filter(Boolean);
  for (const segment of segments) {
    if (ALWAYS_EXCLUDED_DIRS.has(segment)) return true;
    if (isHidden(segment)) return true;
  }
  const fileName = basename(absolutePath);
  if (ALWAYS_EXCLUDED_FILES.has(fileName)) return true;
  return false;
}

// ── Parsing helpers (V2 AST-based) ─────────────────────────────

export function parseExports(content: string): string[] {
  return parseFileAST(content, "inline.ts").exports;
}

export function parseImports(content: string): string[] {
  return parseFileAST(content, "inline.ts").imports;
}

export function resolveImportPath(
  importerPath: string,
  importSpecifier: string,
  knownFiles: string[],
): string | null {
  if (importSpecifier.startsWith(".")) {
    const dir = importerPath.substring(0, importerPath.lastIndexOf("/"));
    const extensions = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".mts", ".cts", ".d.ts", ""];
    const candidates = [join(dir, importSpecifier), join(dir, importSpecifier, "index")];
    for (const candidate of candidates) {
      for (const ext of extensions) {
        const resolved = `${candidate}${ext}`;
        if (knownFiles.includes(resolved)) return resolved;
      }
    }
    return join(dir, importSpecifier);
  }
  return null;
}

// ── Traversal -------------------------------------------------------

export interface TraverseOptions {
  rootPath: string;
  additionalExclusions?: string[];
}

export function traverseDirectory(options: TraverseOptions): { files: string[]; truncated: boolean } {
  const { rootPath, additionalExclusions = [] } = options;
  const absoluteRoot = resolve(rootPath);
  const results: string[] = [];
  let truncated = false;

  function walk(dirPath: string) {
    if (results.length >= MAX_FILES_PER_SCAN) {
      truncated = true;
      return;
    }

    let entries: string[];
    try {
      entries = readdirSync(dirPath);
    } catch {
      return;
    }

    for (const entry of entries) {
      if (results.length >= MAX_FILES_PER_SCAN) {
        truncated = true;
        break;
      }
      const fullPath = join(dirPath, entry);
      if (shouldExclude(fullPath, absoluteRoot)) continue;
      if (additionalExclusions.some((pattern) => fullPath.includes(pattern))) continue;

      try {
        const stats = lstatSync(fullPath);
        if (stats.isSymbolicLink()) continue;
        if (stats.isDirectory()) {
          walk(fullPath);
        } else if (stats.isFile()) {
          results.push(fullPath);
        }
      } catch {
        // Skip inaccessible files
      }
    }
  }

  walk(absoluteRoot);
  return { files: results.sort(), truncated };
}

// ── Parsing ---------------------------------------------------------

export interface ParseFileOptions {
  filePath: string;
  rootPath: string;
  content?: string;
}

export function parseFileNode(options: ParseFileOptions) {
  const { filePath, rootPath } = options;
  const content = options.content ?? readFileSync(filePath, "utf-8");
  const ext = extname(filePath).toLowerCase();
  const relativePath = relative(rootPath, filePath);
  const stats = lstatSync(filePath);
  const modifiedAt = new Date(stats.mtimeMs).toISOString();

  const isParsable = PARSABLE_EXTENSIONS.has(ext);
  let exports: string[] = [];
  let imports: string[] = [];

  if (isParsable) {
    const ast = parseFileAST(content, relativePath);
    exports = ast.exports;
    imports = ast.imports;
  }

  return fileNodeSchema.parse({
    filePath: relativePath,
    size: stats.size,
    extension: ext || null,
    modifiedAt,
    exports,
    imports,
    opaque: !isParsable,
  });
}

// ── Dependency resolution -------------------------------------------

export function resolveDependencyEdges(files: FileNode[]): DependencyEdge[] {
  const knownFiles = files.map((file) => file.filePath);
  const edges: DependencyEdge[] = [];

  for (const file of files) {
    for (const specifier of file.imports) {
      const resolved = resolveImportPath(file.filePath, specifier, knownFiles);
      if (resolved) {
        const matched = knownFiles.find(
          (kf) => resolved === kf || resolved.endsWith(`/${kf}`) || kf === resolved,
        );
        if (matched) {
          edges.push(
            dependencyEdgeSchema.parse({
              sourcePath: file.filePath,
              targetPath: matched,
              isExternal: false,
            }),
          );
        } else {
          edges.push(
            dependencyEdgeSchema.parse({
              sourcePath: file.filePath,
              targetPath: specifier,
              isExternal: true,
            }),
          );
        }
      } else {
        edges.push(
          dependencyEdgeSchema.parse({
            sourcePath: file.filePath,
            targetPath: specifier,
            isExternal: true,
          }),
        );
      }
    }
  }

  return edges;
}

// ── Public API ------------------------------------------------------

export interface ParseRepositoryOptions {
  rootPath: string;
  additionalExclusions?: string[];
}

export function parseRepository(
  options: ParseRepositoryOptions,
): RepositoryManifest | SizeBoundaryExceeded {
  const { rootPath, additionalExclusions = [] } = options;
  const absoluteRoot = realpathSync(resolve(rootPath));

  const { files: filePaths, truncated } = traverseDirectory({ rootPath: absoluteRoot, additionalExclusions });

  // Enforce hard limit: max files (check truncation or over-limit)
  if (truncated || filePaths.length > MAX_FILES_PER_SCAN) {
    return {
      kind: "SizeBoundaryExceeded",
      message: `Repository scan exceeded maximum file limit of ${MAX_FILES_PER_SCAN} files (found ${filePaths.length}).`,
      limit: { maxFiles: MAX_FILES_PER_SCAN, maxContentBytes: MAX_AST_CONTENT_BYTES },
      actual: { filesScanned: filePaths.length, contentBytesRead: 0 },
    };
  }

  const fileNodes: FileNode[] = [];
  let contentBytesRead = 0;

  for (const filePath of filePaths) {
    const stats = lstatSync(filePath);
    contentBytesRead += stats.size;

    // Enforce hard limit: max total content size
    if (contentBytesRead > MAX_AST_CONTENT_BYTES) {
      return {
        kind: "SizeBoundaryExceeded",
        message: `Repository scan exceeded maximum AST content limit of ${MAX_AST_CONTENT_BYTES} bytes (read ~${contentBytesRead} bytes across ${fileNodes.length + 1} files).`,
        limit: { maxFiles: MAX_FILES_PER_SCAN, maxContentBytes: MAX_AST_CONTENT_BYTES },
        actual: { filesScanned: filePaths.length, contentBytesRead },
      };
    }

    fileNodes.push(parseFileNode({ filePath, rootPath: absoluteRoot }));
  }

  const edges = resolveDependencyEdges(fileNodes);

  return repositoryManifestSchema.parse({
    rootPath: absoluteRoot,
    timestamp: new Date().toISOString(),
    files: fileNodes,
    edges,
  });
}

export function serializeRepositoryManifest(manifest: RepositoryManifest): string {
  return stableJson(repositoryManifestSchema.parse(manifest) as unknown as JsonValue);
}
