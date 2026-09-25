import { NextResponse } from "next/server";
import { handleMidtransNotification, PaymentError } from "@/lib/payment-service";

export const dynamic = "force-dynamic";

/** Endpoint publik yang dipanggil server Midtrans, bukan pengguna — diamankan lewat verifikasi signature_key. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!body?.order_id || !body?.signature_key) {
    return NextResponse.json({ error: "Payload tidak valid" }, { status: 400 });
  }

  try {
    await handleMidtransNotification(body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof PaymentError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
