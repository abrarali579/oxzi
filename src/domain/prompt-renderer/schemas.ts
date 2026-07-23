import { z } from "zod";

import { compiledContextSchema } from "../context-compiler";
import { contentFingerprintSchema } from "../knowledge-graph";
import { taskCardSchema } from "../task-card";

const nonempty = z.string().trim().min(1);
const refs = z.array(nonempty);
const id = <T extends string>(prefix: string) =>
  z
    .string()
    .regex(new RegExp(`^${prefix}_[a-z0-9]+(?:_[a-z0-9]+)*$`))
    .brand<T>();

export const agentProfileIdSchema = id<"RendererAgentProfileId">("agent_profile");
export const renderedPromptProgramIdSchema = id<"RenderedPromptProgramId">("prompt_program");

export const agentProfileSchema = z
  .object({
    id: agentProfileIdSchema,
    name: nonempty,
    capabilities: refs,
    maxTokens: z.number().int().positive(),
    supportedPromptStyles: z.array(z.enum(["agent_optimized", "plain_english"])).min(1),
    supportsArtifacts: z.boolean(),
  })
  .strict();

export const promptProgramSchema = z
  .object({
    programId: renderedPromptProgramIdSchema,
    purpose: nonempty,
    version: z.number().int().positive(),
    rendererVersion: nonempty,
    inputContract: nonempty,
    outputContract: nonempty,
    renderedPrompt: nonempty,
    promptStyle: z.enum(["agent_optimized", "plain_english"]),
    targetAgent: agentProfileSchema,
    targetCompatibility: z.enum(["compatible", "blocked_by_context_window"]),
    taskCard: taskCardSchema,
    compiledContext: compiledContextSchema,
    normalizedMeaningFingerprint: contentFingerprintSchema,
    compiledContextFingerprint: contentFingerprintSchema,
    immutable: z.literal(true),
    fingerprint: contentFingerprintSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (value.normalizedMeaningFingerprint !== value.taskCard.fingerprint) {
      context.addIssue({
        code: "custom",
        path: ["normalizedMeaningFingerprint"],
        message: "Prompt Program cannot change normalized Task Card meaning",
      });
    }
    if (value.compiledContextFingerprint !== value.compiledContext.fingerprint) {
      context.addIssue({
        code: "custom",
        path: ["compiledContextFingerprint"],
        message: "Prompt Program must reference the exact compiled context fingerprint",
      });
    }
    if (!value.targetAgent.supportedPromptStyles.includes(value.promptStyle)) {
      context.addIssue({
        code: "custom",
        path: ["promptStyle"],
        message: "Target agent does not support the selected prompt style",
      });
    }
  });

export type AgentProfile = z.infer<typeof agentProfileSchema>;
export type PromptProgram = z.infer<typeof promptProgramSchema>;
