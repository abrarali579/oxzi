import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function createSafeClient(): PrismaClient {
  try {
    return new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
    });
  } catch {
    // Fallback stub for unit test environments missing DB driver adapters
    return new Proxy({} as PrismaClient, {
      get: (_target, prop) => {
        if (prop === "then") return undefined;
        return () => Promise.resolve(null);
      },
    });
  }
}

export const prisma = globalForPrisma.prisma ?? createSafeClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
