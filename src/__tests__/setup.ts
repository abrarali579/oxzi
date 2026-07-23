import { vi } from "vitest";

/**
 * Mock next/headers to prevent "cookies was called outside a request scope"
 * errors in tests that transitively import auth helpers.
 */
vi.mock("next/headers", () => ({
  cookies: vi.fn(() => ({
    get: vi.fn(() => undefined),
    set: vi.fn(),
    delete: vi.fn(),
  })),
}));

/**
 * Global mock for @prisma/client to prevent
 * PrismaClientConstructorValidationError in test environments
 * where no provider adapter (e.g. libsql) is installed.
 */
vi.mock("@prisma/client", () => {
  const mockFns = () => vi.fn();
  return {
    PrismaClient: class MockPrismaClient {
      project = {
        findUnique: mockFns(),
        findMany: mockFns(),
        create: mockFns(),
        update: mockFns(),
        delete: mockFns(),
      };
      organization = {
        findUnique: mockFns(),
        findMany: mockFns(),
      };
      membership = {
        findUnique: mockFns(),
        findMany: mockFns(),
      };
      subscription = {
        findUnique: mockFns(),
      };
      $connect = mockFns();
      $disconnect = mockFns();
    },
  };
});
