import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { SessionRole } from "@/lib/constants";

export const SESSION_COOKIE_NAME = "kos_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 hari

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET belum diset di environment (.env)");
  return secret;
}

export type SessionPayload = {
  sub: string;
  name: string;
  email: string;
  role: SessionRole;
};

export function signSession(payload: SessionPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: SESSION_MAX_AGE_SECONDS });
}

export function verifySession(token: string): SessionPayload | null {
  try {
    return jwt.verify(token, getJwtSecret()) as SessionPayload;
  } catch {
    return null;
  }
}

export function getSessionCookieOptions() {
  return {
    httpOnly: true as const,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}

export async function getSession(): Promise<SessionPayload | null> {
  const token = cookies().get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySession(token);
}

export async function authenticateOwner(email: string, password: string) {
  const owner = await prisma.owner.findUnique({ where: { email } });
  if (!owner) return null;
  const valid = await bcrypt.compare(password, owner.passwordHash);
  return valid ? owner : null;
}

export async function authenticateTenant(email: string, password: string) {
  const tenant = await prisma.tenant.findUnique({ where: { email } });
  if (!tenant || tenant.status !== "ACTIVE") return null;
  const valid = await bcrypt.compare(password, tenant.passwordHash);
  return valid ? tenant : null;
}
