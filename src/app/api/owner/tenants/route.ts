import { NextResponse } from "next/server";
import { z } from "zod";
import { requireOwnerSession } from "@/lib/api-auth";
import { createTenant, getOwnerTenants, KosError } from "@/lib/kos-service";

export async function GET() {
  const auth = await requireOwnerSession();
  if ("response" in auth) return auth.response;

  const tenants = await getOwnerTenants(auth.session.sub);
  return NextResponse.json({
    tenants: tenants.map((tenant) => ({
      id: tenant.id,
      name: tenant.name,
      email: tenant.email,
      phone: tenant.phone,
      status: tenant.status,
      roomNumber: tenant.room?.number ?? null,
      propertyName: tenant.room?.property.name ?? null,
    })),
  });
}

const schema = z.object({
  roomId: z.string().min(1),
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(6),
  phone: z.string().min(8).max(20),
});

export async function POST(request: Request) {
  const auth = await requireOwnerSession();
  if ("response" in auth) return auth.response;

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Data penghuni tidak valid" }, { status: 400 });
  }

  try {
    const tenant = await createTenant(auth.session.sub, parsed.data);
    return NextResponse.json({ tenant: { id: tenant.id, name: tenant.name } });
  } catch (error) {
    if (error instanceof KosError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
