import type { TestSuite } from "../schema";

export const discoverySuite: TestSuite = {
  name: "Discovery Suite",
  description: "Tests the discovery engine with various canonical project states.",
  cases: [
    {
      name: "complete_project",
      description: "A fully complete project should trigger interview skip.",
      engine: "discovery",
      input: {
        metadata: {
          projectId: "proj_complete",
          name: "Complete Project",
          lifecycle: "understanding_review",
        },
        fields: [],
        revision: { version: 1, lifecycle: "draft", createdAt: "2026-07-23T12:00:00.000Z" },
        decisions: [],
        assumptions: [],
        conflicts: [],
        traceabilityLinks: [],
      },
      expectedAssertions: ["completes without error"],
    },
    {
      name: "partially_complete",
      description: "A partially complete project with some missing fields.",
      engine: "discovery",
      input: {
        metadata: {
          projectId: "proj_partial",
          name: "Partial Project",
          lifecycle: "initial_intake",
        },
        fields: [],
        revision: { version: 1, lifecycle: "draft", createdAt: "2026-07-23T12:00:00.000Z" },
        decisions: [],
        assumptions: [],
        conflicts: [],
        traceabilityLinks: [],
      },
      expectedAssertions: ["completes without error"],
    },
  ],
};
