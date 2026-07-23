import {
  repositoryManifestSchema,
  type RepositoryManifest,
} from "@/domain/repository-intelligence";

/**
 * Generates a Mermaid flowchart diagram from a repository manifest's dependency edges.
 * Renders feature dependencies and architecture components.
 */
export function generateMermaidDiagram(manifest: RepositoryManifest): string {
  const parsed = repositoryManifestSchema.parse(manifest);

  const lines: string[] = ["flowchart LR"];

  // Add file nodes
  for (const file of parsed.files) {
    const safeId = file.filePath.replace(/[^a-zA-Z0-9]/g, "_");
    if (!file.opaque) {
      lines.push(`  ${safeId}["${file.filePath}"]`);
    }
  }

  // Add dependency edges
  for (const edge of parsed.edges) {
    if (edge.isExternal) continue;
    const sourceId = edge.sourcePath.replace(/[^a-zA-Z0-9]/g, "_");
    const targetId = edge.targetPath.replace(/[^a-zA-Z0-9]/g, "_");
    lines.push(`  ${sourceId} --> ${targetId}`);
  }

  return lines.join("\n");
}

/**
 * Generates a simpler feature-level Mermaid diagram from exported symbols.
 */
export function generateFeatureDiagram(manifest: RepositoryManifest): string {
  const parsed = repositoryManifestSchema.parse(manifest);
  const lines: string[] = ["flowchart TB"];

  const featureNodes = new Set<string>();

  for (const file of parsed.files) {
    for (const exp of file.exports) {
      const safeId = exp.replace(/[^a-zA-Z0-9]/g, "_");
      featureNodes.add(exp);
      lines.push(`  ${safeId}["${exp}"]`);
    }
  }

  for (const edge of parsed.edges) {
    if (edge.isExternal) continue;
    const sourceFile = parsed.files.find((f) => f.filePath === edge.sourcePath);
    const targetFile = parsed.files.find((f) => f.filePath === edge.targetPath);
    if (sourceFile && targetFile) {
      for (const srcExp of sourceFile.exports) {
        for (const tgtExp of targetFile.exports) {
          const srcId = srcExp.replace(/[^a-zA-Z0-9]/g, "_");
          const tgtId = tgtExp.replace(/[^a-zA-Z0-9]/g, "_");
          lines.push(`  ${srcId} -.-> ${tgtId}`);
        }
      }
    }
  }

  return lines.join("\n");
}
