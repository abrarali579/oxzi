import { lstatSync, readdirSync, readFileSync, realpathSync } from "node:fs";
import { basename, extname, join, relative, resolve, sep } from "node:path";
import { stableJson, type JsonValue } from "../knowledge-graph";
import {
  dependencyEdgeSchema,
  fileNodeSchema,
  repositoryManifestSchema,
  type DependencyEdge,
  type FileNode,
  type RepositoryManifest,
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

const EXPORT_PATTERNS = [
  /^\s*export\s+(?:default\s+)?(?:function|class|interface|type|enum|const|let|var|abstract\s+class|async\s+function)\s+(\w+)/gm,
  /^\s*export\s+default\s+(\w+)/gm,
  /^\s*export\s*\{([^}]+)\}/gm,
  /^\s*export\s*\*\s*from\s+['"]([^'"]+)['"]/gm,
  /^\s*export\s*\{[^}]*\}\s*from\s+['"]([^'"]+)['"]/gm,
];

const IMPORT_PATTERNS = [
  /^\s*import\s+(?:type\s+)?(?:\{[^}]*\}|\*\s+as\s+\w+|\w+(?:\s*,\s*(?:\{[^}]*\}|\*\s+as\s+\w+|\w+))?)\s+from\s+['"]([^'"]+)['"]/gm,
  /^\s*import\s+(?:type\s+)?['"]([^'"]+)['"]/gm,
];

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

// ── Parsing helpers ------------------------------------------------

export function parseExports(content: string): string[] {
  const exports = new Set<string>();
  for (const pattern of EXPORT_PATTERNS) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(content)) !== null) {
      if (match[1]) {
        const parts = match[1].split(",").map((part) => part.trim());
        for (const part of parts) {
          const name = part.replace(/\s+as\s+\w+$/, "").trim();
          if (name) exports.add(name);
        }
      }
    }
  }
  return [...exports].sort();
}

export function parseImports(content: string): string[] {
  const imports = new Set<string>();
  for (const pattern of IMPORT_PATTERNS) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(content)) !== null) {
      const specifier = match[1]?.trim();
      if (specifier) imports.add(specifier);
    }
  }
  return [...imports];
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

export function traverseDirectory(options: TraverseOptions): string[] {
  const { rootPath, additionalExclusions = [] } = options;
  const absoluteRoot = resolve(rootPath);
  const results: string[] = [];

  function walk(dirPath: string) {
    let entries: string[];
    try {
      entries = readdirSync(dirPath);
    } catch {
      return;
    }

    for (const entry of entries) {
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
  return results.sort();
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
    exports = parseExports(content);
    imports = parseImports(content);
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

export function parseRepository(options: ParseRepositoryOptions): RepositoryManifest {
  const { rootPath, additionalExclusions = [] } = options;
  const absoluteRoot = realpathSync(resolve(rootPath));

  const filePaths = traverseDirectory({ rootPath: absoluteRoot, additionalExclusions });

  const fileNodes = filePaths.map((filePath) =>
    parseFileNode({ filePath, rootPath: absoluteRoot }),
  );
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
