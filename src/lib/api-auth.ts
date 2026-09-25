import { NextResponse } from "next/server";
import { getSession, type SessionPayload } from "@/lib/auth";
import { SessionRole } from "@/lib/constants";

type Result = { session: SessionPayload } | { response: NextResponse };

async function requireRole(role: SessionRole): Promise<Result> {
  const session = await getSession();
  if (!session || session.role !== role) {
    return { response: NextResponse.json({ error: "Belum login" }, { status: 401 }) };
  }
  return { session };
}

export function requireOwnerSession() {
  return requireRole(SessionRole.OWNER);
}

export function requireTenantSession() {
  return requireRole(SessionRole.TENANT);
}
