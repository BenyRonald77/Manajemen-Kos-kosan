# Manajemen Kos-kosan

Aplikasi web untuk mengelola kos-kosan: tagihan bulanan otomatis (cron job),
pembayaran online via Midtrans Snap (sandbox), dan dashboard terpisah untuk
penghuni & pemilik.

Lihat dokumen perencanaan lengkap di [`docs/PRD.md`](./docs/PRD.md).

## Fitur Utama

- **Manajemen kamar & penghuni** (`/owner/rooms`, `/owner/tenants`) — pemilik menambah kamar, menempatkan penghuni, dan checkout penghuni.
- **Tagihan bulanan otomatis** — endpoint cron idempotent yang membuat tagihan untuk semua penghuni aktif setiap periode baru, bisa dipicu scheduler eksternal (contoh workflow GitHub Actions disertakan) maupun dijalankan manual lewat script.
- **Pembayaran online Midtrans Snap** (`/dashboard`) — penghuni bayar tagihan langsung dari browser; status berubah otomatis lewat webhook yang diverifikasi signature-nya.
- **Dashboard pemilik** (`/owner/dashboard`) — ringkasan pendapatan bulan berjalan, okupansi kamar, daftar tunggakan, serta opsi tandai lunas manual.
- **Dashboard penghuni** (`/dashboard`) — daftar tagihan & status (belum bayar/lunas/kedaluwarsa).

## Teknologi

- Next.js 14 (App Router) + TypeScript + Tailwind CSS
- Prisma ORM (SQLite untuk development, mudah dipindah ke PostgreSQL)
- JWT (cookie httpOnly) untuk sesi pemilik & penghuni
- Midtrans Snap API (mode sandbox) untuk pembayaran

## Menjalankan Secara Lokal

1. Install dependencies:

   ```bash
   npm install
   ```

2. Salin file environment lalu sesuaikan:

   ```bash
   cp .env.example .env
   ```

3. Migrasi database + seed data contoh (1 properti, 3 kamar, 1 penghuni aktif):

   ```bash
   npm run prisma:migrate
   ```

4. Jalankan server development:

   ```bash
   npm run dev
   ```

5. Buka:
   - `http://localhost:3000/owner/login` — dashboard pemilik
   - `http://localhost:3000/login` — dashboard penghuni

   Akun demo hasil seed:
   - Pemilik: `pemilik@kos.test` / `owner123`
   - Penghuni: `penghuni@kos.test` / `tenant123` (kamar 101)

## Tagihan Bulanan Otomatis

Ada dua cara memicu pembuatan tagihan bulan berjalan, keduanya **idempotent**
(aman dijalankan berkali-kali — tidak akan membuat tagihan dobel untuk
periode yang sama):

1. **Script CLI** (cocok untuk cron OS pada server yang selalu menyala):

   ```bash
   npm run cron:generate-invoices
   ```

2. **Endpoint HTTP terproteksi token**, untuk dipicu scheduler eksternal
   (cron-job.org, GitHub Actions, dll) tanpa perlu proses server yang
   selalu hidup:

   ```bash
   curl -X POST https://domain-anda.com/api/cron/generate-invoices \
     -H "x-cron-secret: <isi sesuai CRON_SECRET di .env>"
   ```

   Contoh workflow terjadwal tersedia di
   [`.github/workflows/monthly-invoices.yml`](./.github/workflows/monthly-invoices.yml) —
   isi secret `APP_URL` & `CRON_SECRET` di pengaturan repo GitHub untuk
   mengaktifkannya.

## Konfigurasi Midtrans (Sandbox)

1. Daftar akun [Midtrans Sandbox](https://dashboard.sandbox.midtrans.com/) (gratis).
2. Ambil **Server Key** & **Client Key** dari menu Settings > Access Keys.
3. Isi di `.env`:

   ```
   MIDTRANS_IS_PRODUCTION=false
   MIDTRANS_SERVER_KEY="SB-Mid-server-xxxxxxxx"
   MIDTRANS_CLIENT_KEY="SB-Mid-client-xxxxxxxx"
   NEXT_PUBLIC_MIDTRANS_CLIENT_KEY="SB-Mid-client-xxxxxxxx"
   NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION=false
   ```

4. Daftarkan URL webhook di dashboard Midtrans (Settings > Configuration >
   Payment Notification URL):

   ```
   https://domain-anda.com/api/midtrans/notification
   ```

   Untuk testing lokal, gunakan tunnel (ngrok/cloudflared) agar Midtrans bisa
   menjangkau `localhost`.

5. Pembayaran sandbox bisa disimulasikan dengan kartu uji atau simulator VA
   dari dokumentasi Midtrans, tanpa transaksi uang sungguhan.

## Struktur Proyek

```
docs/PRD.md                          Dokumen PRD
prisma/schema.prisma                 Skema database
prisma/seed.ts                        Data contoh
scripts/generate-invoices.ts          Script CLI tagihan bulanan
.github/workflows/monthly-invoices.yml  Contoh scheduler eksternal
src/lib/invoice-service.ts            Logika pembuatan tagihan otomatis
src/lib/payment-service.ts            Logika transaksi & webhook Midtrans
src/lib/kos-service.ts                Logika manajemen kamar/penghuni/tagihan
src/lib/auth.ts                       Autentikasi (JWT) pemilik & penghuni
src/app/owner                         Dashboard pemilik
src/app/dashboard, src/app/login      Dashboard & login penghuni
src/app/api                           API routes
```

## Skrip yang Tersedia

| Skrip | Keterangan |
|---|---|
| `npm run dev` | Jalankan server development |
| `npm run build` | Build production |
| `npm start` | Jalankan server production |
| `npm run typecheck` | Cek tipe TypeScript |
| `npm run prisma:migrate` | Migrasi database (development) |
| `npm run prisma:seed` | Jalankan seed data contoh |
| `npm run cron:generate-invoices` | Buat tagihan bulan berjalan (idempotent) |

## Deployment

1. Set environment variable production (`DATABASE_URL` ke PostgreSQL — ubah
   `provider` di `prisma/schema.prisma` jadi `postgresql` lalu jalankan
   `npx prisma migrate deploy`, `JWT_SECRET`, `CRON_SECRET`, kredensial
   Midtrans produksi bila sudah siap go-live).
2. Build: `npm run build`, jalankan: `npm start`.
3. Aktifkan scheduler eksternal (GitHub Actions/cron-job.org) untuk memanggil
   `/api/cron/generate-invoices` setiap awal bulan.
4. Set Payment Notification URL Midtrans ke `/api/midtrans/notification` pada
   domain production.

## Catatan Keamanan

- Password pemilik & penghuni di-hash dengan bcrypt.
- Endpoint tagihan penghuni difilter berdasarkan kepemilikan data — penghuni
  hanya bisa melihat/membayar tagihannya sendiri.
- Endpoint cron dilindungi token rahasia (`CRON_SECRET`), bukan sesi login,
  karena dipanggil oleh mesin.
- Webhook Midtrans diverifikasi `signature_key`-nya sebelum status tagihan
  diproses, mencegah notifikasi palsu.
