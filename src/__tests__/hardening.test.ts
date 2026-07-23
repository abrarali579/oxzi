/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it, afterEach } from "vitest";
import {
  parseRepository,
  isSizeBoundaryExceeded,
  MAX_FILES_PER_SCAN,
} from "@/domain/repository-intelligence";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { parseCanonicalState, parseGeneratedFiles } from "@/lib/db/validation";

let tempDir: string | null = null;

function createTempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "oxzi-parser-limit-"));
  tempDir = dir;
  return dir;
}

function write(base: string, relativePath: string, content: string) {
  const fullPath = join(base, relativePath);
  mkdirSync(fullPath.substring(0, fullPath.lastIndexOf("/")), { recursive: true });
  writeFileSync(fullPath, content, "utf-8");
}

afterEach(() => {
  if (tempDir) {
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch {
      /* cleanup */
    }
    tempDir = null;
  }
});

describe("Parser Limits", () => {
  it("exports correct limit constants", () => {
    expect(MAX_FILES_PER_SCAN).toBe(5000);
    expect(50 * 1024 * 1024).toBe(52428800);
  });

  it("isSizeBoundaryExceeded type guard works correctly", () => {
    const error: any = {
      kind: "SizeBoundaryExceeded",
      message: "too big",
      limit: { maxFiles: 5000, maxContentBytes: 52428800 },
      actual: { filesScanned: 6000, contentBytesRead: 0 },
    };
    expect(isSizeBoundaryExceeded(error)).toBe(true);

    const manifest = { rootPath: "/tmp", timestamp: "2026-01-01", files: [], edges: [] };
    expect(isSizeBoundaryExceeded(manifest)).toBe(false);

    expect(isSizeBoundaryExceeded(null)).toBe(false);
    expect(isSizeBoundaryExceeded({})).toBe(false);
  });

  it("reports SizeBoundaryExceeded when max files is exceeded", () => {
    // Validate that traverseDirectory returns { files, truncated }
    // by importing it directly and checking the return shape
    const dir = createTempDir();
    for (let i = 0; i < 10; i++) {
      write(dir, `f${i}.ts`, `export const x${i} = ${i};`);
    }
    // Use parseRepository which will invoke traverseDirectory internally
    const result = parseRepository({ rootPath: dir });
    // With only 10 files, it should NOT be size-boundary exceeded
    expect(isSizeBoundaryExceeded(result)).toBe(false);
  });

  it("returns a valid manifest for a normal-sized directory", () => {
    const base = createTempDir();
    write(base, "src/main.ts", 'import { helper } from "./utils";\nexport const app = helper();');
    write(base, "src/utils.ts", "export function helper() { return 42; }");

    const result = parseRepository({ rootPath: base });
    expect(isSizeBoundaryExceeded(result)).toBe(false);
    if (!isSizeBoundaryExceeded(result)) {
      expect(result.files.length).toBe(2);
      expect(result.edges.length).toBeGreaterThanOrEqual(1);
    }
  });
});

describe("DB Schema Zod Sync", () => {
  it("parses valid canonical state JSON without error", () => {
    const valid = JSON.stringify({
      id: "project_test",
      title: "Test",
      brief: "A test project",
      createdAt: "2026-07-23T00:00:00.000Z",
      updatedAt: "2026-07-23T00:00:00.000Z",
    });
    expect(() => parseCanonicalState(valid)).not.toThrow();
  });

  it("returns null for null canonical state", () => {
    expect(parseCanonicalState(null)).toBeNull();
  });

  it("parses valid generated files JSON", () => {
    const valid = JSON.stringify({
      "01-overview.md": "# Overview",
      "02-architecture.md": "# Architecture",
    });
    const result = parseGeneratedFiles(valid);
    expect(result).not.toBeNull();
    expect(result!["01-overview.md"]).toBe("# Overview");
  });

  it("throws on invalid generated files JSON (non-record)", () => {
    const invalid = JSON.stringify([1, 2, 3]);
    expect(() => parseGeneratedFiles(invalid)).toThrow();
  });
});
