import { readFileSync } from "node:fs";
import { join } from "node:path";
import { contentFingerprint, type JsonValue } from "../knowledge-graph";
import { repositoryManifestSchema, type RepositoryManifest } from "../repository-intelligence";
import { taskCardSchema } from "../task-card";
import {
  codeContextItemSchema,
  compiledContextSchema,
  contextCompilerInputSchema,
  type CompiledContext,
} from "./schemas";
import { compileCanonicalContext } from "./compiler";

const CONTEXT_COMPILER_V2_VERSION = "context-compiler-code-aware-v2.0.0";

function firstDegreeImports(
  filePath: string,
  manifest: RepositoryManifest,
  protectedPaths: Set<string>,
  knownPaths: Set<string>,
): string[] {
  const results: string[] = [];
  for (const edge of manifest.edges) {
    if (edge.isExternal) continue;
    if (edge.sourcePath === filePath && !protectedPaths.has(edge.targetPath)) {
      if (knownPaths.has(edge.targetPath)) results.push(edge.targetPath);
    }
  }
  return [...new Set(results)];
}

export function compileCodeAwareContext(input: unknown): CompiledContext {
  const parsed = contextCompilerInputSchema.parse(input);
  const taskCard = taskCardSchema.parse(parsed.taskCard);
  const manifest = parsed.repositoryManifest
    ? repositoryManifestSchema.parse(parsed.repositoryManifest)
    : null;

  // V1 base compilation for spec/constitution items
  const baseContext = compileCanonicalContext(input);

  if (!manifest) {
    // No manifest available — return V1 context as-is (mark it as V1 fallback)
    return baseContext;
  }

  const boundaries = taskCard.fileBoundaries;
  const writableSet = new Set(boundaries.writableFiles);
  const readOnlySet = new Set(boundaries.readOnlyFiles);
  const protectedSet = new Set(boundaries.protectedFiles);
  const manifestPaths = new Set(manifest.files.map((file) => file.filePath));

  // Build targeted set of files to read
  const includePaths = new Set<string>();

  // Include writable and read-only files listed in boundaries
  for (const path of writableSet) {
    if (manifestPaths.has(path)) includePaths.add(path);
  }
  for (const path of readOnlySet) {
    if (manifestPaths.has(path)) includePaths.add(path);
  }

  // Include first-degree imports of writable files (if they exist in manifest and aren't protected)
  for (const writablePath of writableSet) {
    if (!manifestPaths.has(writablePath)) continue;
    const deps = firstDegreeImports(writablePath, manifest, protectedSet, manifestPaths);
    for (const dep of deps) includePaths.add(dep);
  }

  // Read the file contents from disk
  const codeContextItems: { path: string; content: string; reason: string }[] = [];
  const rootPath = manifest.rootPath;

  for (const filePath of includePaths) {
    let reason: string;
    if (writableSet.has(filePath)) {
      reason = "task_code_file_writable";
    } else if (readOnlySet.has(filePath)) {
      reason = "task_code_file_readonly";
    } else {
      reason = "task_code_dependency_first_degree";
    }

    const absolutePath = join(rootPath, filePath);
    let content: string;
    try {
      content = readFileSync(absolutePath, "utf-8");
    } catch {
      // File may have been deleted or be inaccessible — skip gracefully
      continue;
    }

    codeContextItems.push(
      codeContextItemSchema.parse({
        path: filePath,
        content,
        reason,
      }),
    );
  }

  // Sort code context by path for deterministic output
  codeContextItems.sort((a, b) => a.path.localeCompare(b.path));

  const limitationRefs = [
    ...baseContext.limitationRefs.filter(
      (ref) => ref !== "canonical-v1:no-code-parsing" && ref !== "canonical-v1:no-ast-traversal",
    ),
    "code-v2:no-ast-traversal",
    "code-v2:regex-import-analysis-only",
  ];

  const enhanced = {
    id: baseContext.id.replace("compiled_context_", "compiled_context_v2_"),
    taskCardId: baseContext.taskCardId,
    taskCardFingerprint: baseContext.taskCardFingerprint,
    mode: "code_aware_v2" as const,
    items: baseContext.items,
    codeContext: codeContextItems,
    resolvedSpecificationIds: baseContext.resolvedSpecificationIds,
    omittedRefs: baseContext.omittedRefs,
    limitationRefs,
    sufficiency:
      baseContext.sufficiency === "sufficient" && codeContextItems.length > 0
        ? ("sufficient" as const)
        : ("insufficient" as const),
    metadata: {
      compilerVersion: CONTEXT_COMPILER_V2_VERSION,
      canonicalOnly: false,
      codeAwareCompilation: true,
      inclusionPolicy: "code-aware-boundaries-plus-first-degree-dependencies-v2",
      minimumSafeContextEstimate:
        baseContext.metadata.minimumSafeContextEstimate +
        codeContextItems.reduce((sum, item) => sum + Math.ceil(item.content.length / 4), 0),
    },
  };

  return compiledContextSchema.parse({
    ...enhanced,
    fingerprint: contentFingerprint(enhanced as unknown as JsonValue),
  });
}
