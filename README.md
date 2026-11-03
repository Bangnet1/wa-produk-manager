# WA & Produk Manager

Website mandiri untuk mengelola produk digital, pelanggan, template pesan, pengingat masa aktif, dan rancangan kampanye WhatsApp. Frontend menggunakan HTML/CSS/JavaScript dan Supabase PostgreSQL/Auth.

## Isi paket
- `index.html`, `styles.css`: antarmuka responsif.
- `js/app.js`: autentikasi, CRUD produk/pelanggan/template/kampanye, filter, ekspor CSV, pembuka WhatsApp.
- `js/config.example.js`: contoh konfigurasi Supabase.
- `supabase/schema.sql`: tabel, indeks, trigger, dan Row Level Security.
- `supabase/functions/whatsapp-webhook/index.ts`: kerangka webhook Meta (belum produksi).

## Setup Supabase
1. Buat proyek baru di https://supabase.com/dashboard.
2. Buka **SQL Editor** pada proyek baru.
3. Jalankan seluruh isi `supabase/schema.sql`.
4. Buka **Project Settings > API**. Salin Project URL dan anon/public key.
5. Salin `js/config.example.js` menjadi `js/config.js`, lalu isi URL dan anon key.
6. Jangan pernah memasukkan `service_role` key atau token WhatsApp ke file frontend.
7. Jalankan website melalui local web server (misalnya VS Code Live Server) atau unggah ke hosting HTTPS.

## Setup autentikasi
- Buka **Authentication > URL Configuration** dan atur Site URL serta Redirect URLs ke domain website.
- Untuk uji coba, email confirmation dapat disesuaikan dari Authentication > Providers > Email.
- Daftar akun melalui tab Daftar, lalu masuk.

## Fitur yang sudah ada pada starter
- Login/daftar Supabase Auth.
- CRUD data produk, pelanggan, template, dan draft kampanye.
- Perhitungan tanggal kedaluwarsa dari tanggal pembelian + durasi.
- Status Aktif, Segera Habis (0–3 hari), dan Expired.
- Filter produk, pencarian, pengurutan tanggal expired.
- Dashboard statistik dan daftar produk yang perlu ditindaklanjuti.
- Membuka chat WhatsApp dengan pesan template terisi (pengguna tetap menekan kirim).
- Ekspor data produk/pelanggan ke CSV.

## Belum aktif / tahap integrasi berikutnya
- Pengiriman otomatis WhatsApp Cloud API, antrean worker, delay, pause/resume, laporan delivery/read, dan webhook produksi.
- Import Excel/CSV, upload media Story/Channel, kalender konten.
- Scheduler notifikasi 3/2/1/0 hari dan pencegahan notifikasi ganda.
- Backup/restore dan audit log.
- Webhook contoh belum memverifikasi signature Meta; jangan deploy sebagai webhook produksi sebelum validasi signature ditambahkan.

## Keamanan penting
RLS membatasi setiap baris berdasarkan `auth.uid()`. Jangan menonaktifkan RLS. Simpan Meta App Secret, WhatsApp access token, dan service role key hanya di Supabase Edge Function Secrets / server. Dapatkan persetujuan penerima dan sediakan opt-out sebelum broadcast.

## Catatan teknis
Frontend memakai Supabase JS v2 dari CDN. `config.js` sengaja tidak disertakan karena berisi konfigurasi proyek milik Anda. `anon/public key` memang digunakan di browser bersama RLS; `service_role` key tidak boleh digunakan di browser.
