-- Bangnet Business Suite: CRM, FAQ, katalog, jadwal konten.
create table if not exists public.crm_contacts (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 name text not null, phone text not null, tags text[] not null default '{}',
 ltv numeric not null default 0, orders integer not null default 0,
 last_transaction date, created_at timestamptz not null default now(),
 unique(user_id, phone)
);
create table if not exists public.quick_replies (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 title text not null, body text not null, created_at timestamptz not null default now()
);
create table if not exists public.product_catalog (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 name text not null, category text not null, description text,
 cost numeric not null default 0, sale numeric not null default 0,
 stock text not null default 'Tersedia' check(stock in ('Tersedia','Habis')),
 created_at timestamptz not null default now()
);
create table if not exists public.content_schedule (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 title text not null, target text not null, caption text not null,
 scheduled_at timestamptz not null, image_url text,
 status text not null default 'Menunggu' check(status in ('Menunggu','Selesai')),
 created_at timestamptz not null default now()
);
do $$
declare t text;
begin
 foreach t in array array['crm_contacts','quick_replies','product_catalog','content_schedule'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('drop policy if exists "Users manage own %s" on public.%I',t,t);
  execute format('create policy "Users manage own %s" on public.%I for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id)',t,t);
 end loop;
end $$;
create index if not exists idx_crm_contacts_user on public.crm_contacts(user_id);
create index if not exists idx_content_schedule_user_date on public.content_schedule(user_id,scheduled_at);
