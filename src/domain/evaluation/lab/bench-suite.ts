/**
 * OXZI Bench Suite Engine — Step 14
 *
 * Runs synthetic and fixture-based project specifications through the
 * entire OXZI pipeline and measures token efficiency, schema validity,
 * determinism, and convergence.
 */
import { compileTaskCard } from "../../task-card";
import { compileCanonicalContext } from "../../context-compiler";
import { renderPromptProgram } from "../../prompt-renderer";
import { evaluatePromptProgram, certifyPromptProgram } from "../runtime";
import { issueExecutionPassport } from "../../control-plane";
import { reviewConvergence } from "../../convergence";
import {
  benchmarkResultSchema,
  benchSuiteResultSchema,
  benchmarkFixtureSchema,
  type BenchmarkFixture,
  type BenchmarkResult,
  type BenchSuiteResult,
} from "../schemas";

const AGENT_PROFILE = {
  id: "agent_profile_codex",
  name: "Codex",
  capabilities: ["patch_edits", "shell_validation", "artifact_reports"],
  maxTokens: 20000,
  supportedPromptStyles: ["agent_optimized"],
  supportsArtifacts: true,
} as unknown as Parameters<typeof issueExecutionPassport>[2];

/**
 * Run the full OXZI pipeline against the provided slice and specification,
 * and measure results against the fixture's expected metadata.
 */
export function runBenchmarkFixture(
  fixture: BenchmarkFixture,
  constitutionRules: unknown[],
  slice: unknown,
  specification: unknown,
): BenchmarkResult {
  const parsed = benchmarkFixtureSchema.parse(fixture);
  const start = performance.now();
  const schemaErrors: string[] = [];

  try {
    // Step 1: Compile Task Card
    const taskCardResult = compileTaskCard({
      slice: slice as never,
      constitutionRules,
    });

    if (!taskCardResult.taskCard) {
      schemaErrors.push("Task Card compilation returned null");
      return benchmarkResultSchema.parse({
        fixtureId: parsed.fixtureId,
        passed: false,
        latencyMs: performance.now() - start,
        tokenCount: 0,
        schemaErrors,
      });
    }

    // Step 2: Compile canonical context
    const compiledContext = compileCanonicalContext({
      taskCard: taskCardResult.taskCard,
      specifications: [specification],
      constitutionRules,
    });

    // Step 3: Render Prompt Program
    const program = renderPromptProgram({
      taskCard: taskCardResult.taskCard,
      compiledContext,
      agentProfile: AGENT_PROFILE,
    });

    // Step 4: Evaluate and certify
    const evaluation = evaluatePromptProgram(program);
    const certification = certifyPromptProgram(evaluation);
    if (certification.status !== "CERTIFIED") {
      schemaErrors.push(`Prompt certification failed: ${certification.reason}`);
    }

    // Step 5: Issue Execution Passport
    const passport = issueExecutionPassport(certification, taskCardResult.taskCard, AGENT_PROFILE);
    const verification = passport.passportId ? true : false;
    if (!verification) {
      schemaErrors.push("Execution passport issuance failed");
    }

    // Step 6: Convergence review (simulated patch with writable files)
    const convergence = reviewConvergence({
      taskCard: taskCardResult.taskCard,
      patch: {
        taskCardId: taskCardResult.taskCard.taskCardId,
        modifiedFilePaths: taskCardResult.taskCard.fileBoundaries.writableFiles.slice(0, 1),
      },
    });

    // Verify passport boundaries match expected
    if (parsed.expectedPassportBoundaries.length > 0) {
      const missing = parsed.expectedPassportBoundaries.filter(
        (b) => !passport.scope.writableFiles.includes(b),
      );
      if (missing.length > 0) {
        schemaErrors.push(
          `Passport missing expected writable boundaries: ${missing.join(", ")}`,
        );
      }
    }

    const tokenCount = program.renderedPrompt.length;
    const passed = schemaErrors.length === 0 && convergence.status === "APPROVED";

    return benchmarkResultSchema.parse({
      fixtureId: parsed.fixtureId,
      passed,
      latencyMs: Math.round((performance.now() - start) * 100) / 100,
      tokenCount: Math.ceil(tokenCount / 4),
      schemaErrors,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    schemaErrors.push(`Pipeline exception: ${msg}`);
    return benchmarkResultSchema.parse({
      fixtureId: parsed.fixtureId,
      passed: false,
      latencyMs: Math.round((performance.now() - start) * 100) / 100,
      tokenCount: 0,
      schemaErrors,
    });
  }
}

/**
 * Run a full bench suite across multiple fixtures.
 */
export function runBenchSuite(
  suiteName: string,
  fixtures: BenchmarkFixture[],
  constitutionRules: unknown[],
  slice: unknown,
  specification: unknown,
): BenchSuiteResult {
  const results: BenchmarkResult[] = fixtures.map((f) =>
    runBenchmarkFixture(f, constitutionRules, slice, specification),
  );

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const totalLatencyMs = results.reduce((s, r) => s + r.latencyMs, 0);
  const totalTokens = results.reduce((s, r) => s + r.tokenCount, 0);
  const passRate = results.length > 0 ? Math.round((passed / results.length) * 100) : 0;

  return benchSuiteResultSchema.parse({
    suiteName,
    totalFixtures: results.length,
    passed,
    failed,
    totalLatencyMs: Math.round(totalLatencyMs * 100) / 100,
    totalTokens,
    passRate,
    results,
  });
}
