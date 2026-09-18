alter table public.items
  add column if not exists tax_rate numeric not null default 0,
  add column if not exists who_paid text,
  add column if not exists payment_method text,
  add column if not exists deposit_paid boolean not null default false;

alter table public.items
  drop constraint if exists items_tax_rate_check;

alter table public.items
  add constraint items_tax_rate_check check (tax_rate >= 0);

alter table public.items
  drop constraint if exists items_payment_method_check;

alter table public.items
  add constraint items_payment_method_check
  check (payment_method is null or payment_method in ('cash', 'credit', 'debit', 'etransfer', 'other'));

-- Preserve the meaning of legacy dollar-based tax entries by converting them
-- into a percentage of their pre-tax subtotal.
update public.items
set tax_rate = case
  when coalesce(quantity, 0) * coalesce(unit_cost, 0) > 0
    then round((coalesce(tax, 0) / (quantity * unit_cost)) * 100, 4)
  else 0
end
where coalesce(tax_rate, 0) = 0
  and coalesce(tax, 0) > 0;

update public.items
set deposit_paid = true
where requires_deposit = true
  and coalesce(deposit_amount, 0) > 0
  and coalesce(amount_paid, 0) >= deposit_amount;

comment on column public.items.tax_rate is 'Tax percentage applied to the pre-tax subtotal.';
comment on column public.items.who_paid is 'Person who made the payment.';
comment on column public.items.payment_method is 'How the payment was made.';
comment on column public.items.deposit_paid is 'Whether the required deposit has been paid.';
