import { NextResponse } from "next/server";
import { z } from "zod";
import {
  authenticateOwner,
  getSessionCookieOptions,
  SESSION_COOKIE_NAME,
  signSession,
} from "@/lib/auth";
import { SessionRole } from "@/lib/constants";

const schema = z.object({ email: z.string().email(), password: z.string().min(1) });

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Email/password tidak valid" }, { status: 400 });
  }

  const owner = await authenticateOwner(parsed.data.email, parsed.data.password);
  if (!owner) {
    return NextResponse.json({ error: "Email atau password salah" }, { status: 401 });
  }

  const token = signSession({
    sub: owner.id,
    name: owner.name,
    email: owner.email,
    role: SessionRole.OWNER,
  });

  const response = NextResponse.json({
    user: { id: owner.id, name: owner.name, email: owner.email, role: SessionRole.OWNER },
  });
  response.cookies.set(SESSION_COOKIE_NAME, token, getSessionCookieOptions());
  return response;
}
