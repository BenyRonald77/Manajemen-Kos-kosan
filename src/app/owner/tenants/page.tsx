"use client";

import { useCallback, useEffect, useState } from "react";
import { OwnerNav } from "@/components/owner-nav";
import { useOwnerGuard } from "@/lib/use-owner-guard";

type Room = { id: string; number: string; status: string; propertyName: string };
type Tenant = {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  roomNumber: string | null;
  propertyName: string | null;
};

export default function OwnerTenantsPage() {
  const { me, checking } = useOwnerGuard();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [form, setForm] = useState({ roomId: "", name: "", email: "", password: "", phone: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadData = useCallback(async () => {
    const [roomsRes, tenantsRes] = await Promise.all([
      fetch("/api/owner/rooms"),
      fetch("/api/owner/tenants"),
    ]);
    if (roomsRes.ok) {
      const data: { rooms: Room[] } = await roomsRes.json();
      setRooms(data.rooms.filter((room) => room.status === "VACANT"));
    }
    if (tenantsRes.ok) setTenants((await tenantsRes.json()).tenants);
  }, []);

  useEffect(() => {
    if (me) loadData();
  }, [me, loadData]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/owner/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Gagal menambah penghuni");
        return;
      }
      setForm({ roomId: "", name: "", email: "", password: "", phone: "" });
      await loadData();
    } catch {
      setError("Terjadi kesalahan jaringan");
    } finally {
      setBusy(false);
    }
  }

  async function handleCheckout(tenantId: string) {
    setBusy(true);
    try {
      await fetch(`/api/owner/tenants/${tenantId}/checkout`, { method: "POST" });
      await loadData();
    } finally {
      setBusy(false);
    }
  }

  if (checking) return <p className="p-10 text-center text-slate-500">Memuat...</p>;
  if (!me) return null;

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <OwnerNav />
      <h1 className="mb-6 text-2xl font-bold text-brand-700">Manajemen Penghuni</h1>

      <form
        onSubmit={handleSubmit}
        className="mb-8 grid gap-4 rounded-xl border border-slate-200 bg-white p-6 sm:grid-cols-2"
      >
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Kamar (kosong)
          <select
            value={form.roomId}
            onChange={(event) => setForm((f) => ({ ...f, roomId: event.target.value }))}
            required
            className="rounded-lg border border-slate-300 px-3 py-2"
          >
            <option value="">Pilih kamar</option>
            {rooms.map((room) => (
              <option key={room.id} value={room.id}>
                {room.propertyName} — {room.number}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Nama Penghuni
          <input
            value={form.name}
            onChange={(event) => setForm((f) => ({ ...f, name: event.target.value }))}
            required
            className="rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Email (untuk login)
          <input
            type="email"
            value={form.email}
            onChange={(event) => setForm((f) => ({ ...f, email: event.target.value }))}
            required
            className="rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Password Awal
          <input
            type="text"
            value={form.password}
            onChange={(event) => setForm((f) => ({ ...f, password: event.target.value }))}
            required
            minLength={6}
            className="rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          No. HP/WhatsApp
          <input
            value={form.phone}
            onChange={(event) => setForm((f) => ({ ...f, phone: event.target.value }))}
            required
            className="rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>
        <div className="flex items-end">
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {busy ? "Menyimpan..." : "Tambah Penghuni"}
          </button>
        </div>
        {error && <p className="text-sm text-rose-600 sm:col-span-2">{error}</p>}
      </form>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-3">Nama</th>
              <th className="px-4 py-3">Kamar</th>
              <th className="px-4 py-3">Kontak</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {tenants.map((tenant) => (
              <tr key={tenant.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-medium">{tenant.name}</td>
                <td className="px-4 py-3">
                  {tenant.roomNumber ? `${tenant.propertyName} — ${tenant.roomNumber}` : "—"}
                </td>
                <td className="px-4 py-3">
                  {tenant.email}
                  <br />
                  {tenant.phone}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      tenant.status === "ACTIVE"
                        ? "bg-brand-100 text-brand-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {tenant.status === "ACTIVE" ? "Aktif" : "Nonaktif"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  {tenant.status === "ACTIVE" && (
                    <button
                      onClick={() => handleCheckout(tenant.id)}
                      disabled={busy}
                      className="rounded-lg border border-rose-300 px-3 py-1 text-xs text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                    >
                      Checkout
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {tenants.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                  Belum ada penghuni.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
