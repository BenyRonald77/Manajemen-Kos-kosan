import { formatInTimeZone } from "date-fns-tz";
import { prisma } from "@/lib/prisma";
import { InvoiceStatus, TenantStatus } from "@/lib/constants";

function getCurrentPeriod(timezone: string, date: Date = new Date()): string {
  return formatInTimeZone(date, timezone, "yyyy-MM");
}

function getDueDate(daysFromNow: number, timezone: string): Date {
  const due = new Date();
  due.setUTCDate(due.getUTCDate() + daysFromNow);
  // simpan sebagai UTC midnight tanggal jatuh tempo di timezone klinik
  const dueDateStr = formatInTimeZone(due, timezone, "yyyy-MM-dd");
  return new Date(`${dueDateStr}T00:00:00.000Z`);
}

/**
 * Membuat tagihan bulan berjalan untuk semua penghuni aktif. Idempotent:
 * aman dipanggil berkali-kali (constraint unik tenantId+period mencegah
 * duplikasi), sehingga bisa dipicu ulang manual bila cron sempat gagal.
 */
export async function generateMonthlyInvoices() {
  const timezone = process.env.APP_TIMEZONE || "Asia/Jakarta";
  const dueDays = Number(process.env.INVOICE_DUE_DAYS ?? 7);
  const period = getCurrentPeriod(timezone);
  const dueDate = getDueDate(dueDays, timezone);

  const tenants = await prisma.tenant.findMany({
    where: { status: TenantStatus.ACTIVE, roomId: { not: null } },
    include: { room: true },
  });

  let created = 0;
  let skipped = 0;

  for (const tenant of tenants) {
    if (!tenant.room) {
      skipped += 1;
      continue;
    }

    const existing = await prisma.invoice.findUnique({
      where: { tenantId_period: { tenantId: tenant.id, period } },
    });

    if (existing) {
      skipped += 1;
      continue;
    }

    await prisma.invoice.create({
      data: {
        tenantId: tenant.id,
        period,
        amount: tenant.room.monthlyRent,
        dueDate,
        status: InvoiceStatus.UNPAID,
      },
    });
    created += 1;
  }

  return { period, created, skipped, totalActiveTenants: tenants.length };
}
