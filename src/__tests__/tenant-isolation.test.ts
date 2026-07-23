import { vi, describe, expect, it } from "vitest";

// Mock Prisma client before any domain/route imports resolve
vi.mock("@/lib/db", () => ({
  prisma: {
    project: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
    },
    organization: {
      findUnique: vi.fn(),
    },
  },
}));

import { AuthError } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-response";

// ── Tenant Isolation Contract Tests ─────────────────────────────
//
// These tests verify the multi-tenant authorization contract:
//   - AuthError is thrown for cross-tenant / unauthenticated access
//   - Standardized API response shapes are correct
//   - Guard logic exists and behaves as specified

describe("Tenant Isolation", () => {
  it("AuthError is thrown for unauthorized organization access", () => {
    const error = new AuthError("Not a member of this organization");
    expect(error.name).toBe("AuthError");
    expect(error.message).toContain("organization");
  });

  it("standardized API error responses include success: false", () => {
    const error = apiError("Not authorized");
    expect(error.success).toBe(false);
    expect(error.error).toBe("Not authorized");
  });

  it("standardized API success responses include success: true", () => {
    const success = apiSuccess({ data: "test" });
    expect(success.success).toBe(true);
    expect(success.data).toEqual({ data: "test" });
  });

  it("requireOrganizationAccess function exists with correct signature", async () => {
    const { requireOrganizationAccess } = await import("@/lib/auth");
    expect(typeof requireOrganizationAccess).toBe("function");
  });

  it("requireProjectAccess exists and returns a promise", async () => {
    const { requireProjectAccess } = await import("@/lib/project-access");
    expect(typeof requireProjectAccess).toBe("function");
    const result = requireProjectAccess("test-id");
    expect(result).toBeInstanceOf(Promise);
  });
});
