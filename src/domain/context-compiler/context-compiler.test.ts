import { describe, expect, it } from "vitest";

import { implementationReadySpecificationFixture } from "../governance";
import { compileTaskCard } from "../task-card";
import { approvedImplementationSlice } from "../planning";
import { compileCanonicalContext, serializeCompiledContext } from ".";

const taskCard = compileTaskCard({
  slice: approvedImplementationSlice,
  constitutionRules: implementationReadySpecificationFixture.constitutionRules.map(
    (record) => record.rule,
  ),
}).taskCard!;

describe("Canonical Context Compiler v1", () => {
  it("gathers referenced canonical specification and constitution artifacts", () => {
    const context = compileCanonicalContext({
      taskCard,
      specifications: [implementationReadySpecificationFixture.specification],
      constitutionRules: implementationReadySpecificationFixture.constitutionRules.map(
        (record) => record.rule,
      ),
    });
    expect(context.sufficiency).toBe("sufficient");
    expect(context.items.map((item) => item.artifactKind)).toEqual([
      "constitution_rule",
      "specification",
    ]);
    expect(
      context.items.some((item) => item.selectionReasons.includes("task_specification_reference")),
    ).toBe(true);
    expect(context.metadata.canonicalOnly).toBe(true);
    expect(context.metadata.codeAwareCompilation).toBe(false);
  });

  it("discloses the V1 canonical-only limitation", () => {
    const context = compileCanonicalContext({
      taskCard,
      specifications: [implementationReadySpecificationFixture.specification],
      constitutionRules: [],
    });
    expect(context.limitationRefs).toContain("canonical-v1:no-code-parsing");
    expect(context.limitationRefs).toContain("canonical-v1:no-ast-traversal");
    expect(context.limitationRefs).toContain("canonical-v1:no-structural-search");
  });

  it("reports insufficiency when the referenced specification is absent", () => {
    const context = compileCanonicalContext({
      taskCard,
      specifications: [],
      constitutionRules: [],
    });
    expect(context.sufficiency).toBe("insufficient");
    expect(context.omittedRefs).toContain(`missing-specification:${taskCard.specificationId}@1`);
  });

  it("serializes byte-stably", () => {
    const first = compileCanonicalContext({
      taskCard,
      specifications: [implementationReadySpecificationFixture.specification],
      constitutionRules: implementationReadySpecificationFixture.constitutionRules.map(
        (record) => record.rule,
      ),
    });
    const second = compileCanonicalContext({
      taskCard: structuredClone(taskCard),
      specifications: [structuredClone(implementationReadySpecificationFixture.specification)],
      constitutionRules: implementationReadySpecificationFixture.constitutionRules.map((record) =>
        structuredClone(record.rule),
      ),
    });
    expect(first).toEqual(second);
    expect(serializeCompiledContext(first)).toBe(serializeCompiledContext(second));
  });

  it("rejects non-Task Card input rather than guessing context", () => {
    const malformedTaskCard: Partial<typeof taskCard> = structuredClone(taskCard);
    delete malformedTaskCard.goal;
    expect(() =>
      compileCanonicalContext({
        taskCard: malformedTaskCard,
        specifications: [implementationReadySpecificationFixture.specification],
        constitutionRules: [],
      }),
    ).toThrow();
  });
});
