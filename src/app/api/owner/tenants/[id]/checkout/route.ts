import { NextResponse } from "next/server";
import { requireOwnerSession } from "@/lib/api-auth";
import { checkoutTenant, KosError } from "@/lib/kos-service";

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const auth = await requireOwnerSession();
  if ("response" in auth) return auth.response;

  try {
    const tenant = await checkoutTenant(auth.session.sub, params.id);
    return NextResponse.json({ tenant: { id: tenant.id, status: tenant.status } });
  } catch (error) {
    if (error instanceof KosError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
