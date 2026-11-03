-- Bangnet Manager All-in-One foundation
-- Additive migration: legacy tables are intentionally left untouched.
-- Apply only after reviewing the schema and confirming Supabase backup.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create table if not exists public.product_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category text not null default 'Digital',
  description text,
  variant text,
  cost_price numeric(14,2) not null default 0 check (cost_price >= 0),
  sale_price numeric(14,2) not null default 0 check (sale_price >= 0),
  stock_status text not null default 'available' check (stock_status in ('available','out_of_stock','unlimited')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  phone text,
  email text,
  notes text,
  segment text not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, phone)
);

create table if not exists public.customer_tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text not null default 'teal',
  created_at timestamptz not null default now(),
  unique(user_id, name)
);

create table if not exists public.customer_tag_links (
  user_id uuid not null references auth.users(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  tag_id uuid not null references public.customer_tags(id) on delete cascade,
  primary key(customer_id, tag_id)
);

create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  invoice_number text not null,
  sale_date timestamptz not null default now(),
  status text not null default 'draft' check (status in ('draft','confirmed','partially_paid','paid','cancelled','refunded')),
  subtotal numeric(14,2) not null default 0,
  discount numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, invoice_number)
);

create table if not exists public.sale_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  sale_id uuid not null references public.sales(id) on delete cascade,
  product_template_id uuid references public.product_templates(id) on delete set null,
  product_name text not null,
  variant text,
  quantity numeric(12,2) not null default 1 check (quantity > 0),
  unit_cost numeric(14,2) not null default 0 check (unit_cost >= 0),
  unit_price numeric(14,2) not null default 0 check (unit_price >= 0),
  line_discount numeric(14,2) not null default 0 check (line_discount >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  sale_id uuid not null references public.sales(id) on delete cascade,
  paid_at timestamptz not null default now(),
  amount numeric(14,2) not null check (amount > 0),
  method text not null default 'cash',
  reference text,
  status text not null default 'completed' check (status in ('pending','completed','failed','refunded')),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  sale_item_id uuid references public.sale_items(id) on delete set null,
  product_name text not null,
  account_identifier text,
  started_at date,
  expires_at date,
  status text not null default 'active' check (status in ('active','expiring','expired','cancelled')),
  reminder_enabled boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cash_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  account_type text not null default 'cash' check (account_type in ('cash','bank','ewallet','other')),
  opening_balance numeric(14,2) not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(user_id, name)
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  expense_date date not null default current_date,
  category text not null,
  description text not null,
  amount numeric(14,2) not null check (amount > 0),
  payment_account_id uuid references public.cash_accounts(id) on delete set null,
  status text not null default 'paid' check (status in ('unpaid','paid','void')),
  created_at timestamptz not null default now()
);

create table if not exists public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null default current_date,
  source_type text not null,
  source_id uuid,
  description text not null,
  status text not null default 'posted' check (status in ('draft','posted','reversed')),
  created_at timestamptz not null default now()
);

create table if not exists public.journal_lines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  journal_entry_id uuid not null references public.journal_entries(id) on delete cascade,
  account_code text not null,
  account_name text not null,
  debit numeric(14,2) not null default 0 check (debit >= 0),
  credit numeric(14,2) not null default 0 check (credit >= 0),
  check (not (debit > 0 and credit > 0)),
  check (debit > 0 or credit > 0)
);

create table if not exists public.message_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  channel text not null default 'whatsapp',
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  message_template_id uuid references public.message_templates(id) on delete set null,
  segment text,
  status text not null default 'draft' check (status in ('draft','scheduled','running','completed','cancelled')),
  scheduled_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.message_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  phone text not null,
  mode text not null default 'manual' check (mode in ('manual','cloud_api')),
  provider_message_id text,
  status text not null default 'queued',
  error_message text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.scheduled_contents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  channel text not null,
  caption text not null default '',
  media_path text,
  scheduled_at timestamptz,
  status text not null default 'draft' check (status in ('draft','scheduled','published','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.app_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  business_name text not null default 'Bangnet',
  currency text not null default 'IDR',
  timezone text not null default 'Asia/Jakarta',
  theme text not null default 'system' check (theme in ('light','dark','system')),
  whatsapp_mode text not null default 'hybrid' check (whatsapp_mode in ('manual','hybrid','cloud_api')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  entity_type text not null,
  entity_id text,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- All new business tables are private to their authenticated owner.
do $$
declare t text;
begin
 foreach t in array array[
  'product_templates','customers','customer_tags','customer_tag_links','sales','sale_items',
  'payments','subscriptions','cash_accounts','expenses','journal_entries','journal_lines',
  'message_templates','campaigns','message_logs','scheduled_contents','app_settings','audit_logs'
 ] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('drop policy if exists "owner_all" on public.%I',t);
  execute format('create policy "owner_all" on public.%I for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id)',t);
 end loop;
end $$;

create index if not exists idx_templates_owner_name on public.product_templates(user_id,name);
create index if not exists idx_customers_owner_name on public.customers(user_id,name);
create index if not exists idx_sales_owner_date on public.sales(user_id,sale_date desc);
create index if not exists idx_sale_items_sale on public.sale_items(user_id,sale_id);
create index if not exists idx_payments_sale on public.payments(user_id,sale_id,paid_at desc);
create index if not exists idx_subscriptions_expiry on public.subscriptions(user_id,expires_at);
create index if not exists idx_expenses_date on public.expenses(user_id,expense_date desc);
create index if not exists idx_journal_entries_date on public.journal_entries(user_id,entry_date desc);
create index if not exists idx_message_logs_created on public.message_logs(user_id,created_at desc);
create index if not exists idx_scheduled_contents_date on public.scheduled_contents(user_id,scheduled_at);

do $$
declare t text;
begin
 foreach t in array array['product_templates','customers','sales','subscriptions','message_templates','scheduled_contents','app_settings'] loop
  execute format('drop trigger if exists trg_%I_updated_at on public.%I',t,t);
  execute format('create trigger trg_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()',t,t);
 end loop;
end $$;
