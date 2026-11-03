
-- RLS: setiap pengguna hanya dapat mengakses datanya sendiri.

-- Kebijakan khusus tabel profiles karena menggunakan kolom id.
alter table public.profiles enable row level security;

drop policy if exists "owner_all" on public.profiles;

create policy "owner_all"
on public.profiles
for all
using (auth.uid() = id)
with check (auth.uid() = id);

-- Kebijakan untuk tabel lain yang menggunakan user_id.
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
      'create policy "owner_all" on public.%I
       for all
       using (auth.uid() = user_id)
       with check (auth.uid() = user_id)',
      t
    );
  end loop;
end $$;
