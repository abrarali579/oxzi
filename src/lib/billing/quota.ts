/**
 * Organization quota and billing guardrails for Step 13.
 * Provides deterministic usage checks before issuing Execution Passports.
 */
import {
  organizationQuotaSchema,
  type OrganizationQuota,
} from "@/domain/agent-delivery/schemas";

/**
 * Create a default quota for an organization billing period.
 */
export function createQuota(
  organizationId: string,
  tokenLimit = 1_000_000,
  passportLimit = 100,
): OrganizationQuota {
  const now = new Date();
  const periodStart = now.toISOString();
  const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

  return organizationQuotaSchema.parse({
    organizationId,
    tokensUsed: 0,
    tokenLimit,
    passportsIssued: 0,
    passportLimit,
    periodStart,
    periodEnd,
  });
}

/**
 * Check whether issuing a new passport would exceed the org's quota.
 * Returns { allowed, reason } — never calls external APIs.
 */
export function checkQuota(
  quota: OrganizationQuota,
  estimatedTokens: number,
): { allowed: boolean; reason: string | null } {
  if (quota.passportsIssued >= quota.passportLimit) {
    return {
      allowed: false,
      reason: `Organization ${quota.organizationId} has reached its passport limit (${quota.passportLimit}/${quota.passportLimit}).`,
    };
  }

  if (quota.tokensUsed + estimatedTokens > quota.tokenLimit) {
    return {
      allowed: false,
      reason: `Organization ${quota.organizationId} would exceed token limit (${quota.tokensUsed} + ${estimatedTokens} > ${quota.tokenLimit}).`,
    };
  }

  return { allowed: true, reason: null };
}

/**
 * Record a passport issuance against the quota.
 */
export function consumeQuota(
  quota: OrganizationQuota,
  tokensConsumed: number,
): OrganizationQuota {
  return organizationQuotaSchema.parse({
    ...quota,
    tokensUsed: quota.tokensUsed + tokensConsumed,
    passportsIssued: quota.passportsIssued + 1,
  });
}

/**
 * Serialize a quota for storage/display.
 */
export function serializeQuota(quota: OrganizationQuota): string {
  return JSON.stringify(quota);
}
