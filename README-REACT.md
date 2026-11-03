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
