import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenantSession } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireTenantSession();
  if ("response" in auth) return auth.response;

  const invoices = await prisma.invoice.findMany({
    where: { tenantId: auth.session.sub },
    orderBy: { period: "desc" },
  });

  return NextResponse.json({
    invoices: invoices.map((invoice) => ({
      id: invoice.id,
      period: invoice.period,
      amount: invoice.amount,
      dueDate: invoice.dueDate,
      status: invoice.status,
      paidAt: invoice.paidAt,
    })),
  });
}
