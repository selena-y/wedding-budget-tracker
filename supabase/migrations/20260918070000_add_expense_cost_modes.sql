alter table public.items
  add column if not exists cost_mode text not null default 'simple',
  add column if not exists service_fee_rate numeric not null default 0;

update public.items
set cost_mode = 'itemized'
where jsonb_typeof(line_items) = 'array'
  and jsonb_array_length(line_items) > 0;

alter table public.items
  drop constraint if exists items_cost_mode_check,
  add constraint items_cost_mode_check
    check (cost_mode in ('simple', 'itemized')),
  drop constraint if exists items_service_fee_rate_check,
  add constraint items_service_fee_rate_check
    check (service_fee_rate >= 0);

comment on column public.items.cost_mode is
  'Controls whether the expense uses one simple cost or multiple itemized costs.';

comment on column public.items.service_fee_rate is
  'Percentage service fee applied to the subtotal when cost_mode is simple.';
