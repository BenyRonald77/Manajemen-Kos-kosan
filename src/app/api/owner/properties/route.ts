import { NextResponse } from "next/server";
import { requireOwnerSession } from "@/lib/api-auth";
import { getOwnerProperties } from "@/lib/kos-service";

export async function GET() {
  const auth = await requireOwnerSession();
  if ("response" in auth) return auth.response;

  const properties = await getOwnerProperties(auth.session.sub);
  return NextResponse.json({ properties });
}
