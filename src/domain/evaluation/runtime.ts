import { z } from "zod";
import { contentFingerprint } from "../knowledge-graph";
import { promptProgramSchema, renderedPromptProgramIdSchema } from "../prompt-renderer";
import {
  promptCertificationIdSchema,
  promptEvaluationReportSchema,
  promptEvaluationAssertionSchema,
  type PromptEvaluationReport,
} from "./schemas";

const requiredPromptSections = [
  "## Role",
  "## Task",
  "## Boundaries",
  "## Acceptance",
  "## Validation",
  "## Canonical Context",
  "## Output Contract",
];

function tokenEstimate(prompt: string): number {
  return Math.max(0, Math.ceil(prompt.length / 4));
}

function createAssertion(
  ruleId: string,
  passed: boolean,
  message: string,
  hardGate: boolean,
): z.infer<typeof promptEvaluationAssertionSchema> {
  return promptEvaluationAssertionSchema.parse({
    ruleId,
    passed,
    hardGate,
    message,
    evaluatorRef: "deterministic:prompt_evaluator",
  });
}

function normalizePromptProgramInput(input: unknown) {
  const parsed = promptProgramSchema.safeParse(input);
  const fallbackProgramId = renderedPromptProgramIdSchema.parse(
    "prompt_program_invalid_000000000000",
  );

  const inputRecord =
    typeof input === "object" && input !== null ? (input as Record<string, unknown>) : {};

  const programId = parsed.success
    ? parsed.data.programId
    : typeof inputRecord.programId === "string" &&
        renderedPromptProgramIdSchema.safeParse(inputRecord.programId).success
      ? inputRecord.programId
      : fallbackProgramId;

  const renderedPrompt =
    typeof inputRecord.renderedPrompt === "string" ? inputRecord.renderedPrompt : "";
  const inputContract =
    typeof inputRecord.inputContract === "string" ? inputRecord.inputContract : "";
  const outputContract =
    typeof inputRecord.outputContract === "string" ? inputRecord.outputContract : "";
  const targetAgentRecord =
    typeof inputRecord.targetAgent === "object" && inputRecord.targetAgent !== null
      ? (inputRecord.targetAgent as Record<string, unknown>)
      : {};
  const maxTokens =
    typeof targetAgentRecord.maxTokens === "number" ? targetAgentRecord.maxTokens : 0;

  return { programId, renderedPrompt, inputContract, outputContract, maxTokens };
}

export function evaluatePromptProgram(input: unknown) {
  const { programId, renderedPrompt, inputContract, outputContract, maxTokens } =
    normalizePromptProgramInput(input);

  const promptPresenceAssertion = createAssertion(
    "assertion_rendered_prompt_presence",
    Boolean(renderedPrompt.trim()),
    renderedPrompt.trim() ? "Rendered prompt is present" : "Rendered prompt is missing or empty",
    true,
  );

  const sectionFailures = requiredPromptSections.filter(
    (section) => !renderedPrompt.includes(section),
  );
  const promptStructureAssertion = createAssertion(
    "assertion_prompt_structure",
    sectionFailures.length === 0,
    sectionFailures.length === 0
      ? "Rendered prompt includes all required prompt sections"
      : `Missing required prompt sections: ${sectionFailures.join(", ")}`,
    true,
  );

  const tokenCount = tokenEstimate(renderedPrompt);
  const tokenSizingAssertion = createAssertion(
    "assertion_token_sizing",
    maxTokens > 0 && tokenCount <= maxTokens,
    maxTokens > 0
      ? tokenCount <= maxTokens
        ? `Prompt fits within target agent maximum tokens (${tokenCount}/${maxTokens})`
        : `Prompt exceeds target agent maximum tokens (${tokenCount}/${maxTokens})`
      : "Target agent token limit is missing or invalid",
    true,
  );

  const inputContractPresenceAssertion = createAssertion(
    "assertion_input_contract_presence",
    Boolean(inputContract.trim()),
    inputContract.trim() ? "Input contract is present" : "Input contract is missing or empty",
    true,
  );

  const outputContractPresenceAssertion = createAssertion(
    "assertion_output_contract_presence",
    Boolean(outputContract.trim()),
    outputContract.trim() ? "Output contract is present" : "Output contract is missing or empty",
    true,
  );

  const schemaParseResult = promptProgramSchema.safeParse(input);
  const programSchemaAssertion = createAssertion(
    "assertion_program_zod_schema",
    schemaParseResult.success,
    schemaParseResult.success
      ? "Prompt Program validates against its Zod schema contract"
      : `Prompt Program failed Zod schema validation: ${schemaParseResult.error?.issues.map((issue) => issue.message).join(", ")}`,
    true,
  );

  const assertions = [
    promptPresenceAssertion,
    promptStructureAssertion,
    tokenSizingAssertion,
    inputContractPresenceAssertion,
    outputContractPresenceAssertion,
    programSchemaAssertion,
  ];

  const totalFailed = assertions.filter((assertion) => !assertion.passed).length;
  const totalPassed = assertions.length - totalFailed;

  return promptEvaluationReportSchema.parse({
    targetProgramId: programId,
    timestamp: new Date().toISOString(),
    assertions,
    totalPassed,
    totalFailed,
  });
}

export function certifyPromptProgram(report: PromptEvaluationReport) {
  const failedHardGates = report.assertions.some(
    (assertion: PromptEvaluationReport["assertions"][number]) =>
      assertion.hardGate && !assertion.passed,
  );
  const status = failedHardGates ? "REJECTED" : ("CERTIFIED" as const);
  const reason = failedHardGates
    ? `Certification rejected because ${report.totalFailed} prompt evaluation assertion(s) failed.`
    : "Certification passed because all deterministic prompt evaluation assertions succeeded.";

  const certificationId = promptCertificationIdSchema.parse(
    `prompt_cert_${contentFingerprint({
      programId: report.targetProgramId,
      timestamp: report.timestamp,
    }).replace("fp_f1_", "")}`,
  );

  return {
    certificationId,
    programId: report.targetProgramId,
    status,
    reason,
  } as const;
}
