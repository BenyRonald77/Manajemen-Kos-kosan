import { NextResponse } from "next/server";
import { requireTenantSession } from "@/lib/api-auth";
import { createPaymentForInvoice, PaymentError } from "@/lib/payment-service";

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const auth = await requireTenantSession();
  if ("response" in auth) return auth.response;

  try {
    const result = await createPaymentForInvoice(auth.session.sub, params.id);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof PaymentError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
