import { mkdtempSync, mkdirSync, writeFileSync, rmSync, realpathSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it, afterEach } from "vitest";

import { fileNodeSchema, repositoryManifestSchema } from "./schemas";
import {
  parseFileNode,
  parseRepository,
  resolveDependencyEdges,
  isSizeBoundaryExceeded,
  traverseDirectory,
  resolveImportPath,
  parseExports,
  parseImports,
} from "./parser";

let tempDir: string | null = null;

function createTempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "oxzi-parser-test-"));
  tempDir = dir;
  return dir;
}

afterEach(() => {
  if (tempDir) {
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // cleanup
    }
    tempDir = null;
  }
});

function write(base: string, relativePath: string, content: string) {
  const fullPath = join(base, relativePath);
  mkdirSync(fullPath.substring(0, fullPath.lastIndexOf("/")), { recursive: true });
  writeFileSync(fullPath, content, "utf-8");
}

// ── Helpers for testing parsing logic directly ─────────────────────

describe("parseExports and parseImports", () => {
  it("extracts named exports from TypeScript", () => {
    const result = parseExports(`
      export interface User { name: string }
      export function greet(user: User): string { return "hello"; }
      export const VERSION = "1.0";
      export class Service {}
    `);
    expect(result).toContain("User");
    expect(result).toContain("greet");
    expect(result).toContain("VERSION");
    expect(result).toContain("Service");
  });

  it("extracts export default", () => {
    const result = parseExports("export default function App() {}");
    expect(result).toContain("App");
  });

  it("extracts export { } lists", () => {
    const result = parseExports(`
      export { greet, VERSION };
    `);
    expect(result).toContain("greet");
    expect(result).toContain("VERSION");
  });

  it("extracts re-exported names", () => {
    const result = parseExports(`export { Component } from "./component";`);
    expect(result).toContain("Component");
  });

  it("extracts imports from specifiers", () => {
    const result = parseImports(`
      import { greet } from "./utils";
      import { VERSION } from "../constants";
      import "reflect-metadata";
      import * as React from "react";
    `);
    expect(result).toContain("./utils");
    expect(result).toContain("../constants");
    expect(result).toContain("reflect-metadata");
    expect(result).toContain("react");
  });

  it("handles type-only imports", () => {
    const result = parseImports(`import type { User } from "./types";`);
    expect(result).toContain("./types");
  });
});

describe("resolveImportPath", () => {
  const files = ["src/utils/helpers.ts", "src/index.ts", "src/constants.ts"];

  it("resolves relative imports within the same directory", () => {
    expect(resolveImportPath("src/index.ts", "./constants", files)).toBe("src/constants.ts");
  });

  it("resolves relative imports with extension", () => {
    expect(resolveImportPath("src/index.ts", "./constants.ts", files)).toBe("src/constants.ts");
  });

  it("resolves nested relative imports", () => {
    expect(resolveImportPath("src/utils/helpers.ts", "../index", files)).toBe("src/index.ts");
  });

  it("returns null for external (non-relative) specifiers", () => {
    expect(resolveImportPath("src/index.ts", "react", files)).toBeNull();
    expect(resolveImportPath("src/index.ts", "@scope/pkg", files)).toBeNull();
  });
});

// ── Traversal tests ────────────────────────────────────────────────

describe("traverseDirectory", () => {
  it("strictly ignores node_modules and hidden directories", () => {
    const base = createTempDir();
    write(base, "src/index.ts", `export const x = 1;`);
    write(base, "src/utils/helper.ts", `export const y = 2;`);
    write(base, "node_modules/pkg/index.ts", "fake");
    write(base, ".git/config", "fake");
    write(base, ".review/output.json", "fake");
    write(base, "src/.hidden/internal.ts", "hidden");

    const result = traverseDirectory({ rootPath: base });
    const files = result.files;

    expect(files).toContain(join(base, "src/index.ts"));
    expect(files).toContain(join(base, "src/utils/helper.ts"));
    expect(files).not.toContain(join(base, "node_modules/pkg/index.ts"));
    expect(files).not.toContain(join(base, ".git/config"));
    expect(files).not.toContain(join(base, ".review/output.json"));
    expect(files).not.toContain(join(base, "src/.hidden/internal.ts"));
  });
});

// ── parseFileNode tests ────────────────────────────────────────────

describe("parseFileNode", () => {
  it("extracts exports and imports from a TypeScript file", () => {
    const base = createTempDir();
    write(
      base,
      "src/app.ts",
      `
      import { useState } from "react";
      import { greet } from "./utils";
      export const App = () => null;
      export function start() { return "ok"; }
    `,
    );
    const node = parseFileNode({ filePath: join(base, "src/app.ts"), rootPath: base });

    expect(node.extension).toBe(".ts");
    expect(node.filePath).toBe("src/app.ts");
    expect(node.exports).toContain("App");
    expect(node.exports).toContain("start");
    expect(node.imports).toContain("react");
    expect(node.imports).toContain("./utils");
    expect(node.opaque).toBe(false);
  });

  it("marks non-parsable files as opaque", () => {
    const base = createTempDir();
    write(base, "data.json", '{"ok": true}');
    write(base, "style.css", "body { color: red; }");

    const json = parseFileNode({ filePath: join(base, "data.json"), rootPath: base });
    expect(json.opaque).toBe(true);
    expect(json.extension).toBe(".json");
    expect(json.exports).toEqual([]);
    expect(json.imports).toEqual([]);

    const css = parseFileNode({ filePath: join(base, "style.css"), rootPath: base });
    expect(css.opaque).toBe(true);
  });

  it("produces a valid file node schema", () => {
    const base = createTempDir();
    write(base, "src/index.ts", "export const x = 1;");
    const node = parseFileNode({ filePath: join(base, "src/index.ts"), rootPath: base });
    expect(() => fileNodeSchema.parse(node)).not.toThrow();
  });
});

// ── Dependency edge resolution tests ───────────────────────────────

describe("resolveDependencyEdges", () => {
  it("generates correct local and external edges", () => {
    const base = createTempDir();
    write(
      base,
      "src/index.ts",
      `
      import { greet } from "./utils";
      import { useState } from "react";
    `,
    );
    write(
      base,
      "src/utils.ts",
      `
      import { z } from "zod";
      export function greet() {}
    `,
    );

    const fileNodes = [
      parseFileNode({ filePath: join(base, "src/index.ts"), rootPath: base }),
      parseFileNode({ filePath: join(base, "src/utils.ts"), rootPath: base }),
    ];

    // Normalize paths to relative
    const normalized = fileNodes.map((n) => ({
      ...n,
      filePath: n.filePath,
    }));

    const edges = resolveDependencyEdges(normalized);

    // index.ts → utils.ts (local)
    const localEdge = edges.find((e) => e.sourcePath === "src/index.ts" && !e.isExternal);
    expect(localEdge).toBeDefined();
    expect(localEdge!.targetPath).toBe("src/utils.ts");

    // index.ts → react (external)
    const externalEdge = edges.find((e) => e.sourcePath === "src/index.ts" && e.isExternal);
    expect(externalEdge).toBeDefined();
    expect(externalEdge!.targetPath).toBe("react");

    // utils.ts → zod (external)
    const zodEdge = edges.find((e) => e.sourcePath === "src/utils.ts" && e.isExternal);
    expect(zodEdge).toBeDefined();
    expect(zodEdge!.targetPath).toBe("zod");
  });
});

// ── Full pipeline test ─────────────────────────────────────────────

describe("parseRepository integration", () => {
  it("generates a valid RepositoryManifest from a sample project", () => {
    const base = createTempDir();
    write(
      base,
      "src/index.ts",
      `
      import { greet } from "./utils";
      export const App = "hello";
    `,
    );
    write(
      base,
      "src/utils.ts",
      `
      import { z } from "zod";
      export function greet(name: string) { return "Hi " + name; }
    `,
    );
    write(
      base,
      "src/types.ts",
      `
      export interface User { name: string; age: number; }
    `,
    );
    write(base, "node_modules/zod/index.ts", "fake library");
    write(base, ".git/HEAD", "ref: main");

    const result = parseRepository({ rootPath: base });
    expect(isSizeBoundaryExceeded(result)).toBe(false);
    const manifest = result as Exclude<typeof result, { kind: "SizeBoundaryExceeded" }>;

    // Validate against schema
    expect(() => repositoryManifestSchema.parse(manifest)).not.toThrow();

    // Check files
    expect(manifest.files.length).toBe(3);
    const srcPath = manifest.files.find((f) => f.filePath === "src/index.ts");
    expect(srcPath).toBeDefined();
    expect(srcPath!.exports).toContain("App");

    const utilsPath = manifest.files.find((f) => f.filePath === "src/utils.ts");
    expect(utilsPath).toBeDefined();
    expect(utilsPath!.exports).toContain("greet");
    expect(utilsPath!.imports).toContain("zod");

    const typesPath = manifest.files.find((f) => f.filePath === "src/types.ts");
    expect(typesPath).toBeDefined();
    expect(typesPath!.exports).toContain("User");

    // Check edges
    const indexToUtils = manifest.edges.find(
      (e) => e.sourcePath === "src/index.ts" && !e.isExternal,
    );
    expect(indexToUtils).toBeDefined();
    expect(indexToUtils!.targetPath).toBe("src/utils.ts");

    const utilsToZod = manifest.edges.find((e) => e.sourcePath === "src/utils.ts" && e.isExternal);
    expect(utilsToZod).toBeDefined();
    expect(utilsToZod!.targetPath).toBe("zod");

    // Root path should be the realpath-resolved path
    expect(manifest.rootPath).toBe(realpathSync(base));
  });

  it("handles an empty directory gracefully", () => {
    const base = createTempDir();
    const result = parseRepository({ rootPath: base });
    expect(isSizeBoundaryExceeded(result)).toBe(false);
    const manifest = result as Exclude<typeof result, { kind: "SizeBoundaryExceeded" }>;
    expect(manifest.files).toEqual([]);
    expect(manifest.edges).toEqual([]);
  });

  it("respects additional exclusions", () => {
    const base = createTempDir();
    write(base, "src/index.ts", "export const x = 1;");
    write(base, "src/should-skip.ts", "export const y = 2;");
    write(base, "lib/extra.ts", "export const z = 3;");

    const result = parseRepository({
      rootPath: base,
      additionalExclusions: ["should-skip"],
    });
    expect(isSizeBoundaryExceeded(result)).toBe(false);
    const manifest = result as Exclude<typeof result, { kind: "SizeBoundaryExceeded" }>;
    const filePaths = manifest.files.map((f) => f.filePath);
    expect(filePaths).toContain("src/index.ts");
    expect(filePaths).not.toContain("src/should-skip.ts");
    expect(filePaths).toContain("lib/extra.ts");
  });
});
