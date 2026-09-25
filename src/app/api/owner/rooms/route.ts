import { NextResponse } from "next/server";
import { z } from "zod";
import { requireOwnerSession } from "@/lib/api-auth";
import { createRoom, getOwnerRooms, KosError } from "@/lib/kos-service";

export async function GET() {
  const auth = await requireOwnerSession();
  if ("response" in auth) return auth.response;

  const rooms = await getOwnerRooms(auth.session.sub);
  return NextResponse.json({
    rooms: rooms.map((room) => ({
      id: room.id,
      number: room.number,
      monthlyRent: room.monthlyRent,
      status: room.status,
      propertyName: room.property.name,
      tenant: room.tenants[0] ?? null,
    })),
  });
}

const schema = z.object({
  propertyId: z.string().min(1),
  number: z.string().min(1).max(20),
  monthlyRent: z.number().int().positive(),
});

export async function POST(request: Request) {
  const auth = await requireOwnerSession();
  if ("response" in auth) return auth.response;

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Data kamar tidak valid" }, { status: 400 });
  }

  try {
    const room = await createRoom(auth.session.sub, parsed.data);
    return NextResponse.json({ room });
  } catch (error) {
    if (error instanceof KosError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
