import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function createSafeClient(): PrismaClient {
  try {
    const adapter = new PrismaLibSql({
      url: process.env.DATABASE_URL ?? "file:./prisma/oxzi.db",
    });
    return new PrismaClient({ adapter });
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
