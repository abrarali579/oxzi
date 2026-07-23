import { compare, hash } from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "./db/client";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "oxzi-dev-secret-change-in-production",
);
const COOKIE_NAME = "oxzi_session";
const SALT_ROUNDS = 10;

// ── Password hashing ────────────────────────────────────────────

export async function hashPassword(password: string): Promise<string> {
  return hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hashed: string): Promise<boolean> {
  return compare(password, hashed);
}

// ── JWT tokens ──────────────────────────────────────────────────

export interface SessionPayload {
  userId: string;
  email: string;
  name: string;
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

// ── Cookie / session helpers ────────────────────────────────────

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

// ── Auth guard for API routes ───────────────────────────────────

export class AuthError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "AuthError";
  }
}

export async function requireAuth(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) throw new AuthError("Not authenticated");
  return session;
}

// ── Organization helpers ────────────────────────────────────────

export async function getOrganizationMemberships(userId: string) {
  return prisma.membership.findMany({
    where: { userId },
    include: { organization: true },
  });
}

export async function requireOrganizationAccess(
  userId: string,
  organizationId: string,
  allowedRoles: string[] = ["owner", "admin", "member", "viewer"],
): Promise<{ role: string }> {
  const membership = await prisma.membership.findUnique({
    where: { userId_organizationId: { userId, organizationId } },
  });
  if (!membership) throw new AuthError("Not a member of this organization");
  if (!allowedRoles.includes(membership.role)) throw new AuthError("Insufficient permissions");
  return { role: membership.role };
}

/**
 * Require ADMIN or OWNER role — used for high-risk dispatch approvals.
 */
export async function requireAdminOrOwner(
  userId: string,
  organizationId: string,
): Promise<{ role: string }> {
  return requireOrganizationAccess(userId, organizationId, ["owner", "admin"]);
}
