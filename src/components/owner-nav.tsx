"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const links = [
  { href: "/owner/dashboard", label: "Ringkasan" },
  { href: "/owner/rooms", label: "Kamar" },
  { href: "/owner/tenants", label: "Penghuni" },
];

export function OwnerNav() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/owner/login");
  }

  return (
    <nav className="mb-8 flex items-center justify-between border-b border-slate-200 pb-4">
      <div className="flex gap-4">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`text-sm font-medium ${
              pathname === link.href
                ? "text-brand-700"
                : "text-slate-500 hover:text-brand-600"
            }`}
          >
            {link.label}
          </Link>
        ))}
      </div>
      <button
        onClick={handleLogout}
        className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
      >
        Keluar
      </button>
    </nav>
  );
}
