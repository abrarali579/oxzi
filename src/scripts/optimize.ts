#!/usr/bin/env npx tsx
/**
 * OXZI Prompt Program Optimizer — CLI
 *
 * Usage: npm run optimize
 *
 * Loads the Oxzire fixture, renders a Prompt Program, runs the optimization
 * cycle, and reports results.
 */

import { renderPromptProgram } from "../domain/prompt-renderer";
import { compileCanonicalContext } from "../domain/context-compiler";
import { compileTaskCard } from "../domain/task-card";
import { approvedImplementationSlice } from "../domain/planning";
import { implementationReadySpecificationFixture } from "../domain/governance";
import {
  runOptimizationCycle,
  defaultTestSuite,
} from "../domain/prompt-programs";

const constitutionRules = implementationReadySpecificationFixture.constitutionRules.map(
  (r: { rule: unknown }) => r.rule,
);

const taskCardResult = compileTaskCard({
  slice: approvedImplementationSlice,
  constitutionRules,
});

if (!taskCardResult.taskCard) {
  console.error("ERROR: Failed to compile Task Card from fixture.");
  process.exit(1);
}

const compiledContext = compileCanonicalContext({
  taskCard: taskCardResult.taskCard,
  specifications: [implementationReadySpecificationFixture.specification],
  constitutionRules,
});

const agentProfile = {
  id: "agent_profile_codex" as const,
  name: "Codex",
  capabilities: ["patch_edits", "shell_validation", "artifact_reports"],
  maxTokens: 20000,
  supportedPromptStyles: ["agent_optimized" as const],
  supportsArtifacts: true,
};

console.log(" Rendering baseline Prompt Program...");
const program = renderPromptProgram({
  taskCard: taskCardResult.taskCard,
  compiledContext,
  agentProfile,
});
console.log(`  Program ID: ${program.programId}`);
console.log(`  Baseline tokens: ${Math.floor(program.renderedPrompt.length / 4)}`);

console.log("\n Generating optimization candidates...");
const report = runOptimizationCycle(program, defaultTestSuite());

console.log(`\n╔══════════════════════════════════════════════╗`);
console.log(`║         Optimization Cycle Results          ║`);
console.log(`╚══════════════════════════════════════════════╝`);
console.log(` Total candidates: ${report.summary.totalCandidates}`);
console.log(` Promoted:         ${report.summary.promoted}`);
console.log(` Rejected:         ${report.summary.rejected}`);
console.log(` Best token saving: ${report.summary.bestTokenSavingsPercent.toFixed(1)}%`);
console.log("");

for (let i = 0; i < report.experiments.length; i++) {
  const { experiment, result } = report.experiments[i]!;
  const decision = report.decisions[i]!;
  console.log(`── Candidate #${i + 1}: ${experiment.candidateId}`);
  console.log(`   Baseline tokens:    ${result.baselineTokens}`);
  console.log(`   Candidate tokens:   ${result.candidateTokens}`);
  console.log(`   Token savings:      ${result.tokenSavingsPercent.toFixed(1)}%`);
  console.log(`   Baseline pass rate: ${(result.baselineAssertionPassRate * 100).toFixed(0)}%`);
  console.log(`   Candidate pass rate:${(result.candidateAssertionPassRate * 100).toFixed(0)}%`);
  console.log(`   Quality maintained: ${result.qualityMaintained}`);
  console.log(`   Decision:           ${decision.decision}`);
  console.log("");
}

if (report.summary.promoted > 0) {
  console.log("✅ At least one candidate promoted with verified token reduction!");
} else {
  console.log("ℹ️  No candidate met the promotion gate (quality >= baseline + tokens -10%).");
}

process.exit(0);
