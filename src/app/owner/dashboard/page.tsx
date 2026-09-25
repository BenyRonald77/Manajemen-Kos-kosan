"use client";

import { useCallback, useEffect, useState } from "react";
import { OwnerNav } from "@/components/owner-nav";
import { useOwnerGuard } from "@/lib/use-owner-guard";

type Summary = {
  period: string;
  totalRooms: number;
  occupiedRooms: number;
  vacantRooms: number;
  revenueThisPeriod: number;
  outstandingInvoices: number;
};

type Invoice = {
  id: string;
  period: string;
  amount: number;
  dueDate: string;
  status: "UNPAID" | "PAID" | "EXPIRED";
  tenantName: string;
  roomNumber: string;
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

export default function OwnerDashboardPage() {
  const { me, checking } = useOwnerGuard();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const [summaryRes, invoicesRes] = await Promise.all([
      fetch("/api/owner/summary"),
      fetch("/api/owner/invoices"),
    ]);
    if (summaryRes.ok) setSummary(await summaryRes.json());
    if (invoicesRes.ok) setInvoices((await invoicesRes.json()).invoices);
  }, []);

  useEffect(() => {
    if (me) loadData();
  }, [me, loadData]);

  async function handleMarkPaid(invoiceId: string) {
    setBusyId(invoiceId);
    try {
      await fetch(`/api/owner/invoices/${invoiceId}/mark-paid`, { method: "POST" });
      await loadData();
    } finally {
      setBusyId(null);
    }
  }

  if (checking) return <p className="p-10 text-center text-slate-500">Memuat...</p>;
  if (!me) return null;

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <OwnerNav />
      <h1 className="mb-6 text-2xl font-bold text-brand-700">Ringkasan</h1>

      {summary && (
        <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-xs uppercase tracking-wide text-slate-500">Pendapatan {summary.period}</p>
            <p className="mt-1 text-2xl font-bold text-brand-700">{formatRupiah(summary.revenueThisPeriod)}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-xs uppercase tracking-wide text-slate-500">Kamar Terisi</p>
            <p className="mt-1 text-2xl font-bold text-slate-800">
              {summary.occupiedRooms}/{summary.totalRooms}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-xs uppercase tracking-wide text-slate-500">Kamar Kosong</p>
            <p className="mt-1 text-2xl font-bold text-slate-800">{summary.vacantRooms}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-xs uppercase tracking-wide text-slate-500">Tunggakan</p>
            <p className="mt-1 text-2xl font-bold text-amber-600">{summary.outstandingInvoices}</p>
          </div>
        </section>
      )}

      <section className="rounded-xl border border-slate-200 bg-white">
        <h2 className="border-b border-slate-100 px-6 py-4 font-semibold text-slate-800">
          Status Tagihan Seluruh Penghuni
        </h2>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-3">Penghuni</th>
              <th className="px-4 py-3">Kamar</th>
              <th className="px-4 py-3">Periode</th>
              <th className="px-4 py-3">Jumlah</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice) => (
              <tr key={invoice.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-medium">{invoice.tenantName}</td>
                <td className="px-4 py-3">{invoice.roomNumber}</td>
                <td className="px-4 py-3">{invoice.period}</td>
                <td className="px-4 py-3">{formatRupiah(invoice.amount)}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusStyle[invoice.status]}`}>
                    {statusLabel[invoice.status]}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  {invoice.status === "UNPAID" && (
                    <button
                      onClick={() => handleMarkPaid(invoice.id)}
                      disabled={busyId === invoice.id}
                      className="rounded-lg border border-brand-300 px-3 py-1 text-xs text-brand-700 hover:bg-brand-50 disabled:opacity-50"
                    >
                      Tandai Lunas
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {invoices.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                  Belum ada tagihan.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </main>
  );
}
