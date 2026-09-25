import { NextResponse } from "next/server";
import { requireOwnerSession } from "@/lib/api-auth";
import { getOwnerSummary } from "@/lib/kos-service";

export async function GET() {
  const auth = await requireOwnerSession();
  if ("response" in auth) return auth.response;

  const summary = await getOwnerSummary(auth.session.sub);
  return NextResponse.json(summary);
}
