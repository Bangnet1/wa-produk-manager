-- WA & Produk Manager: jalankan seluruh skrip ini di Supabase SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  created_at timestamptz not null default now()
);
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  phone text not null,
  email text,
  notes text,
  opted_out boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  product_name text not null,
  customer_name text not null,
  phone text not null,
  purchase_date date not null,
  duration_days integer not null check(duration_days > 0),
  expiry_date date not null,
  purchase_price numeric(14,2),
  selling_price numeric(14,2),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.message_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category text default 'Umum',
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  status text not null default 'draft' check(status in ('draft','scheduled','queued','running','paused','completed','cancelled','failed')),
  scheduled_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);
create table if not exists public.campaign_recipients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  phone text not null,
  message text,
  status text not null default 'pending' check(status in ('pending','queued','sent','delivered','read','failed','skipped')),
  provider_message_id text,
  error_detail text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);
create table if not exists public.message_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete set null,
  recipient_id uuid references public.campaign_recipients(id) on delete set null,
  phone text not null,
  status text not null,
  provider_message_id text,
  error_detail text,
  event_payload jsonb,
  created_at timestamptz not null default now()
);
create table if not exists public.scheduled_contents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content_type text not null check(content_type in ('story','channel')),
  title text,
  body text,
  media_path text,
  scheduled_at timestamptz,
  status text not null default 'draft' check(status in ('draft','scheduled','reminder_sent','published','cancelled')),
  created_at timestamptz not null default now()
);
create table if not exists public.reminder_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  reminder_date date not null,
  days_before_expiry integer not null,
  channel text not null default 'manual',
  status text not null default 'pending',
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique(product_id, reminder_date, days_before_expiry)
);
create table if not exists public.app_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  default_delay_seconds integer not null default 5 check(default_delay_seconds between 1 and 3600),
  reminders_enabled boolean not null default true,
  reminder_days integer[] not null default array[3,2,1,0],
  default_template_id uuid references public.message_templates(id) on delete set null,
  timezone text not null default 'Asia/Jakarta',
  updated_at timestamptz not null default now()
);

-- updated_at helper
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;
do $$ declare t text; begin
  foreach t in array array['customers','products','message_templates'] loop
    execute format('drop trigger if exists trg_%I_updated_at on public.%I',t,t);
    execute format('create trigger trg_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()',t,t);
  end loop;
end $$;

-- RLS: every user can access only their own rows.
do $$ declare t text; begin
  foreach t in array array['profiles','customers','products','message_templates','campaigns','campaign_recipients','message_reports','scheduled_contents','reminder_history','app_settings'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('drop policy if exists "owner_all" on public.%I',t);
    execute format('create policy "owner_all" on public.%I for all using (auth.uid() = user_id) with check (auth.uid() = user_id)',t);
  end loop;
end $$;

create index if not exists idx_products_user_expiry on public.products(user_id, expiry_date);
create index if not exists idx_customers_user_name on public.customers(user_id, name);
create index if not exists idx_campaigns_user_schedule on public.campaigns(user_id, scheduled_at);
create index if not exists idx_recipients_campaign_status on public.campaign_recipients(campaign_id, status);

-- Create profile automatically after sign-up.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.profiles(id, full_name) values(new.id, coalesce(new.raw_user_meta_data->>'full_name',''));
  insert into public.app_settings(user_id) values(new.id);
  return new;
end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

-- NOTE: Never put Meta/WhatsApp access tokens in browser code.
-- Configure secrets in Supabase Edge Function secrets and process API/webhook server-side.
