import { describe, expect, it } from "vitest";

import { implementationSliceSchema } from "../governance";
import { approvedImplementationSlice, calculateImplementationSliceFingerprint } from "../planning";
import {
  compileTaskCard,
  resolveFileBoundaries,
  serializeTaskCard,
  taskCardSchema,
  validateTaskCard,
} from ".";

describe("Task Card Compiler runtime", () => {
  it("compiles an approved Implementation Slice into a normalized Task Card", () => {
    const report = compileTaskCard({ slice: approvedImplementationSlice });
    expect(report.status).toBe("valid");
    expect(report.findings).toEqual([]);
    expect(report.taskCard?.sourceSliceId).toBe(approvedImplementationSlice.id);
    expect(report.taskCard?.goal).toBe(approvedImplementationSlice.goal);
    expect(report.taskCard?.acceptanceCriteria).toEqual(
      approvedImplementationSlice.acceptanceCriterionIds,
    );
    expect(report.taskCard?.validations.map((validation) => validation.command)).toContain(
      "validation:npm-test",
    );
  });

  it("keeps protected file boundaries out of writable files", () => {
    const boundaries = resolveFileBoundaries({
      editableScope: [".env", "src/domain/task-card/**"],
      protectedScope: [".env", "package-lock.json"],
      scope: ["Task Card compiler"],
      exclusions: [],
      riskRefs: [],
      prerequisiteSliceIds: [],
    });
    expect(boundaries.protectedFiles).toContain(".env");
    expect(boundaries.protectedFiles).toContain("package-lock.json");
    expect(boundaries.writableFiles).toEqual(["src/domain/task-card/**"]);
  });

  it("reports protected boundary overlap if a malformed Task Card marks it writable", () => {
    const report = compileTaskCard({ slice: approvedImplementationSlice });
    const validation = validateTaskCard({
      ...report.taskCard!,
      fileBoundaries: {
        writableFiles: [".env"],
        readOnlyFiles: [],
        protectedFiles: [".env"],
      },
    } as never);
    expect(validation.status).toBe("blocked");
    expect(
      validation.findings.some((finding) => finding.ruleId === "task_card.protected_file_boundary"),
    ).toBe(true);
  });

  it("rejects input slices with required fields missing", () => {
    const missingGoal: Partial<typeof approvedImplementationSlice> = structuredClone(
      approvedImplementationSlice,
    );
    delete missingGoal.goal;
    expect(() => compileTaskCard({ slice: missingGoal })).toThrow();
    expect(() => implementationSliceSchema.parse(missingGoal)).toThrow();
  });

  it("serializes deterministically", () => {
    const first = compileTaskCard({ slice: approvedImplementationSlice }).taskCard!;
    const second = compileTaskCard({
      slice: structuredClone(approvedImplementationSlice),
    }).taskCard!;
    expect(first).toEqual(second);
    expect(taskCardSchema.parse(JSON.parse(serializeTaskCard(first)))).toEqual(first);
  });

  it("preserves parent traceability metadata", () => {
    const report = compileTaskCard({ slice: approvedImplementationSlice });
    expect(report.taskCard?.technicalPlanId).toBe(approvedImplementationSlice.technicalPlanId);
    expect(report.taskCard?.technicalPlanFingerprint).toBe(
      approvedImplementationSlice.technicalPlanFingerprint,
    );
    expect(report.taskCard?.specificationFingerprint).toBe(
      approvedImplementationSlice.specificationFingerprint,
    );
  });

  it("uses the slice fingerprint as source evidence and changes when the slice changes", () => {
    const changed = {
      ...approvedImplementationSlice,
      riskRefs: ["risk:secret-exposure", "risk:data-migration"],
    };
    const refingerprinted = implementationSliceSchema.parse({
      ...changed,
      fingerprint: calculateImplementationSliceFingerprint(changed),
    });
    const original = compileTaskCard({ slice: approvedImplementationSlice }).taskCard!;
    const next = compileTaskCard({ slice: refingerprinted }).taskCard!;
    expect(next.sourceSliceFingerprint).not.toBe(original.sourceSliceFingerprint);
    expect(next.fingerprint).not.toBe(original.fingerprint);
    expect(next.riskLevel).toBe("high");
  });
});
