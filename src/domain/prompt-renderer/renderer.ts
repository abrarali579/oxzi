import { z } from "zod";

import { type CompiledContext, compiledContextSchema } from "../context-compiler";
import { contentFingerprint, stableJson, type JsonValue } from "../knowledge-graph";
import { type TaskCard, taskCardSchema } from "../task-card";
import {
  agentProfileSchema,
  promptProgramSchema,
  renderedPromptProgramIdSchema,
  type AgentProfile,
  type PromptProgram,
} from "./schemas";

export const PROMPT_RENDERER_VERSION = "prompt-renderer-agent-optimized-v1.0.0";

const renderInputSchema = z
  .object({
    taskCard: taskCardSchema,
    compiledContext: compiledContextSchema,
    agentProfile: agentProfileSchema,
    promptStyle: z.enum(["agent_optimized", "plain_english"]).default("agent_optimized"),
  })
  .strict();

const suffix = (value: JsonValue) => contentFingerprint(value).replace("fp_f1_", "");

function promptProgramId(taskCard: TaskCard, context: CompiledContext, agent: AgentProfile) {
  return renderedPromptProgramIdSchema.parse(
    `prompt_program_${suffix({
      taskCard: taskCard.fingerprint,
      context: context.fingerprint,
      agent: agent.id,
      rendererVersion: PROMPT_RENDERER_VERSION,
    })}`,
  );
}

function tokenEstimate(text: string) {
  return Math.ceil(text.length / 4);
}

function calculatePromptProgramFingerprint(program: PromptProgram) {
  const semantic = Object.fromEntries(
    Object.entries(program).filter(([key]) => key !== "fingerprint"),
  ) as JsonValue;
  return contentFingerprint(semantic);
}

function section(title: string, lines: string[]) {
  return [`## ${title}`, ...lines].join("\n");
}

function renderPrompt(
  taskCard: TaskCard,
  context: CompiledContext,
  style: PromptProgram["promptStyle"],
) {
  const concise = style === "agent_optimized";
  const contextLines = context.items.map(
    (item) =>
      `- ${item.artifactKind}:${item.artifactId} (${item.selectionReasons.join(", ")}): ${item.text}`,
  );
  return [
    section("Role", [
      concise
        ? "Execute exactly one approved OXZI Task Card."
        : "You are executing one approved OXZI Task Card. Stay inside its boundaries.",
    ]),
    section("Task", [
      `Task Card: ${taskCard.taskCardId}`,
      `Goal: ${taskCard.goal}`,
      `Risk: ${taskCard.riskLevel}`,
      `Source Slice: ${taskCard.sourceSliceId}@${taskCard.sourceSliceVersion}`,
    ]),
    section("Boundaries", [
      `Writable: ${taskCard.fileBoundaries.writableFiles.join(", ") || "none"}`,
      `Read-only: ${taskCard.fileBoundaries.readOnlyFiles.join(", ") || "none"}`,
      `Protected: ${taskCard.fileBoundaries.protectedFiles.join(", ") || "none"}`,
      `Exclusions: ${taskCard.exclusions.join(", ") || "none"}`,
    ]),
    section(
      "Acceptance",
      taskCard.acceptanceCriteria.map((criterion) => `- ${criterion}`),
    ),
    section(
      "Validation",
      taskCard.validations.map((validation) => `- ${validation.command}`),
    ),
    section("Canonical Context", contextLines.length > 0 ? contextLines : ["- none"]),
    section("Output Contract", [
      "Report changed files, validation results, warnings, deferred work, and recommended commit message.",
      "Do not include tool-call narration or reproduce full files unless explicitly requested.",
    ]),
  ].join("\n\n");
}

export function renderPromptProgram(input: unknown): PromptProgram {
  const { taskCard, compiledContext, agentProfile, promptStyle } = renderInputSchema.parse(input);
  const renderedPrompt = renderPrompt(taskCard, compiledContext, promptStyle);
  const contextCompatible =
    tokenEstimate(renderedPrompt) <= agentProfile.maxTokens
      ? "compatible"
      : "blocked_by_context_window";
  const base = {
    programId: promptProgramId(taskCard, compiledContext, agentProfile),
    purpose: `Execute Task Card ${taskCard.taskCardId}`,
    version: 1,
    rendererVersion: PROMPT_RENDERER_VERSION,
    inputContract: "TaskCard + CompiledContext + AgentProfile",
    outputContract: "Implementation receipt with validation results",
    renderedPrompt,
    promptStyle,
    targetAgent: agentProfile,
    targetCompatibility: contextCompatible,
    taskCard,
    compiledContext,
    normalizedMeaningFingerprint: taskCard.fingerprint,
    compiledContextFingerprint: compiledContext.fingerprint,
    immutable: true as const,
    fingerprint: contentFingerprint({ placeholder: taskCard.taskCardId }),
  };
  return promptProgramSchema.parse({
    ...base,
    fingerprint: calculatePromptProgramFingerprint(base as PromptProgram),
  });
}

export function serializePromptProgram(program: PromptProgram): string {
  return stableJson(promptProgramSchema.parse(program) as unknown as JsonValue);
}
