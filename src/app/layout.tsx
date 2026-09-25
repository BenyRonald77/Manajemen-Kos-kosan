import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Manajemen Kos-kosan",
  description:
    "Aplikasi manajemen kos-kosan: tagihan bulanan otomatis, pembayaran Midtrans, dashboard penghuni & pemilik.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
