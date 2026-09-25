import { NextResponse } from "next/server";
import { generateMonthlyInvoices } from "@/lib/invoice-service";

export const dynamic = "force-dynamic";

/**
 * Dipicu oleh scheduler eksternal (cron-job.org, GitHub Actions scheduled
 * workflow, dll) setiap awal bulan. Dilindungi token rahasia CRON_SECRET
 * (bukan sesi login) karena pemanggilnya adalah mesin, bukan pengguna.
 */
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  const provided = request.headers.get("x-cron-secret");

  if (!secret || provided !== secret) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 401 });
  }

  const result = await generateMonthlyInvoices();
  return NextResponse.json(result);
}
