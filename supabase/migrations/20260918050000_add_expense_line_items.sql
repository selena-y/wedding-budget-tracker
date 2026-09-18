alter table public.items
  add column if not exists line_items jsonb not null default '[]'::jsonb;

alter table public.items
  drop constraint if exists items_line_items_array_check;

alter table public.items
  add constraint items_line_items_array_check
  check (jsonb_typeof(line_items) = 'array');

comment on column public.items.line_items is
  'Itemized expense costs with title, quantity, unit cost, tax rate, and service fee rate.';
