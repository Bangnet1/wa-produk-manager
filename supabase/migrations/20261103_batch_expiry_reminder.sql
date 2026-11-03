-- Batch Expiry Reminder: riwayat pembukaan antrean WhatsApp.
create table if not exists public.broadcast_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid null references public.products(id) on delete set null,
  customer_name text not null,
  phone text not null,
  product_name text not null,
  status text not null check (status in ('SUCCESS','FAILED')),
  detail text,
  template_key text,
  created_at timestamptz not null default now()
);

create index if not exists idx_broadcast_logs_user_created
  on public.broadcast_logs (user_id, created_at desc);

alter table public.broadcast_logs enable row level security;

drop policy if exists "Users can read own broadcast logs" on public.broadcast_logs;
create policy "Users can read own broadcast logs"
  on public.broadcast_logs for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own broadcast logs" on public.broadcast_logs;
create policy "Users can insert own broadcast logs"
  on public.broadcast_logs for insert
  to authenticated
  with check (auth.uid() = user_id);
