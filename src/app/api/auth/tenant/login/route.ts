import { NextResponse } from "next/server";
import { z } from "zod";
import {
  authenticateTenant,
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

  const tenant = await authenticateTenant(parsed.data.email, parsed.data.password);
  if (!tenant) {
    return NextResponse.json({ error: "Email atau password salah" }, { status: 401 });
  }

  const token = signSession({
    sub: tenant.id,
    name: tenant.name,
    email: tenant.email,
    role: SessionRole.TENANT,
  });

  const response = NextResponse.json({
    user: { id: tenant.id, name: tenant.name, email: tenant.email, role: SessionRole.TENANT },
  });
  response.cookies.set(SESSION_COOKIE_NAME, token, getSessionCookieOptions());
  return response;
}
