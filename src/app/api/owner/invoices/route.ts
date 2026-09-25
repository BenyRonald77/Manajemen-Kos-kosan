import { NextResponse } from "next/server";
import { requireOwnerSession } from "@/lib/api-auth";
import { getOwnerInvoices } from "@/lib/kos-service";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireOwnerSession();
  if ("response" in auth) return auth.response;

  const invoices = await getOwnerInvoices(auth.session.sub);
  return NextResponse.json({
    invoices: invoices.map((invoice) => ({
      id: invoice.id,
      period: invoice.period,
      amount: invoice.amount,
      dueDate: invoice.dueDate,
      status: invoice.status,
      tenantName: invoice.tenant.name,
      roomNumber: invoice.tenant.room?.number ?? "—",
    })),
  });
}
