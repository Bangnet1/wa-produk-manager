-- Simple manual cashbook for Bangnet Manager.
-- Apply after 20261104_all_in_one_foundation.sql.
create table if not exists public.cashbook_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null default current_date,
  entry_type text not null check (entry_type in ('income','expense')),
  category text not null,
  description text not null,
  amount numeric(14,2) not null check (amount > 0),
  payment_method text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_cashbook_entries_user_date
  on public.cashbook_entries(user_id, entry_date desc);
alter table public.cashbook_entries enable row level security;
drop policy if exists cashbook_entries_owner_all on public.cashbook_entries;
create policy cashbook_entries_owner_all on public.cashbook_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop trigger if exists set_cashbook_entries_updated_at on public.cashbook_entries;
create trigger set_cashbook_entries_updated_at
  before update on public.cashbook_entries
  for each row execute function public.set_updated_at();
