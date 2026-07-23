import { bench, describe } from "vitest";
import { compileCanonicalContext } from "@/domain/context-compiler";
import { compileTaskCard } from "@/domain/task-card";
import { renderPromptProgram } from "@/domain/prompt-renderer";
import { parseFileAST } from "@/domain/repository-intelligence";
import { implementationReadySpecificationFixture } from "@/domain/governance";
import { approvedImplementationSlice } from "@/domain/planning";

const taskCard = compileTaskCard({
  slice: approvedImplementationSlice,
  constitutionRules: implementationReadySpecificationFixture.constitutionRules.map(
    (r: { rule: unknown }) => r.rule,
  ),
}).taskCard!;

const compiledContext = compileCanonicalContext({
  taskCard,
  specifications: [implementationReadySpecificationFixture.specification],
  constitutionRules: implementationReadySpecificationFixture.constitutionRules.map(
    (r: { rule: unknown }) => r.rule,
  ),
});

const agentProfile = {
  id: "agent_profile_codex" as const,
  name: "Codex",
  capabilities: ["patch_edits", "shell_validation", "artifact_reports"],
  maxTokens: 20000,
  supportedPromptStyles: ["agent_optimized" as const],
  supportsArtifacts: true,
};

describe("Context Compiler benchmark", () => {
  bench("compile canonical context", () => {
    compileCanonicalContext({
      taskCard,
      specifications: [implementationReadySpecificationFixture.specification],
      constitutionRules: implementationReadySpecificationFixture.constitutionRules.map(
        (r: { rule: unknown }) => r.rule,
      ),
    });
  });
});

describe("Task Card benchmark", () => {
  bench("compile task card", () => {
    compileTaskCard({
      slice: approvedImplementationSlice,
      constitutionRules: implementationReadySpecificationFixture.constitutionRules.map(
        (r: { rule: unknown }) => r.rule,
      ),
    });
  });
});

describe("Prompt Renderer benchmark", () => {
  bench("render prompt program", () => {
    renderPromptProgram({ taskCard, compiledContext, agentProfile });
  });
});

// ── Concurrency Stress Tests ────────────────────────────────────

describe("Concurrency: Task Card stress (500 iterations)", () => {
  bench("compile 500 task cards sequentially", () => {
    for (let i = 0; i < 500; i++) {
      compileTaskCard({
        slice: approvedImplementationSlice,
        constitutionRules: implementationReadySpecificationFixture.constitutionRules.map(
          (r: { rule: unknown }) => r.rule,
        ),
      });
    }
  });
});

describe("Concurrency: AST graph stress (1,000 traversals)", () => {
  const LARGE_SOURCE = `
import { z } from "zod";
import { useState, useEffect } from "react";

export const App = () => {
  const [count, setCount] = useState(0);
  useEffect(() => { document.title = String(count); }, [count]);
  return count;
};

export interface User { name: string; age: number; }
export type Status = "active" | "inactive";
export function helper() { return 42; }
export class Service { start() {} }
`.repeat(20); // ~20 module-like exports

  bench("parse 1,000 AST traversals", () => {
    for (let i = 0; i < 1000; i++) {
      parseFileAST(LARGE_SOURCE, `stress-test-${i}.ts`);
    }
  });
});
