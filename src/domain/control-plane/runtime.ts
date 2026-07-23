/**
 * Agent Control Plane & Execution Passport Runtime (Step 10)
 *
 * Issues, verifies, and enforces immutable ExecutionPassports that act
 * as strict authorization contracts for executing agents.
 *
 * Pipeline:
 *   TaskCard + Certified Prompt Program + Target Agent Profile
 *   → Policy Authorization Check
 *   → Execution Passport Generation (scope, limits, TTL)
 *   → Cryptographic Hash Signing
 *   → Passport Verification Engine
 *   → Passport Output (ACTIVE | REVOKED | EXPIRED)
 */
import { contentFingerprint, type JsonValue } from "../knowledge-graph";
import { taskCardSchema, type TaskCard } from "../task-card";
import { promptCertificationSchema, type PromptCertification } from "../evaluation";
import { agentProfileSchema, type AgentProfile } from "../prompt-renderer";
import {
  executionPassportSchema,
  passportVerificationResultSchema,
  controlPlanePassportIdSchema,
  type ExecutionPassport,
  type PassportVerificationResult,
} from "./schemas";

// ── Constants ──────────────────────────────────────────────────

/** Default passport TTL: 30 minutes. */
const DEFAULT_TTL_MS = 30 * 60 * 1000;

/** Tokens per dollar budget — conservative estimate for safety. */
const DEFAULT_MAX_TOKENS = 100_000;

// ── Error Types ────────────────────────────────────────────────

export class PassportIssuanceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PassportIssuanceError";
  }
}

export class PassportRevocationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PassportRevocationError";
  }
}

// ── Step 1: Policy Authorization Check ─────────────────────────

/**
 * Verify that the agent profile has the capabilities required for
 * the Task Card's risk level. Returns a list of policy violations.
 */
function checkPolicyAuthorization(
  taskCard: TaskCard,
  agentProfile: AgentProfile,
): string[] {
  const violations: string[] = [];

  // High-risk tasks require agent capability verification
  if (taskCard.riskLevel === "high" || taskCard.riskLevel === "medium") {
    const requiredCaps = ["patch_edits", "shell_validation"];
    for (const cap of requiredCaps) {
      if (!agentProfile.capabilities.includes(cap)) {
        violations.push(
          `Agent "${agentProfile.name}" lacks required capability "${cap}" for risk level "${taskCard.riskLevel}".`,
        );
      }
    }
  }

  // Check token budget
  if (agentProfile.maxTokens < 5000) {
    violations.push(
      `Agent max tokens (${agentProfile.maxTokens}) is below minimum threshold (5000) for execution.`,
    );
  }

  return violations;
}

// ── Step 2: Scope Resolution ───────────────────────────────────

function resolveScope(taskCard: TaskCard): {
  writableFiles: string[];
  readOnlyFiles: string[];
  forbiddenFiles: string[];
} {
  return {
    writableFiles: [...taskCard.fileBoundaries.writableFiles],
    readOnlyFiles: [...taskCard.fileBoundaries.readOnlyFiles],
    forbiddenFiles: [...taskCard.fileBoundaries.protectedFiles],
  };
}

// ── Step 3: Passport Signing ───────────────────────────────────

function signPassport(payload: Record<string, JsonValue>): string {
  return contentFingerprint(payload as unknown as JsonValue);
}

// ── Public API ─────────────────────────────────────────────────

/**
 * Issue an Execution Passport for a certified prompt program.
 *
 * @param certification - A PromptCertification with status CERTIFIED
 * @param taskCard - The Task Card defining execution scope and boundaries
 * @param agentProfile - The agent profile with capabilities and budget
 * @param options - Optional TTL and issued-at overrides
 * @returns An immutable ExecutionPassport with ACTIVE status
 * @throws PassportIssuanceError if certification is not CERTIFIED or
 *         policy authorization fails
 */
export function issueExecutionPassport(
  certification: PromptCertification,
  taskCard: TaskCard,
  agentProfile: AgentProfile,
  options?: { issuedAt?: string; ttlMs?: number },
): ExecutionPassport {
  const parsedCert = promptCertificationSchema.parse(certification);

  // Prerequisite gate: only CERTIFIED programs qualify
  if (parsedCert.status !== "CERTIFIED") {
    throw new PassportIssuanceError(
      `Cannot issue passport: prompt certification status is "${parsedCert.status}". Only CERTIFIED programs qualify for execution.`,
    );
  }

  const parsedTaskCard = taskCardSchema.parse(taskCard);
  const parsedAgent = agentProfileSchema.parse(agentProfile);

  // Policy authorization check
  const policyViolations = checkPolicyAuthorization(parsedTaskCard, parsedAgent);
  if (policyViolations.length > 0) {
    throw new PassportIssuanceError(
      `Policy authorization failed:\n${policyViolations.join("\n")}`,
    );
  }

  const issuedAt = options?.issuedAt ?? new Date().toISOString();
  const ttlMs = options?.ttlMs ?? DEFAULT_TTL_MS;
  const issuedTime = new Date(issuedAt).getTime();
  const expiresAt = new Date(issuedTime + ttlMs).toISOString();
  const scope = resolveScope(parsedTaskCard);
  const limits = {
    maxTokens: parsedAgent.maxTokens ?? DEFAULT_MAX_TOKENS,
    maxTimeMs: ttlMs,
  };

  // Build signing payload — all fields that must be immutable
  const signingPayload = {
    certificationId: parsedCert.certificationId,
    programId: parsedCert.programId,
    taskCardId: parsedTaskCard.taskCardId,
    agentId: parsedAgent.id,
    scope,
    limits,
    issuedAt,
    expiresAt,
  };

  const signature = signPassport(signingPayload);
  const passportId = controlPlanePassportIdSchema.parse(
    `cp_passport_${signature.replace("fp_f1_", "").slice(0, 16)}`,
  );

  return executionPassportSchema.parse({
    passportId,
    certificationId: parsedCert.certificationId,
    programId: parsedCert.programId,
    taskCardId: parsedTaskCard.taskCardId,
    agentId: parsedAgent.id,
    scope,
    limits,
    issuedAt,
    expiresAt,
    status: "ACTIVE",
    signature,
  });
}

/**
 * Verify an Execution Passport's integrity, expiration, and scope.
 *
 * @param passport - The passport to verify
 * @returns A PassportVerificationResult indicating validity and reason
 */
export function verifyPassportValidity(
  passport: ExecutionPassport,
): PassportVerificationResult {
  try {
    const parsed = executionPassportSchema.parse(passport);

    // 1. Check expiration
    if (parsed.status !== "ACTIVE") {
      return passportVerificationResultSchema.parse({
        valid: false,
        reason: `Passport status is "${parsed.status}", not ACTIVE.`,
        passport: parsed,
      });
    }

    const now = Date.now();
    const expiresAt = new Date(parsed.expiresAt).getTime();
    if (now > expiresAt) {
      return passportVerificationResultSchema.parse({
        valid: false,
        reason: "Passport has expired.",
        passport: parsed,
      });
    }

    // 2. Verify signature integrity (tamper detection)
    const expectedSignature = signPassport({
      certificationId: parsed.certificationId,
      programId: parsed.programId,
      taskCardId: parsed.taskCardId,
      agentId: parsed.agentId,
      scope: parsed.scope,
      limits: parsed.limits,
      issuedAt: parsed.issuedAt,
      expiresAt: parsed.expiresAt,
    });

    if (parsed.signature !== expectedSignature) {
      return passportVerificationResultSchema.parse({
        valid: false,
        reason: "Passport signature mismatch — the passport has been tampered with.",
        passport: parsed,
      });
    }

    // 3. All checks passed
    return passportVerificationResultSchema.parse({
      valid: true,
      reason: null,
      passport: parsed,
    });
  } catch {
    return passportVerificationResultSchema.parse({
      valid: false,
      reason: "Passport schema validation failed — malformed passport data.",
      passport: null,
    });
  }
}

/**
 * Check whether a specific file action is permitted by the passport.
 * Used to enforce scope during agent execution.
 */
export function checkPassportScope(
  passport: ExecutionPassport,
  filePath: string,
): {
  allowed: boolean;
  reason: string | null;
} {
  const parsed = executionPassportSchema.parse(passport);

  if (parsed.scope.forbiddenFiles.includes(filePath)) {
    return {
      allowed: false,
      reason: `File "${filePath}" is in the forbidden scope of this passport.`,
    };
  }

  if (parsed.scope.writableFiles.includes(filePath)) {
    return { allowed: true, reason: null };
  }

  if (parsed.scope.readOnlyFiles.includes(filePath)) {
    return {
      allowed: false,
      reason: `File "${filePath}" is read-only per this passport's scope.`,
    };
  }

  return {
    allowed: false,
    reason: `File "${filePath}" is outside the passport's defined scope.`,
  };
}

/**
 * Revoke an active passport, typically because the agent exceeded
 * boundaries or the task was cancelled.
 */
export function revokePassport(passport: ExecutionPassport): ExecutionPassport {
  const parsed = executionPassportSchema.parse(passport);
  if (parsed.status === "REVOKED") {
    throw new PassportRevocationError("Passport is already revoked.");
  }
  return executionPassportSchema.parse({
    ...parsed,
    status: "REVOKED",
  });
}
