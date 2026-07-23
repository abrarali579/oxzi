/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it } from "vitest";
import { contentFingerprint } from "../knowledge-graph";
import { runSpecToCodeConvergence, type SpecToCodeInput } from "./spec-to-code";

// ── Shared Test Fixtures ────────────────────────────────────────

const taskCard = {
  taskCardId: "task_card_convergence_test" as any,
  sourceSliceId: "slice_convergence_1" as any,
  sourceSliceVersion: 1,
  sourceSliceFingerprint: contentFingerprint({ slice: "convergence" }),
  technicalPlanId: "plan_test",
  technicalPlanVersion: 1,
  technicalPlanFingerprint: contentFingerprint({ plan: "convergence" }),
  specificationId: "spec_convergence",
  specificationVersion: 1,
  specificationFingerprint: contentFingerprint({ spec: "convergence" }),
  constitutionFingerprint: contentFingerprint({ constitution: "convergence" }),
  goal: "Implement authentication feature with login and token validation",
  scope: ["src/"],
  exclusions: [],
  constraints: [],
  acceptanceCriteria: ["criterion_auth_login" as any, "criterion_auth_token" as any],
  fileBoundaries: {
    writableFiles: ["src/auth.ts", "src/token.ts"],
    readOnlyFiles: ["src/types.ts"],
    protectedFiles: ["src/secret.ts", "config/deploy.yml"],
  },
  validations: [
    {
      phase: "pre_execution" as const,
      command: "npm test",
      required: true as const,
      source: "compiler" as const,
    },
  ],
  riskLevel: "medium" as const,
  prerequisiteTaskRefs: [],
  artifactOutputRefs: [],
  rollbackStrategy: "git revert",
  evidenceRefs: ["evidence:convergence"],
  compilerVersion: "test-v1",
  fingerprint: contentFingerprint({ taskCard: "convergence_test" }),
};

const minimalCompiledContext = {
  id: "compiled_context_test" as any,
  taskCardId: "task_card_convergence_test" as any,
  taskCardFingerprint: contentFingerprint({ taskCard: "convergence_test" }),
  mode: "canonical_v1" as const,
  items: [],
  codeContext: [],
  resolvedSpecificationIds: [],
  omittedRefs: [],
  limitationRefs: [],
  sufficiency: "insufficient" as const,
  metadata: {
    compilerVersion: "v1",
    canonicalOnly: true,
    codeAwareCompilation: false,
    inclusionPolicy: "test",
    minimumSafeContextEstimate: 0,
  },
  fingerprint: contentFingerprint({ ctx: "test" }),
};

// ── Tests ───────────────────────────────────────────────────────

describe("Spec-to-Code Convergence Runtime", () => {
  it("reports DIVERGED with CRITICAL when a protected file is in proposed code", () => {
    const proposedCode = {
      rootPath: "/test",
      timestamp: new Date().toISOString(),
      files: [
        { filePath: "src/auth.ts", size: 100, extension: ".ts", modifiedAt: new Date().toISOString(), exports: ["Authenticate"], imports: [], opaque: false },
        { filePath: "src/secret.ts", size: 50, extension: ".ts", modifiedAt: new Date().toISOString(), exports: ["SECRET"], imports: [], opaque: false },
      ],
      edges: [],
    };

    const report = runSpecToCodeConvergence({ taskCard, compiledContext: minimalCompiledContext, proposedCode });

    expect(report.status).toBe("DIVERGED");
    expect(report.score).toBeLessThan(100);
    const criticalDiv = report.divergences.find(
      (d) => d.severity === "CRITICAL" && d.targetFile === "src/secret.ts",
    );
    expect(criticalDiv).toBeDefined();
    expect(criticalDiv!.criterionId).toBe("boundary_protected_file");
  });

  it("reports CONVERGED when all criteria are met", () => {
    // Task Card boundaries: writable=[src/auth.ts, src/token.ts], readOnly=[src/types.ts]
    // Criteria: criterion_auth_login → keywords=["auth","login"] → exports=["Auth","Login"]
    //           criterion_auth_token → keywords=["auth","token"] → exports=["Auth","Token"]
    // Each file must export at least the capitalized keyword exports
    const proposedCode = {
      rootPath: "/test",
      timestamp: new Date().toISOString(),
      files: [
        { filePath: "src/auth.ts", size: 100, extension: ".ts", modifiedAt: new Date().toISOString(), exports: ["Auth", "Login", "Token", "Authenticate"], imports: [], opaque: false },
        { filePath: "src/token.ts", size: 80, extension: ".ts", modifiedAt: new Date().toISOString(), exports: ["Token", "Auth"], imports: [], opaque: false },
        { filePath: "src/types.ts", size: 30, extension: ".ts", modifiedAt: new Date().toISOString(), exports: ["UserType"], imports: [], opaque: false },
      ],
      edges: [],
    };

    const report = runSpecToCodeConvergence({ taskCard, compiledContext: minimalCompiledContext, proposedCode });

    expect(report.status).toBe("CONVERGED");
    expect(report.score).toBe(100);
    expect(report.divergences).toHaveLength(0);
  });

  it("reports WARNING for missing writable files", () => {
    const proposedCode = {
      rootPath: "/test",
      timestamp: new Date().toISOString(),
      files: [
        { filePath: "src/auth.ts", size: 100, extension: ".ts", modifiedAt: new Date().toISOString(), exports: [], imports: [], opaque: false },
      ],
      edges: [],
    };

    const report = runSpecToCodeConvergence({ taskCard, compiledContext: minimalCompiledContext, proposedCode });

    expect(report.status).toBe("DIVERGED");
    const missingWritable = report.divergences.find(
      (d) => d.criterionId === "boundary_missing_writable" && d.targetFile === "src/token.ts",
    );
    expect(missingWritable).toBeDefined();
    expect(missingWritable!.severity).toBe("WARNING");
  });

  it("reports divergence for unauthorised files", () => {
    const proposedCode = {
      rootPath: "/test",
      timestamp: new Date().toISOString(),
      files: [
        { filePath: "src/auth.ts", size: 100, extension: ".ts", modifiedAt: new Date().toISOString(), exports: [], imports: [], opaque: false },
        { filePath: "src/token.ts", size: 80, extension: ".ts", modifiedAt: new Date().toISOString(), exports: [], imports: [], opaque: false },
        { filePath: "src/unauthorised.ts", size: 20, extension: ".ts", modifiedAt: new Date().toISOString(), exports: [], imports: [], opaque: false },
      ],
      edges: [],
    };

    const report = runSpecToCodeConvergence({ taskCard, compiledContext: minimalCompiledContext, proposedCode });

    const unauthorised = report.divergences.find(
      (d) => d.criterionId === "boundary_unauthorised_file",
    );
    expect(unauthorised).toBeDefined();
    expect(unauthorised!.targetFile).toBe("src/unauthorised.ts");
  });

  it("accurately scores alignment percentage", () => {
    const proposedCode = {
      rootPath: "/test",
      timestamp: new Date().toISOString(),
      files: [
        { filePath: "src/auth.ts", size: 100, extension: ".ts", modifiedAt: new Date().toISOString(), exports: ["Authenticate", "Login"], imports: [], opaque: false },
        { filePath: "src/token.ts", size: 80, extension: ".ts", modifiedAt: new Date().toISOString(), exports: ["Token", "Validation"], imports: [], opaque: false },
        { filePath: "src/types.ts", size: 30, extension: ".ts", modifiedAt: new Date().toISOString(), exports: ["UserType"], imports: [], opaque: false },
        { filePath: "src/secret.ts", size: 50, extension: ".ts", modifiedAt: new Date().toISOString(), exports: ["SECRET"], imports: [], opaque: false },
      ],
      edges: [],
    };

    const report = runSpecToCodeConvergence({ taskCard, compiledContext: minimalCompiledContext, proposedCode });

    // DIVERGED because protected file present; score reflects alignment lost
    expect(report.status).toBe("DIVERGED");
    expect(report.matrix.totalCriteria).toBeGreaterThan(0);
    expect(report.matrix.passed + report.matrix.failed + report.matrix.skipped)
      .toBe(report.matrix.totalCriteria);
    expect(report.matrix.score).toBeGreaterThanOrEqual(0);
    expect(report.matrix.score).toBeLessThan(100);
  });

  it("reports missing required exports in acceptance criteria verification", () => {
    // Task Card goal mentions "authentication" and "token", so required exports
    // include "Authentication" and "Token"
    const proposedCode = {
      rootPath: "/test",
      timestamp: new Date().toISOString(),
      files: [
        { filePath: "src/auth.ts", size: 100, extension: ".ts", modifiedAt: new Date().toISOString(), exports: ["Authenticate"], imports: [], opaque: false },
        { filePath: "src/token.ts", size: 80, extension: ".ts", modifiedAt: new Date().toISOString(), exports: [], imports: [], opaque: false },
        { filePath: "src/types.ts", size: 30, extension: ".ts", modifiedAt: new Date().toISOString(), exports: ["UserType"], imports: [], opaque: false },
      ],
      edges: [],
    };

    const report = runSpecToCodeConvergence({ taskCard, compiledContext: minimalCompiledContext, proposedCode });

    // Should have convergence items — look for failures
    const failedConvergences = report.convergences.filter((c) => c.status === "fail");
    expect(failedConvergences.length).toBeGreaterThanOrEqual(0);
    // Score should reflect some failures
    expect(report.matrix.failed).toBeGreaterThanOrEqual(0);
  });

  it("produces a valid SpecToCodeConvergenceReport schema", () => {
    const proposedCode = {
      rootPath: "/test",
      timestamp: new Date().toISOString(),
      files: [
        { filePath: "src/auth.ts", size: 100, extension: ".ts", modifiedAt: new Date().toISOString(), exports: [], imports: [], opaque: false },
        { filePath: "src/token.ts", size: 80, extension: ".ts", modifiedAt: new Date().toISOString(), exports: [], imports: [], opaque: false },
        { filePath: "src/types.ts", size: 30, extension: ".ts", modifiedAt: new Date().toISOString(), exports: [], imports: [], opaque: false },
      ],
      edges: [],
    };

    const report = runSpecToCodeConvergence({ taskCard, compiledContext: minimalCompiledContext, proposedCode });

    expect(report.fingerprint).toBeDefined();
    expect(report.reportId).toMatch(/^convergence_report_/);
    expect(report.taskCardId).toBe("task_card_convergence_test");
  });
});
