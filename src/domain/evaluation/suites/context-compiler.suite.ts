import type { TestSuite } from "../schema";

export const contextCompilerSuite: TestSuite = {
  name: "Context Compiler Suite",
  description: "Tests V1 and V2 context compilation with various Task Cards.",
  cases: [
    {
      name: "v1_canonical_compilation",
      description: "V1 canonical-only context compilation with a valid specification.",
      engine: "context_compiler_v1",
      input: {
        taskCard: {
          taskCardId: "task_card_test",
          sourceSliceId: "slice_test",
          sourceSliceVersion: 1,
          sourceSliceFingerprint: "fp_f1_test",
          technicalPlanId: "plan_test",
          technicalPlanVersion: 1,
          technicalPlanFingerprint: "fp_f1_test",
          specificationId: "spec_test",
          specificationVersion: 1,
          specificationFingerprint: "fp_f1_test",
          constitutionFingerprint: "fp_f1_test",
          goal: "Test compilation",
          scope: ["src/"],
          exclusions: [],
          constraints: [],
          acceptanceCriteria: ["criterion_test"],
          fileBoundaries: { writableFiles: [], readOnlyFiles: [], protectedFiles: [] },
          validations: [
            { phase: "pre_execution", command: "npm test", required: true, source: "compiler" },
          ],
          riskLevel: "low",
          prerequisiteTaskRefs: [],
          artifactOutputRefs: [],
          rollbackStrategy: "git revert",
          evidenceRefs: ["evidence:test"],
          compilerVersion: "test-v1",
          fingerprint: "fp_f1_test_card",
        },
        specifications: [],
        decisions: [],
        constitutionRules: [],
      },
      expectedAssertions: ["completes without error"],
    },
  ],
};
