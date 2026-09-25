"use client";

import Script from "next/script";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTenantGuard } from "@/lib/use-tenant-guard";

type Invoice = {
  id: string;
  period: string;
  amount: number;
  dueDate: string;
  status: "UNPAID" | "PAID" | "EXPIRED";
  paidAt: string | null;
};

const statusLabel: Record<Invoice["status"], string> = {
  UNPAID: "Belum Bayar",
  PAID: "Lunas",
  EXPIRED: "Kedaluwarsa",
};

const statusStyle: Record<Invoice["status"], string> = {
  UNPAID: "bg-amber-100 text-amber-700",
  PAID: "bg-brand-100 text-brand-700",
  EXPIRED: "bg-rose-100 text-rose-700",
};

function formatRupiah(amount: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(amount);
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

const snapUrl =
  process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION === "true"
    ? "https://app.midtrans.com/snap/snap.js"
    : "https://app.sandbox.midtrans.com/snap/snap.js";

export default function TenantDashboardPage() {
  const { me, checking } = useTenantGuard();
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadInvoices = useCallback(async () => {
    const res = await fetch("/api/tenant/invoices");
    if (res.ok) setInvoices((await res.json()).invoices);
  }, []);

  useEffect(() => {
    if (me) loadInvoices();
  }, [me, loadInvoices]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  async function handlePay(invoiceId: string) {
    setError(null);
    setPayingId(invoiceId);
    try {
      const res = await fetch(`/api/tenant/invoices/${invoiceId}/pay`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Gagal membuat transaksi pembayaran");
        return;
      }
      if (!window.snap) {
        setError("Snap.js belum siap, coba lagi sesaat lagi");
        return;
      }
      window.snap.pay(data.token, {
        onSuccess: () => loadInvoices(),
        onPending: () => loadInvoices(),
        onClose: () => loadInvoices(),
      });
    } catch {
      setError("Terjadi kesalahan jaringan");
    } finally {
      setPayingId(null);
    }
  }

  if (checking) return <p className="p-10 text-center text-slate-500">Memuat...</p>;
  if (!me) return null;

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Script src={snapUrl} data-client-key={process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY} strategy="afterInteractive" />

      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-700">Tagihan Saya</h1>
          <p className="text-sm text-slate-500">Halo, {me.name}</p>
        </div>
        <button
          onClick={handleLogout}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
        >
          Keluar
        </button>
      </header>

      {error && <p className="mb-4 text-sm text-rose-600">{error}</p>}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-3">Periode</th>
              <th className="px-4 py-3">Jumlah</th>
              <th className="px-4 py-3">Jatuh Tempo</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice) => (
              <tr key={invoice.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-medium">{invoice.period}</td>
                <td className="px-4 py-3">{formatRupiah(invoice.amount)}</td>
                <td className="px-4 py-3">{formatDate(invoice.dueDate)}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusStyle[invoice.status]}`}>
                    {statusLabel[invoice.status]}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  {invoice.status === "UNPAID" && (
                    <button
                      onClick={() => handlePay(invoice.id)}
                      disabled={payingId === invoice.id}
                      className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-50"
                    >
                      {payingId === invoice.id ? "Memproses..." : "Bayar Sekarang"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {invoices.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                  Belum ada tagihan.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
