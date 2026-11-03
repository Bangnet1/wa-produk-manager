
-- =====================================================
-- WA & PRODUK MANAGER
-- DATABASE SETUP - SUPABASE
-- VERSI PERBAIKAN LENGKAP
-- =====================================================

create extension if not exists pgcrypto;

-- =====================================================
-- 1. TABEL PROFILES
-- =====================================================

create table if not exists public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    full_name text,
    created_at timestamptz not null default now()
);

-- =====================================================
-- 2. TABEL CUSTOMERS
-- =====================================================

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

-- =====================================================
-- 3. TABEL PRODUCTS
-- =====================================================

create table if not exists public.products (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    customer_id uuid references public.customers(id) on delete set null,
    product_name text not null,
    customer_name text not null,
    phone text not null,
    purchase_date date not null,
    duration_days integer not null check (duration_days > 0),
    expiry_date date not null,
    purchase_price numeric(14,2),
    selling_price numeric(14,2),
    notes text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- =====================================================
-- 4. TABEL MESSAGE TEMPLATES
-- =====================================================

create table if not exists public.message_templates (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    name text not null,
    category text default 'Umum',
    body text not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- =====================================================
-- 5. TABEL CAMPAIGNS
-- =====================================================

create table if not exists public.campaigns (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    name text not null,
    status text not null default 'draft'
        check (status in (
            'draft',
            'scheduled',
            'queued',
            'running',
            'paused',
            'completed',
            'cancelled',
            'failed'
        )),
    scheduled_at timestamptz,
    notes text,
    created_at timestamptz not null default now()
);

-- =====================================================
-- 6. TABEL CAMPAIGN RECIPIENTS
-- =====================================================

create table if not exists public.campaign_recipients (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    campaign_id uuid not null references public.campaigns(id) on delete cascade,
    customer_id uuid references public.customers(id) on delete set null,
    phone text not null,
    message text,
    status text not null default 'pending'
        check (status in (
            'pending',
            'queued',
            'sent',
            'delivered',
            'read',
            'failed',
            'skipped'
        )),
    provider_message_id text,
    error_detail text,
    sent_at timestamptz,
    created_at timestamptz not null default now()
);

-- =====================================================
-- 7. TABEL MESSAGE REPORTS
-- =====================================================

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

-- =====================================================
-- 8. TABEL SCHEDULED CONTENTS
-- =====================================================

create table if not exists public.scheduled_contents (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    content_type text not null
        check (content_type in ('story', 'channel')),
    title text,
    body text,
    media_path text,
    scheduled_at timestamptz,
    status text not null default 'draft'
        check (status in (
            'draft',
            'scheduled',
            'reminder_sent',
            'published',
            'cancelled'
        )),
    created_at timestamptz not null default now()
);

-- =====================================================
-- 9. TABEL REMINDER HISTORY
-- =====================================================

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
    unique (product_id, reminder_date, days_before_expiry)
);

-- =====================================================
-- 10. TABEL APP SETTINGS
-- =====================================================

create table if not exists public.app_settings (
    user_id uuid primary key references auth.users(id) on delete cascade,
    default_delay_seconds integer not null default 5
        check (default_delay_seconds between 1 and 3600),
    reminders_enabled boolean not null default true,
    reminder_days integer[] not null default array[3,2,1,0],
    default_template_id uuid references public.message_templates(id) on delete set null,
    timezone text not null default 'Asia/Jakarta',
    updated_at timestamptz not null default now()
);

-- =====================================================
-- 11. FUNGSI UPDATED_AT
-- =====================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists trg_customers_updated_at on public.customers;
create trigger trg_customers_updated_at
before update on public.customers
for each row execute function public.set_updated_at();

drop trigger if exists trg_products_updated_at on public.products;
create trigger trg_products_updated_at
before update on public.products
for each row execute function public.set_updated_at();

drop trigger if exists trg_message_templates_updated_at on public.message_templates;
create trigger trg_message_templates_updated_at
before update on public.message_templates
for each row execute function public.set_updated_at();

-- =====================================================
-- 12. KEAMANAN RLS UNTUK PROFILES
-- CATATAN: PROFILES MENGGUNAKAN KOLOM id
-- =====================================================

alter table public.profiles enable row level security;

drop policy if exists "owner_all" on public.profiles;

create policy "owner_all"
on public.profiles
for all
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

-- =====================================================
-- 13. KEAMANAN RLS UNTUK TABEL USER_ID
-- =====================================================

do $$
declare
    t text;
begin
    foreach t in array array[
        'customers',
        'products',
        'message_templates',
        'campaigns',
        'campaign_recipients',
        'message_reports',
        'scheduled_contents',
        'reminder_history',
        'app_settings'
    ]
    loop
        execute format(
            'alter table public.%I enable row level security',
            t
        );

        execute format(
            'drop policy if exists "owner_all" on public.%I',
            t
        );

        execute format(
            'create policy "owner_all"
             on public.%I
             for all
             to authenticated
             using ((select auth.uid()) = user_id)
             with check ((select auth.uid()) = user_id)',
            t
        );
    end loop;
end;
$$;

-- =====================================================
-- 14. INDEX DATABASE
-- =====================================================

create index if not exists idx_products_user_expiry
on public.products(user_id, expiry_date);

create index if not exists idx_customers_user_name
on public.customers(user_id, name);

create index if not exists idx_campaigns_user_schedule
on public.campaigns(user_id, scheduled_at);

create index if not exists idx_recipients_campaign_status
on public.campaign_recipients(campaign_id, status);

-- =====================================================
-- 15. FUNGSI OTOMATIS MEMBUAT PROFIL PENGGUNA
-- =====================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    insert into public.profiles (id, full_name)
    values (
        new.id,
        coalesce(new.raw_user_meta_data->>'full_name', '')
    );

    insert into public.app_settings (user_id)
    values (new.id);

    return new;
end;
$$;

-- =====================================================
-- 16. TRIGGER SAAT USER MENDAFTAR
-- =====================================================

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

-- =====================================================
-- SELESAI
-- WA & PRODUK MANAGER DATABASE SETUP
-- =====================================================
