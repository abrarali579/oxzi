/**
 * Standardized API response schemas for all OXZI endpoints.
 */
import { z } from "zod";

// ── Standard API Response ───────────────────────────────────────

export const apiSuccessSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    data: dataSchema,
  });

export const apiErrorSchema = z.object({
  success: z.literal(false),
  error: z.string(),
});

export type ApiError = z.infer<typeof apiErrorSchema>;

/**
 * Wrap a successful response payload.
 */
export function apiSuccess<T>(data: T): { success: true; data: T } {
  return { success: true, data };
}

/**
 * Wrap an error response.
 */
export function apiError(error: string): { success: false; error: string } {
  return { success: false, error };
}
