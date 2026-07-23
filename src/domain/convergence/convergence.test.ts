import { describe, expect, it } from "vitest";

import { contentFingerprint } from "../knowledge-graph";
import { reviewConvergence, convergenceReportSchema } from ".";

const testTaskCard = {
  taskCardId: "task_card_convergence_test" as const,
  sourceSliceId: "slice_convergence_1" as const,
  sourceSliceVersion: 1,
  sourceSliceFingerprint: contentFingerprint({ slice: "convergence" }),
  technicalPlanId: "plan_test",
  technicalPlanVersion: 1,
  technicalPlanFingerprint: contentFingerprint({ plan: "convergence" }),
  specificationId: "spec_convergence",
  specificationVersion: 1,
  specificationFingerprint: contentFingerprint({ spec: "convergence" }),
  constitutionFingerprint: contentFingerprint({ constitution: "convergence" }),
  goal: "Test convergence review",
  scope: ["src/"],
  exclusions: [],
  constraints: [],
  acceptanceCriteria: ["criterion_convergence"],
  fileBoundaries: {
    writableFiles: ["src/feature.ts", "src/utils.ts"],
    readOnlyFiles: ["src/config.ts"],
    protectedFiles: ["src/secret.ts", ".env"],
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
  evidenceRefs: ["evidence:convergence"],
  compilerVersion: "test-v1",
  fingerprint: contentFingerprint({ taskCard: "convergence_test" }),
};

describe("Convergence Review", () => {
  it("approves a patch modifying only writable files", () => {
    const report = reviewConvergence({
      taskCard: testTaskCard,
      patch: {
        taskCardId: "task_card_convergence_test",
        modifiedFilePaths: ["src/feature.ts", "src/utils.ts"],
      },
    });

    expect(report.status).toBe("APPROVED");
    expect(report.violations).toEqual([]);
    expect(report.verifiedFilePaths).toEqual(["src/feature.ts", "src/utils.ts"]);
  });

  it("rejects a patch modifying a protected file", () => {
    const report = reviewConvergence({
      taskCard: testTaskCard,
      patch: {
        taskCardId: "task_card_convergence_test",
        modifiedFilePaths: ["src/feature.ts", "src/secret.ts"],
      },
    });

    expect(report.status).toBe("REJECTED");
    expect(report.violations).toHaveLength(1);
    expect(report.violations[0]!.violation).toBe("protected_file_modified");
    expect(report.violations[0]!.filePath).toBe("src/secret.ts");
  });

  it("rejects a patch modifying a file not in the writable scope", () => {
    const report = reviewConvergence({
      taskCard: testTaskCard,
      patch: {
        taskCardId: "task_card_convergence_test",
        modifiedFilePaths: ["src/feature.ts", "src/unrelated.ts"],
      },
    });

    expect(report.status).toBe("REJECTED");
    expect(report.violations).toHaveLength(1);
    expect(report.violations[0]!.violation).toBe("out_of_scope_file_modified");
    expect(report.violations[0]!.filePath).toBe("src/unrelated.ts");
  });

  it("reports multiple violations when multiple boundaries are crossed", () => {
    const report = reviewConvergence({
      taskCard: testTaskCard,
      patch: {
        taskCardId: "task_card_convergence_test",
        modifiedFilePaths: ["src/secret.ts", ".env", "src/outside.ts"],
      },
    });

    expect(report.status).toBe("REJECTED");
    expect(report.violations).toHaveLength(3);

    const protectedViolations = report.violations.filter(
      (v) => v.violation === "protected_file_modified",
    );
    const outOfScopeViolations = report.violations.filter(
      (v) => v.violation === "out_of_scope_file_modified",
    );

    expect(protectedViolations).toHaveLength(2);
    expect(outOfScopeViolations).toHaveLength(1);
  });

  it("produces a valid ConvergenceReport schema", () => {
    const report = reviewConvergence({
      taskCard: testTaskCard,
      patch: {
        taskCardId: "task_card_convergence_test",
        modifiedFilePaths: ["src/feature.ts"],
      },
    });

    expect(() => convergenceReportSchema.parse(report)).not.toThrow();
    expect(report.fingerprint).toBeDefined();
  });

  it("rejects a patch that touches no writable files (all out of scope)", () => {
    const report = reviewConvergence({
      taskCard: testTaskCard,
      patch: {
        taskCardId: "task_card_convergence_test",
        modifiedFilePaths: ["readme.md", "docs/guide.md"],
      },
    });

    expect(report.status).toBe("REJECTED");
    expect(report.verifiedFilePaths).toEqual([]);
  });

  it("requires a patch to have at least one modified file", () => {
    expect(() =>
      reviewConvergence({
        taskCard: testTaskCard,
        patch: {
          taskCardId: "task_card_convergence_test",
          modifiedFilePaths: [],
        },
      }),
    ).toThrow();
  });
});
