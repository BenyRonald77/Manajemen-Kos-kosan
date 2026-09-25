import { generateMonthlyInvoices } from "../src/lib/invoice-service";
import { prisma } from "../src/lib/prisma";

async function main() {
  const result = await generateMonthlyInvoices();
  console.log(
    `Periode ${result.period}: ${result.created} tagihan baru dibuat, ${result.skipped} dilewati (sudah ada/tidak aktif) dari ${result.totalActiveTenants} penghuni aktif.`,
  );
}

main()
  .catch((error) => {
    console.error("Gagal membuat tagihan bulanan:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
