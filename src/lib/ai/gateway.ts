/**
 * OXZI Provider Gateway
 *
 * Simulates an AI provider call with configurable temperature.
 * In production this would route through a provider-neutral adapter
 * to OpenAI, Anthropic, or other LLM providers.
 *
 * The gateway accepts a system prompt + user message and returns
 * a structured text response. Temperature=0 ensures deterministic
 * output ideal for repair/validation tasks.
 */

export interface GatewayConfig {
  provider: string;
  model: string;
  temperature: number;
  maxTokens: number;
}

export interface GatewayRequest {
  systemPrompt: string;
  userMessage: string;
  temperature?: number;
}

export interface GatewayResponse {
  content: string;
  model: string;
  provider: string;
  temperature: number;
  latencyMs: number;
}

const DEFAULT_CONFIG: GatewayConfig = {
  provider: "simulated",
  model: "oxzi-deterministic-v1",
  temperature: 0,
  maxTokens: 4096,
};

/**
 * Call the AI provider gateway.
 *
 * When temperature is 0 (default for repair), applies deterministic
 * correction patterns to the user message content. At higher temperatures
 * would return varied responses — but for OXZI's repair pipeline we
 * always use temperature=0 for stability.
 *
 * @param request - The gateway request with system prompt and user message
 * @param config - Optional gateway configuration
 * @returns A gateway response with the generated content
 */
export function callGateway(
  request: GatewayRequest,
  config?: Partial<GatewayConfig>,
): GatewayResponse {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const temperature = request.temperature ?? cfg.temperature;
  const startTime = Date.now();

  // Simulate a deterministic model response
  // At temperature=0 we return consistent, predictable output
  const content = generateDeterministicResponse(request.systemPrompt, request.userMessage, temperature);

  return {
    content,
    model: cfg.model,
    provider: cfg.provider,
    temperature,
    latencyMs: Date.now() - startTime,
  };
}

/**
 * Generate a deterministic response based on the system prompt and user message.
 * At temperature=0 this follows fixed correction rules.
 * At temperature>0 it would add controlled variation — but OXZI always uses 0.
 */
function generateDeterministicResponse(
  _systemPrompt: string,
  userMessage: string,
  temperature: number,
): string {
  // For repair tasks, extract the original output from the user message
  const originalMatch = userMessage.match(/```\n?([\s\S]*?)```/);
  const originalOutput = originalMatch?.[1]?.trim() ?? userMessage;

  // Extract validation errors from the user message
  const errorMatches = userMessage.matchAll(/(\d+)\.\s+\[([^\]]+)\]\s+(\S+):\s+(.+)/g);
  const errors: { path: string; code: string; message: string }[] = [];

  for (const match of errorMatches) {
    errors.push({
      path: match[2]!,
      code: match[3]!,
      message: match[4]!,
    });
  }

  // Apply deterministic fixes
  let corrected = originalOutput;
  const appliedFixes: string[] = [];

  for (const error of errors) {
    const path = error.path;

    // Fix 1: Empty required strings
    if (error.code === "too_small" && corrected.includes(`"${path}": ""`)) {
      corrected = corrected.replace(`"${path}": ""`, `"${path}": "repaired"`);
      appliedFixes.push(`filled_empty_string:${path}`);
    }

    // Fix 2: Invalid enum values
    if (error.code === "invalid_enum_value") {
      const expectedMatch = error.message.match(/expected '([^']+)'/);
      if (expectedMatch?.[1]) {
        corrected = corrected.replace(
          new RegExp(`"${escapeRegex(path)}":\\s*"[^"]*"`),
          `"${path}": "${expectedMatch[1]}"`,
        );
        appliedFixes.push(`fixed_enum:${path}`);
      }
    }

    // Fix 3: Missing required fields - add with placeholder
    if (error.code === "invalid_type" && error.message.includes("required")) {
      const fieldName = path.split(".").pop() ?? path;
      const parentPath = path.split(".").slice(0, -1).join(".");
      if (parentPath) {
        const parentRegex = new RegExp(`"${escapeRegex(parentPath)}":\\s*\\{`);
        corrected = corrected.replace(
          parentRegex,
          `"${parentPath}": { "${fieldName}": "repaired",`,
        );
        appliedFixes.push(`added_missing_field:${path}`);
      }
    }

    // Fix 4: Wrap bare string in expected object
    if (error.code === "invalid_type" && error.message.includes("expected object")) {
      corrected = corrected.replace(
        new RegExp(`"${escapeRegex(path)}":\\s*"[^"]*"`),
        `"${path}": {}`,
      );
      appliedFixes.push(`wrapped_in_object:${path}`);
    }
  }

  // At temperature > 0 we'd add slight variation, but for OXZI we stay deterministic
  if (temperature > 0 && appliedFixes.length === 0) {
    // Simulate slight rewording for non-repair tasks
    corrected = corrected.replace(/^(# .+)$/m, "# Optimized $1");
  }

  return corrected;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
