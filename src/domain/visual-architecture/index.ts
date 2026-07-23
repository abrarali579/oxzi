import {
  repositoryManifestSchema,
  type RepositoryManifest,
} from "@/domain/repository-intelligence";

/**
 * Generates a Mermaid flowchart diagram from a repository manifest's dependency edges.
 * Includes a legend and clickable nodes (if clickBase is provided, nodes link to files).
 */
export function generateMermaidDiagram(
  manifest: RepositoryManifest,
  clickBase?: string,
): string {
  const parsed = repositoryManifestSchema.parse(manifest);
  const lines: string[] = ["flowchart LR"];

  // ── Legend ────────────────────────────────────────────────
  lines.push("");
  lines.push("  subgraph Legend");
  lines.push('    L1["📄 Source File"]');
  lines.push('    L2["⬅️ Dependency"]');
  lines.push("    L1 --> L2");
  lines.push("  end");
  lines.push("");

  // ── File nodes ────────────────────────────────────────────
  for (const file of parsed.files) {
    const safeId = file.filePath.replace(/[^a-zA-Z0-9]/g, "_");
    if (!file.opaque) {
      lines.push(`  ${safeId}["${file.filePath}"]`);
      if (clickBase) {
        lines.push(`  click ${safeId} "${clickBase}${file.filePath}"`);
      }
    }
  }

  // ── Dependency edges ──────────────────────────────────────
  for (const edge of parsed.edges) {
    if (edge.isExternal) continue;
    const sourceId = edge.sourcePath.replace(/[^a-zA-Z0-9]/g, "_");
    const targetId = edge.targetPath.replace(/[^a-zA-Z0-9]/g, "_");
    lines.push(`  ${sourceId} --> ${targetId}`);
  }

  return lines.join("\n");
}

/**
 * Generates a feature-level Mermaid diagram with legend.
 */
export function generateFeatureDiagram(
  manifest: RepositoryManifest,
  clickBase?: string,
): string {
  const parsed = repositoryManifestSchema.parse(manifest);
  const lines: string[] = ["flowchart TB"];

  // ── Legend ────────────────────────────────────────────────
  lines.push("");
  lines.push("  subgraph Legend");
  lines.push('    L1["🔧 Exported Symbol"]');
  lines.push('    L2["⤵️ Re-export / Depends"]');
  lines.push("    L1 -.-> L2");
  lines.push("  end");
  lines.push("");

  // ── Feature nodes ─────────────────────────────────────────
  for (const file of parsed.files) {
    for (const exp of file.exports) {
      const safeId = exp.replace(/[^a-zA-Z0-9]/g, "_");
      lines.push(`  ${safeId}["${exp}"]`);
    }
  }

  // ── Feature dependency edges ──────────────────────────────
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
