-- Link incoming sales payments to the cash/bank/e-wallet account.
-- Apply after 20261104_all_in_one_foundation.sql.
alter table public.cash_accounts
  add constraint cash_accounts_user_id_id_key unique (user_id, id);

alter table public.payments
  add column if not exists cash_account_id uuid;

alter table public.payments
  add constraint payments_cash_account_owner_fk
  foreign key (user_id, cash_account_id)
  references public.cash_accounts(user_id, id)
  on delete set null (cash_account_id);

create index if not exists idx_payments_cash_account
  on public.payments(user_id, cash_account_id, paid_at desc)
  where status = 'completed';
