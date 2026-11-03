-- WA & Produk Manager: tambahan data varian/durasi produk.
-- Aman dijalankan pada tabel products yang sudah ada.
alter table public.products
  add column if not exists variant text;

create index if not exists idx_products_user_expiry
  on public.products (user_id, expiry_date);
