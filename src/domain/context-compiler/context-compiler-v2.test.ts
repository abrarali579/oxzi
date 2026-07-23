import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it, afterEach } from "vitest";

import { contentFingerprint } from "../knowledge-graph";
import { parseRepository, isSizeBoundaryExceeded } from "../repository-intelligence";
import { compileCodeAwareContext } from ".";
import { implementationReadySpecificationFixture } from "../governance";
import { compileTaskCard } from "../task-card";
import { approvedImplementationSlice } from "../planning";

let tempDir: string | null = null;

function createTempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "oxzi-code-compiler-"));
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

describe("Code-aware Context Compiler V2", () => {
  it("pulls code from writable and read-only files based on task card boundaries", () => {
    const base = createTempDir();

    // Create source files
    write(base, "src/auth.ts", "export function authenticate() { return true; }");
    write(base, "src/utils.ts", 'export const VERSION = "1.0";');
    write(base, "config/settings.ts", "export const DEBUG = false;");

    // Parse the directory to get a RepositoryManifest
    const parseResult = parseRepository({ rootPath: base });
    if (isSizeBoundaryExceeded(parseResult)) throw new Error("Unexpected size limit");
    const manifest = parseResult;

    // Build a task card with specific file boundaries referencing the parsed files
    const taskCard = {
      taskCardId: "task_card_v2_test" as const,
      sourceSliceId: "slice_auth_1" as const,
      sourceSliceVersion: 1,
      sourceSliceFingerprint: contentFingerprint({ slice: "test" }),
      technicalPlanId: "plan_test",
      technicalPlanVersion: 1,
      technicalPlanFingerprint: contentFingerprint({ plan: "test" }),
      specificationId: implementationReadySpecificationFixture.specification.id,
      specificationVersion: implementationReadySpecificationFixture.specification.version,
      specificationFingerprint: implementationReadySpecificationFixture.specification.fingerprint,
      constitutionFingerprint: contentFingerprint({ constitution: "test" }),
      goal: "Test the V2 compiler",
      scope: ["src/"],
      exclusions: [],
      constraints: [],
      acceptanceCriteria: ["criterion_export"],
      fileBoundaries: {
        writableFiles: ["src/auth.ts"],
        readOnlyFiles: ["src/utils.ts"],
        protectedFiles: ["config/settings.ts"],
      },
      validations: [
        {
          phase: "pre_execution" as const,
          command: "npm test",
          required: true as const,
          source: "compiler" as const,
        },
      ],
      riskLevel: "low" as const,
      prerequisiteTaskRefs: [],
      artifactOutputRefs: [],
      rollbackStrategy: "git revert",
      evidenceRefs: ["evidence:test"],
      compilerVersion: "test-v1",
      fingerprint: contentFingerprint({ taskCard: "v2_test" }),
    };

    const context = compileCodeAwareContext({
      taskCard,
      specifications: [implementationReadySpecificationFixture.specification],
      constitutionRules: implementationReadySpecificationFixture.constitutionRules.map(
        (record) => record.rule,
      ),
      repositoryManifest: manifest,
    });

    // Mode should be code_aware_v2
    expect(context.mode).toBe("code_aware_v2");
    expect(context.metadata.codeAwareCompilation).toBe(true);
    expect(context.metadata.canonicalOnly).toBe(false);

    // codeContext should include writable and read-only files
    expect(context.codeContext.some((item) => item.path === "src/auth.ts")).toBe(true);
    expect(context.codeContext.some((item) => item.path === "src/utils.ts")).toBe(true);

    // Writable file should have the correct reason
    const writableItem = context.codeContext.find((item) => item.path === "src/auth.ts");
    expect(writableItem).toBeDefined();
    expect(writableItem!.reason).toBe("task_code_file_writable");

    // Read-only file should have the correct reason
    const readOnlyItem = context.codeContext.find((item) => item.path === "src/utils.ts");
    expect(readOnlyItem).toBeDefined();
    expect(readOnlyItem!.reason).toBe("task_code_file_readonly");

    // Content should be present
    expect(writableItem!.content).toContain("authenticate");
    expect(readOnlyItem!.content).toContain("VERSION");
  });

  it("strictly ignores protected files", () => {
    const base = createTempDir();
    write(base, "src/feature.ts", "export const feat = true;");
    write(base, "config/secret.ts", "export const SECRET = 'hidden';");

    const parseResult = parseRepository({ rootPath: base });
    if (isSizeBoundaryExceeded(parseResult)) throw new Error("Unexpected size limit");
    const manifest = parseResult;
    const taskCard = {
      taskCardId: "task_card_protected_test" as const,
      sourceSliceId: "slice_feature_1" as const,
      sourceSliceVersion: 1,
      sourceSliceFingerprint: contentFingerprint({ slice: "feature" }),
      technicalPlanId: "plan_test",
      technicalPlanVersion: 1,
      technicalPlanFingerprint: contentFingerprint({ plan: "feature" }),
      specificationId: implementationReadySpecificationFixture.specification.id,
      specificationVersion: implementationReadySpecificationFixture.specification.version,
      specificationFingerprint: implementationReadySpecificationFixture.specification.fingerprint,
      constitutionFingerprint: contentFingerprint({ constitution: "feature" }),
      goal: "Test protected file exclusion",
      scope: ["src/"],
      exclusions: [],
      constraints: [],
      acceptanceCriteria: ["criterion_export"],
      fileBoundaries: {
        writableFiles: ["src/feature.ts"],
        readOnlyFiles: [],
        protectedFiles: ["config/secret.ts"],
      },
      validations: [
        {
          phase: "pre_execution" as const,
          command: "npm test",
          required: true as const,
          source: "compiler" as const,
        },
      ],
      riskLevel: "low" as const,
      prerequisiteTaskRefs: [],
      artifactOutputRefs: [],
      rollbackStrategy: "git revert",
      evidenceRefs: ["evidence:protected"],
      compilerVersion: "test-v1",
      fingerprint: contentFingerprint({ taskCard: "protected_test" }),
    };

    const context = compileCodeAwareContext({
      taskCard,
      specifications: [implementationReadySpecificationFixture.specification],
      constitutionRules: implementationReadySpecificationFixture.constitutionRules.map(
        (record) => record.rule,
      ),
      repositoryManifest: manifest,
    });

    // Protected file must NOT appear in codeContext
    expect(context.codeContext.some((item) => item.path === "config/secret.ts")).toBe(false);
    // Writable file must still be present
    expect(context.codeContext.some((item) => item.path === "src/feature.ts")).toBe(true);
  });

  it("includes first-degree imports of writable files", () => {
    const base = createTempDir();
    // Create a writable file that imports a helper
    write(
      base,
      "src/main.ts",
      'import { helper } from "./helpers";\nexport const result = helper();',
    );
    write(base, "src/helpers.ts", "export function helper() { return 42; }");
    write(base, "src/unrelated.ts", "export const unrelated = true;");

    const parseResult = parseRepository({ rootPath: base });
    if (isSizeBoundaryExceeded(parseResult)) throw new Error("Unexpected size limit");
    const manifest = parseResult;
    const taskCard = {
      taskCardId: "task_card_imports_test" as const,
      sourceSliceId: "slice_imports_1" as const,
      sourceSliceVersion: 1,
      sourceSliceFingerprint: contentFingerprint({ slice: "imports" }),
      technicalPlanId: "plan_test",
      technicalPlanVersion: 1,
      technicalPlanFingerprint: contentFingerprint({ plan: "imports" }),
      specificationId: implementationReadySpecificationFixture.specification.id,
      specificationVersion: implementationReadySpecificationFixture.specification.version,
      specificationFingerprint: implementationReadySpecificationFixture.specification.fingerprint,
      constitutionFingerprint: contentFingerprint({ constitution: "imports" }),
      goal: "Test first-degree import resolution",
      scope: ["src/"],
      exclusions: [],
      constraints: [],
      acceptanceCriteria: ["criterion_export"],
      fileBoundaries: {
        writableFiles: ["src/main.ts"],
        readOnlyFiles: [],
        protectedFiles: [],
      },
      validations: [
        {
          phase: "pre_execution" as const,
          command: "npm test",
          required: true as const,
          source: "compiler" as const,
        },
      ],
      riskLevel: "low" as const,
      prerequisiteTaskRefs: [],
      artifactOutputRefs: [],
      rollbackStrategy: "git revert",
      evidenceRefs: ["evidence:imports"],
      compilerVersion: "test-v1",
      fingerprint: contentFingerprint({ taskCard: "imports_test" }),
    };

    const context = compileCodeAwareContext({
      taskCard,
      specifications: [implementationReadySpecificationFixture.specification],
      constitutionRules: [],
      repositoryManifest: manifest,
    });

    // The writable file should be included
    expect(context.codeContext.some((item) => item.path === "src/main.ts")).toBe(true);
    // The first-degree dependency (helpers.ts) should be included
    expect(context.codeContext.some((item) => item.path === "src/helpers.ts")).toBe(true);
    // Unrelated file should NOT be included (not writable, readonly, or a dependency of writable)
    expect(context.codeContext.some((item) => item.path === "src/unrelated.ts")).toBe(false);
    // The dependency should have the correct reason
    const depItem = context.codeContext.find((item) => item.path === "src/helpers.ts");
    expect(depItem).toBeDefined();
    expect(depItem!.reason).toBe("task_code_dependency_first_degree");
  });

  it("falls back to canonical V1 when no manifest is provided", () => {
    const taskCard = compileTaskCard({
      slice: approvedImplementationSlice,
      constitutionRules: implementationReadySpecificationFixture.constitutionRules.map(
        (record) => record.rule,
      ),
    }).taskCard!;

    const context = compileCodeAwareContext({
      taskCard,
      specifications: [implementationReadySpecificationFixture.specification],
      constitutionRules: implementationReadySpecificationFixture.constitutionRules.map(
        (record) => record.rule,
      ),
      // No repositoryManifest provided
    });

    // Should fall back to V1 canonical mode
    expect(context.mode).toBe("canonical_v1");
    expect(context.metadata.canonicalOnly).toBe(true);
    expect(context.metadata.codeAwareCompilation).toBe(false);
    expect(context.codeContext).toEqual([]);
  });

  it("gracefully skips files listed in boundaries but missing from disk", () => {
    const base = createTempDir();
    write(base, "src/existing.ts", "export const ok = true;");

    const parseResult = parseRepository({ rootPath: base });
    if (isSizeBoundaryExceeded(parseResult)) throw new Error("Unexpected size limit");
    const manifest = parseResult;
    const taskCard = {
      taskCardId: "task_card_missing_test" as const,
      sourceSliceId: "slice_missing_1" as const,
      sourceSliceVersion: 1,
      sourceSliceFingerprint: contentFingerprint({ slice: "missing" }),
      technicalPlanId: "plan_test",
      technicalPlanVersion: 1,
      technicalPlanFingerprint: contentFingerprint({ plan: "missing" }),
      specificationId: implementationReadySpecificationFixture.specification.id,
      specificationVersion: implementationReadySpecificationFixture.specification.version,
      specificationFingerprint: implementationReadySpecificationFixture.specification.fingerprint,
      constitutionFingerprint: contentFingerprint({ constitution: "missing" }),
      goal: "Test graceful handling of missing files",
      scope: ["src/"],
      exclusions: [],
      constraints: [],
      acceptanceCriteria: ["criterion_export"],
      fileBoundaries: {
        writableFiles: ["src/existing.ts", "src/missing.ts"],
        readOnlyFiles: [],
        protectedFiles: [],
      },
      validations: [
        {
          phase: "pre_execution" as const,
          command: "npm test",
          required: true as const,
          source: "compiler" as const,
        },
      ],
      riskLevel: "low" as const,
      prerequisiteTaskRefs: [],
      artifactOutputRefs: [],
      rollbackStrategy: "git revert",
      evidenceRefs: ["evidence:missing"],
      compilerVersion: "test-v1",
      fingerprint: contentFingerprint({ taskCard: "missing_test" }),
    };

    const context = compileCodeAwareContext({
      taskCard,
      specifications: [implementationReadySpecificationFixture.specification],
      constitutionRules: [],
      repositoryManifest: manifest,
    });

    // Existing file should be included
    expect(context.codeContext.some((item) => item.path === "src/existing.ts")).toBe(true);
    // Missing file should be skipped gracefully
    expect(context.codeContext.some((item) => item.path === "src/missing.ts")).toBe(false);
  });
});
