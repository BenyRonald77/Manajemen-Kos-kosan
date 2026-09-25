"use client";

import { useCallback, useEffect, useState } from "react";
import { OwnerNav } from "@/components/owner-nav";
import { useOwnerGuard } from "@/lib/use-owner-guard";

type Property = { id: string; name: string };
type Room = {
  id: string;
  number: string;
  monthlyRent: number;
  status: string;
  propertyName: string;
  tenant: { name: string } | null;
};

function formatRupiah(amount: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(amount);
}

export default function OwnerRoomsPage() {
  const { me, checking } = useOwnerGuard();
  const [properties, setProperties] = useState<Property[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [propertyId, setPropertyId] = useState("");
  const [number, setNumber] = useState("");
  const [monthlyRent, setMonthlyRent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadRooms = useCallback(async () => {
    const res = await fetch("/api/owner/rooms");
    if (res.ok) setRooms((await res.json()).rooms);
  }, []);

  useEffect(() => {
    if (!me) return;
    fetch("/api/owner/properties")
      .then((res) => res.json())
      .then((data: { properties: Property[] }) => {
        setProperties(data.properties);
        if (data.properties[0]) setPropertyId(data.properties[0].id);
      });
    loadRooms();
  }, [me, loadRooms]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/owner/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId, number, monthlyRent: Number(monthlyRent) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Gagal menambah kamar");
        return;
      }
      setNumber("");
      setMonthlyRent("");
      await loadRooms();
    } catch {
      setError("Terjadi kesalahan jaringan");
    } finally {
      setBusy(false);
    }
  }

  if (checking) return <p className="p-10 text-center text-slate-500">Memuat...</p>;
  if (!me) return null;

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <OwnerNav />
      <h1 className="mb-6 text-2xl font-bold text-brand-700">Manajemen Kamar</h1>

      <form
        onSubmit={handleSubmit}
        className="mb-8 grid gap-4 rounded-xl border border-slate-200 bg-white p-6 sm:grid-cols-4"
      >
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 sm:col-span-1">
          Properti
          <select
            value={propertyId}
            onChange={(event) => setPropertyId(event.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2"
          >
            {properties.map((property) => (
              <option key={property.id} value={property.id}>
                {property.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Nomor Kamar
          <input
            value={number}
            onChange={(event) => setNumber(event.target.value)}
            required
            className="rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Harga Sewa / Bulan
          <input
            type="number"
            min={0}
            value={monthlyRent}
            onChange={(event) => setMonthlyRent(event.target.value)}
            required
            className="rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>
        <div className="flex items-end">
          <button
            type="submit"
            disabled={busy || !propertyId}
            className="w-full rounded-lg bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {busy ? "Menyimpan..." : "Tambah Kamar"}
          </button>
        </div>
        {error && <p className="text-sm text-rose-600 sm:col-span-4">{error}</p>}
      </form>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-3">Properti</th>
              <th className="px-4 py-3">Kamar</th>
              <th className="px-4 py-3">Sewa/Bulan</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Penghuni</th>
            </tr>
          </thead>
          <tbody>
            {rooms.map((room) => (
              <tr key={room.id} className="border-t border-slate-100">
                <td className="px-4 py-3">{room.propertyName}</td>
                <td className="px-4 py-3 font-medium">{room.number}</td>
                <td className="px-4 py-3">{formatRupiah(room.monthlyRent)}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      room.status === "OCCUPIED"
                        ? "bg-brand-100 text-brand-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {room.status === "OCCUPIED" ? "Terisi" : "Kosong"}
                  </span>
                </td>
                <td className="px-4 py-3">{room.tenant?.name ?? "—"}</td>
              </tr>
            ))}
            {rooms.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                  Belum ada kamar.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
