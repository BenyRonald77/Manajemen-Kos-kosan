# PRD — Sistem Manajemen Kos-kosan

| | |
|---|---|
| **Dokumen** | Product Requirements Document |
| **Produk** | Sistem Manajemen Kos-kosan |
| **Versi** | 1.0 |
| **Tanggal** | 25 September 2026 |
| **Pemilik Produk** | BenyRonald77 |
| **Status** | Draft — untuk implementasi |

---

## 1. Latar Belakang & Masalah

Pemilik kos-kosan skala kecil-menengah umumnya masih mencatat sewa, tagihan,
dan pembayaran secara manual (buku catatan, spreadsheet, chat WhatsApp).
Masalah yang muncul:

- Pemilik lupa menagih atau menagih terlambat setiap bulan.
- Penghuni tidak punya cara mudah untuk melihat riwayat/status tagihan.
- Pembayaran manual (transfer + kirim bukti) rawan salah catat dan sulit direkonsiliasi.
- Pemilik tidak punya gambaran cepat pendapatan bulanan & tingkat hunian.

## 2. Tujuan Produk

Membangun aplikasi web untuk mengelola kos-kosan dengan:

1. **Tagihan bulanan otomatis** — dibuat sendiri oleh sistem (cron job) untuk setiap penghuni aktif, tanpa campur tangan manual pemilik.
2. **Pembayaran online** via **Midtrans Snap (sandbox)** — penghuni bayar langsung dari dashboard, status pembayaran terupdate otomatis lewat webhook.
3. **Dashboard terpisah** untuk **penghuni** (lihat & bayar tagihan) dan **pemilik** (kelola kamar/penghuni, pantau tagihan & pendapatan).

### Tujuan Terukur

| Metrik | Target |
|---|---|
| Tagihan bulanan terbit otomatis | 100% penghuni aktif, tanggal tetap tiap bulan, tanpa aksi manual |
| Status pembayaran terupdate setelah bayar via Midtrans | < 1 menit (via webhook) |
| Pemilik dapat melihat ringkasan pendapatan & tunggakan bulan berjalan | real-time di dashboard |

## 3. Target Pengguna & Peran

| Peran | Deskripsi | Akses |
|---|---|---|
| **Pemilik (OWNER)** | Mengelola properti kos, kamar, penghuni, dan memantau tagihan/pendapatan | Dashboard pemilik (login) |
| **Penghuni (TENANT)** | Menempati satu kamar, melihat & membayar tagihan bulanan | Dashboard penghuni (login) |

## 4. Lingkup (Scope)

### 4.1 Dalam Lingkup (MVP)

1. Manajemen properti kos & kamar: CRUD kamar (nomor kamar, harga sewa, status kosong/terisi).
2. Manajemen penghuni: tambah penghuni, assign ke kamar, tanggal mulai sewa, nonaktifkan (checkout) penghuni.
3. Akun login untuk pemilik dan penghuni (email/password, role-based).
4. **Tagihan bulanan otomatis**: cron job berjalan tiap tanggal tertentu (default tanggal 1) membuat tagihan baru untuk semua penghuni berstatus aktif, sebesar harga sewa kamarnya, dengan jatuh tempo yang dikonfigurasi.
5. Penghuni dapat melihat daftar tagihan (lunas/belum) & riwayat pembayaran.
6. Penghuni dapat membayar tagihan lewat **Midtrans Snap** (mode sandbox) — sistem membuat transaksi Snap, menampilkan popup pembayaran, dan menerima notifikasi status via webhook Midtrans.
7. Pemilik dapat melihat status semua tagihan (lunas, belum bayar, terlambat) di seluruh kamar.
8. Dashboard ringkasan pemilik: total pendapatan bulan berjalan, jumlah kamar terisi/kosong, jumlah tagihan tertunggak.
9. Pemilik dapat menandai tagihan lunas secara manual (untuk kasus pembayaran tunai/transfer langsung di luar Midtrans).

### 4.2 Luar Lingkup (fase berikutnya)

- Multi-properti per pemilik dengan hierarki kompleks (MVP: satu pemilik bisa punya banyak kos, tapi tanpa fitur lanjutan seperti staf pengelola per properti).
- Kontrak sewa digital & tanda tangan elektronik.
- Aplikasi mobile native.
- Pengingat otomatis via WhatsApp/email (dicatat sebagai peluang pengembangan lanjutan; MVP fokus ke tagihan otomatis + pembayaran online).
- Split pembayaran / cicilan.

## 5. Alur Pengguna Utama

### 5.1 Alur Sistem — Tagihan Otomatis

1. Cron job berjalan setiap awal bulan (tanggal terkonfigurasi, default tanggal 1 pukul 00:05 waktu server).
2. Sistem mengambil semua penghuni berstatus `ACTIVE`.
3. Untuk tiap penghuni, sistem membuat `Invoice` baru periode bulan berjalan sebesar harga sewa kamar saat ini, dengan `dueDate` = tanggal jatuh tempo terkonfigurasi (default H+7).
4. Sistem tidak membuat duplikat bila invoice periode tersebut sudah ada (idempotent).

### 5.2 Alur Penghuni — Membayar Tagihan

1. Penghuni login ke dashboard.
2. Melihat daftar tagihan, memilih tagihan berstatus `UNPAID`.
3. Klik **Bayar Sekarang** → backend membuat transaksi Midtrans Snap → frontend menampilkan popup Snap.
4. Penghuni menyelesaikan pembayaran (sandbox: kartu/VA simulasi).
5. Midtrans mengirim notifikasi ke endpoint webhook → sistem memverifikasi signature → status tagihan berubah menjadi `PAID` dan tercatat waktu pembayarannya.
6. Penghuni melihat status tagihan berubah menjadi lunas (polling/refresh).

### 5.3 Alur Pemilik — Kelola Kamar & Penghuni

1. Pemilik login ke dashboard.
2. Menambahkan kamar baru (nomor, harga sewa).
3. Menambahkan penghuni baru & menempatkannya di kamar kosong (kamar otomatis berstatus terisi).
4. Saat penghuni checkout, pemilik menonaktifkan penghuni tersebut → kamar kembali berstatus kosong, tagihan bulan berikutnya tidak dibuat lagi untuk penghuni itu.
5. Pemilik memantau ringkasan pendapatan & daftar tunggakan dari dashboard.

## 6. Kebutuhan Fungsional

| ID | Kebutuhan | Prioritas |
|---|---|---|
| FR-1 | Sistem menyediakan CRUD kamar (nomor, harga sewa, status) | Must |
| FR-2 | Sistem menyediakan manajemen penghuni (tambah, assign kamar, nonaktifkan) | Must |
| FR-3 | Login berbasis role (OWNER/TENANT) dengan sesi JWT | Must |
| FR-4 | Cron job membuat tagihan bulanan otomatis untuk semua penghuni aktif, idempotent per periode | Must |
| FR-5 | Penghuni dapat melihat daftar & detail tagihannya sendiri saja (tidak bisa melihat tagihan penghuni lain) | Must |
| FR-6 | Sistem membuat transaksi Midtrans Snap untuk tagihan yang dipilih penghuni | Must |
| FR-7 | Sistem menerima & memverifikasi webhook notifikasi Midtrans, lalu memperbarui status tagihan | Must |
| FR-8 | Pemilik dapat menandai tagihan lunas secara manual | Should |
| FR-9 | Dashboard pemilik menampilkan ringkasan: pendapatan bulan berjalan, okupansi kamar, jumlah tunggakan | Should |
| FR-10 | Endpoint webhook Midtrans harus memvalidasi signature key agar tidak bisa dipalsukan pihak luar | Must |

## 7. Kebutuhan Non-Fungsional

| Kategori | Kebutuhan |
|---|---|
| **Keamanan** | Password di-hash (bcrypt); endpoint tagihan memfilter berdasarkan kepemilikan data (penghuni hanya bisa akses tagihannya sendiri); webhook Midtrans diverifikasi signature-nya |
| **Keandalan** | Pembuatan tagihan otomatis idempotent (aman dijalankan berkali-kali tanpa duplikasi) |
| **Observability** | Log setiap transaksi Midtrans & perubahan status tagihan |
| **Portabilitas** | Integrasi Midtrans memakai mode sandbox secara default agar bisa diuji tanpa akun merchant produksi |

## 8. Arsitektur Teknis (Ringkasan)

- **Frontend & Backend**: Next.js (TypeScript, App Router) — satu codebase.
- **Database**: PostgreSQL via Prisma ORM (SQLite untuk development lokal).
- **Autentikasi**: JWT (cookie httpOnly), role OWNER/TENANT.
- **Cron job**: script terjadwal (`node-cron` dijalankan dari proses long-running, atau dipicu via external scheduler/HTTP endpoint terproteksi token untuk platform serverless) yang memanggil layanan pembuatan tagihan.
- **Pembayaran**: Midtrans Snap API (sandbox) — endpoint `create-transaction` di backend, callback `notification handler` untuk update status.

### 8.1 Entitas Data Utama

- `Owner` — akun pemilik.
- `Property` (Kos) — properti milik owner.
- `Room` (Kamar) — nomor kamar, harga sewa, status.
- `Tenant` (Penghuni) — akun penghuni, terhubung ke satu kamar aktif.
- `Invoice` (Tagihan) — periode, jumlah, status (UNPAID/PAID/EXPIRED), jatuh tempo.
- `Payment` — catatan transaksi Midtrans terkait sebuah invoice (order id, status, payload).

## 9. Kriteria Penerimaan — MVP

- [ ] Pemilik bisa menambah kamar & penghuni, penghuni otomatis punya akun login.
- [ ] Cron/endpoint tagihan otomatis membuat 1 invoice per penghuni aktif per bulan, tidak dobel bila dijalankan ulang.
- [ ] Penghuni bisa login, melihat tagihannya, dan membayar via Midtrans Snap sandbox.
- [ ] Status tagihan berubah otomatis menjadi lunas setelah webhook Midtrans diterima & diverifikasi.
- [ ] Pemilik bisa melihat ringkasan pendapatan & daftar tunggakan di dashboard.

## 10. Roadmap Implementasi

| # | Milestone |
|---|---|
| 1 | PRD |
| 2 | Scaffold proyek + schema database |
| 3 | Autentikasi pemilik & penghuni |
| 4 | Manajemen kamar & penghuni |
| 5 | Cron job tagihan bulanan otomatis |
| 6 | Integrasi Midtrans Snap + webhook |
| 7 | Dashboard penghuni |
| 8 | Dashboard pemilik |
| 9 | README & dokumentasi deployment |

## 11. Risiko & Mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Cron job gagal jalan (server restart/down saat waktu eksekusi) | Tagihan bulan itu tidak terbit | Endpoint pembuatan tagihan dibuat idempotent & bisa dipicu ulang manual/lewat scheduler eksternal (cron-job.org, GitHub Actions, dll) |
| Webhook Midtrans dipalsukan | Tagihan ditandai lunas padahal belum dibayar | Verifikasi signature key sesuai dokumentasi Midtrans sebelum memproses notifikasi |
| Race condition dua tagihan periode sama dibuat bersamaan | Data duplikat | Constraint unik `(tenantId, period)` di level database |
