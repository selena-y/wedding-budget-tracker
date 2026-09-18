alter table public.items
  add column if not exists payment_structure text,
  add column if not exists payment_schedule jsonb not null default '[]'::jsonb;

alter table public.items
  drop constraint if exists items_payment_structure_check;

alter table public.items
  add constraint items_payment_structure_check
  check (payment_structure is null or payment_structure in ('itemized', 'deposit_final'));

alter table public.items
  drop constraint if exists items_payment_schedule_array_check;

alter table public.items
  add constraint items_payment_schedule_array_check
  check (jsonb_typeof(payment_schedule) = 'array');

comment on column public.items.payment_structure is
  'Either a flexible itemized payment schedule or a deposit and final payment schedule.';

comment on column public.items.payment_schedule is
  'Scheduled payments with amount, due date, paid status, payer, and payment method.';
