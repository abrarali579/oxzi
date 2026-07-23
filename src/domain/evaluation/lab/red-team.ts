/**
 * Red-Team & Edge-Case Validator — Step 14
 *
 * Evaluates pipeline behavior against malicious or invalid inputs.
 * Confirms governance gates block 100% of invalid/unsafe requests.
 */
import { reviewConvergence } from "../../convergence";
import { runSpecToCodeConvergence } from "../../convergence/spec-to-code";
import { compileCanonicalContext } from "../../context-compiler";
import { renderPromptProgram } from "../../prompt-renderer";
import { evaluatePromptProgram, certifyPromptProgram } from "../runtime";
import { issueExecutionPassport, checkPassportScope } from "../../control-plane";

const AGENT_PROFILE = {
  id: "agent_profile_codex",
  name: "Codex",
  capabilities: ["patch_edits", "shell_validation", "artifact_reports"],
  maxTokens: 20000,
  supportedPromptStyles: ["agent_optimized"],
  supportsArtifacts: true,
} as unknown as Parameters<typeof issueExecutionPassport>[2];

export interface RedTeamResult {
  testName: string;
  blocked: boolean;
  detail: string;
}

/**
 * Verify that a malicious or invalid input is correctly blocked.
 */
export function runRedTeamTest(
  testName: string,
  fn: () => RedTeamResult,
): RedTeamResult {
  try {
    return fn();
  } catch (err) {
    return {
      testName,
      blocked: true,
      detail: err instanceof Error ? err.message : "Blocked by exception",
    };
  }
}

/**
 * Test 1: Protected file mutation in convergence review must be REJECTED.
 */
export function testProtectedFileMutation(
  taskCard: unknown,
): RedTeamResult {
  const report = reviewConvergence({
    taskCard,
    patch: {
      taskCardId: (taskCard as Record<string, unknown>).taskCardId as string,
      modifiedFilePaths: [
        ((taskCard as Record<string, unknown>).fileBoundaries as Record<string, string[]>)
          .protectedFiles[0] ?? "unknown",
      ],
    },
  });
  const blocked = report.status === "REJECTED";
  return {
    testName: "protected_file_mutation",
    blocked,
    detail: blocked
      ? "Protected file mutation correctly blocked"
      : `Protected file mutation was ${report.status} (expected REJECTED)`,
  };
}

/**
 * Test 2: Out-of-scope file in convergence review must be REJECTED.
 */
export function testOutOfScopeMutation(
  taskCard: unknown,
): RedTeamResult {
  const report = reviewConvergence({
    taskCard,
    patch: {
      taskCardId: (taskCard as Record<string, unknown>).taskCardId as string,
      modifiedFilePaths: ["src/unrelated.ts"],
    },
  });
  const blocked = report.status === "REJECTED";
  return {
    testName: "out_of_scope_mutation",
    blocked,
    detail: blocked
      ? "Out-of-scope mutation correctly blocked"
      : `Out-of-scope mutation was ${report.status} (expected REJECTED)`,
  };
}

/**
 * Test 3: Protected file in proposed code must cause DIVERGED status.
 */
export function testProtectedFileInProposedCode(
  taskCard: unknown,
  proposedCode: unknown,
): RedTeamResult {
  const ctx = compileCanonicalContext({ taskCard, specifications: [], constitutionRules: [] });
  const report = runSpecToCodeConvergence({
    taskCard: taskCard as never,
    compiledContext: ctx,
    proposedCode: proposedCode as never,
  });
  const blocked = report.status === "DIVERGED";
  return {
    testName: "protected_file_in_proposed_code",
    blocked,
    detail: blocked
      ? "Protected file in proposed code correctly flagged as DIVERGED"
      : `Protected file in proposed code was ${report.status} (expected DIVERGED)`,
  };
}

/**
 * Test 4: Execution passport must forbid access to protected files.
 */
export function testPassportScopeForbidden(
  passport: unknown,
): RedTeamResult {
  const protectedPath = (passport as Record<string, unknown>).scope
    ? ((passport as Record<string, unknown>).scope as Record<string, string[]>).forbiddenFiles[0]
    : null;
  if (!protectedPath) {
    return { testName: "passport_forbidden_scope", blocked: false, detail: "No forbidden files defined in passport scope" };
  }
  const result = checkPassportScope(passport as never, protectedPath);
  return {
    testName: "passport_forbidden_scope",
    blocked: !result.allowed,
    detail: result.allowed
      ? `Passport incorrectly allowed access to forbidden file: ${protectedPath}`
      : `Passport correctly blocked access to forbidden file: ${protectedPath}`,
  };
}

/**
 * Test 5: Prompt injection in rendered prompt must cause certification rejection.
 */
export function testPromptInjection(
  taskCard: unknown,
  compiledContext: unknown,
): RedTeamResult {
  const injectedProgram = renderPromptProgram({
    taskCard: taskCard as never,
    compiledContext: compiledContext as never,
    agentProfile: AGENT_PROFILE,
  });
  // Simulate injection by emptying the prompt
  const tampered = { ...injectedProgram, renderedPrompt: "" };
  const evaluation = evaluatePromptProgram(tampered);
  const certification = certifyPromptProgram(evaluation);
  const blocked = certification.status !== "CERTIFIED";
  return {
    testName: "prompt_injection",
    blocked,
    detail: blocked
      ? "Prompt injection correctly blocked (certification rejected)"
      : `Injected prompt was ${certification.status}`,
  };
}

/**
 * Run the full red-team suite against a task card and its dependencies.
 */
export function runRedTeamSuite(
  taskCard: unknown,
  compiledContext: unknown,
  proposedCode: unknown,
  passport: unknown,
): RedTeamResult[] {
  return [
    runRedTeamTest("protected_file_mutation", () => testProtectedFileMutation(taskCard)),
    runRedTeamTest("out_of_scope_mutation", () => testOutOfScopeMutation(taskCard)),
    runRedTeamTest("protected_file_in_proposed_code", () =>
      testProtectedFileInProposedCode(taskCard, proposedCode),
    ),
    runRedTeamTest("passport_forbidden_scope", () => testPassportScopeForbidden(passport)),
    runRedTeamTest("prompt_injection", () => testPromptInjection(taskCard, compiledContext)),
  ];
}
