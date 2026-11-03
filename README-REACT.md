# WA & Produk Manager — React Expiry Tracker

Frontend baru menggunakan React, TypeScript, Tailwind CSS, Vite, dan Supabase JS v2.

## Menjalankan lokal
1. Jalankan `npm install`.
2. Pastikan `js/config.js` berisi Supabase Project URL dan publishable key.
3. Jalankan `npm run dev`.
4. Build produksi dengan `npm run build`.

## Database
Jalankan `supabase/migrations/20261103_product_expiry_tracker.sql` di Supabase SQL Editor untuk menambahkan kolom `variant` pada tabel `products`.
Kolom lain menggunakan struktur tabel products yang sudah ada: customer_name, phone, product_name, purchase_date, duration_days, expiry_date, purchase_price, selling_price, user_id.

## GitHub Pages
Workflow `.github/workflows/deploy.yml` membangun aplikasi dan mengunggah folder dist. Ubah Settings → Pages → Build and deployment → Source menjadi **GitHub Actions** agar workflow dapat menerbitkan situs.

## Pengingat
Banner/toast dan badge lonceng memindai produk saat aplikasi dibuka dan setiap 60 detik selama aplikasi aktif. Pengingat WhatsApp membuka wa.me dengan teks terisi, tetapi tidak mengirim otomatis. Pengiriman notifikasi saat browser tertutup membutuhkan scheduler/backend terpisah.

## Batch Expiry Reminder
Jalankan juga `supabase/migrations/20261103_batch_expiry_reminder.sql` di Supabase SQL Editor untuk membuat tabel riwayat broadcast dengan RLS per pengguna. Modal menyediakan pemindaian H-3 s.d. H-0, pilihan pelanggan, template dengan placeholder, preview, jeda 3–5 detik, antrean pembukaan tab WhatsApp, progress, dan riwayat aktivitas.

Penting: browser tidak dapat mengirim pesan WhatsApp secara otomatis. Status SUCCESS pada riwayat berarti tab chat berhasil dibuka; operator tetap perlu menekan tombol Kirim. Jeda membantu mengatur antrean pembukaan tab, bukan jaminan anti-blokir WhatsApp. Pengiriman resmi otomatis memerlukan WhatsApp Business Platform/API dan backend yang sesuai.

## Business Suite (Invoice, CRM, FAQ, Analytics, Catalog, Content Schedule)
Jalankan migration tambahan `supabase/migrations/20261103_business_suite.sql` di Supabase SQL Editor. Modul yang tersedia:
- Generator invoice/kuitansi Bangnet, nomor invoice otomatis, perincian subtotal/biaya admin/total, nota WhatsApp, salin teks, dan cetak ke PDF melalui dialog print browser.
- NMID QRIS ditampilkan sebagai identitas toko. Unggah gambar QRIS statis resmi milik toko untuk menampilkan kode yang dapat dipindai; NMID saja tidak dapat dipakai untuk merekonstruksi gambar QRIS pembayaran.
- CRM dengan tag VIP, Pelanggan Baru, Reseller, Sering Telat Bayar, Akun Premium, dan Pelanggan Setia; ringkasan LTV/order dihitung dari data produk yang tersedia.
- Template Quick Reply bawaan dan template custom; tautan WhatsApp hanya membuka chat dengan teks terisi.
- Analitik menggunakan Recharts. Omzet/modal dihitung dari data produk yang tanggal jatuh temponya belum lewat; broadcast SUCCESS di log lama berarti tab WhatsApp dibuka, bukan pesan terbukti terkirim.
- Katalog produk dan generator price list; jadwal Story/Channel menyimpan caption serta pratinjau banner.
- Penjadwalan konten adalah daftar pengingat/manual. Browser tidak dapat mempublikasikan WhatsApp Story atau Channel otomatis; operator perlu membuka WhatsApp dan mengunggah banner serta caption sendiri. Banner disimpan sebagai data URL pada baris jadwal sehingga ukuran gambar sebaiknya dijaga tetap kecil.
