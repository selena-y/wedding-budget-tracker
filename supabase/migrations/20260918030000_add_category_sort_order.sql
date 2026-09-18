alter table public.categories
  add column if not exists sort_order integer not null default 0;

-- Put the canonical defaults first in the intended product order, followed by
-- custom and legacy categories in their existing creation order.
with ranked_categories as (
  select
    id,
    row_number() over (
      partition by wedding_id
      order by
        case name
          when 'Venue + Catering' then 0
          when 'Wedding Attire' then 1
          when 'Beauty Services' then 2
          when 'Stationery and Invitations' then 3
          when 'Decor' then 4
          when 'Florals' then 5
          when 'Music and Entertainment' then 6
          when 'Transportation' then 7
          when 'Favors and Gifts' then 8
          when 'Officiant' then 9
          when 'Photography & Videography' then 10
          when 'Misc' then 11
          else 1000
        end,
        created_at,
        id
    ) - 1 as position
  from public.categories
)
update public.categories as category
set sort_order = ranked.position
from ranked_categories as ranked
where category.id = ranked.id;

create index if not exists categories_wedding_sort_order_idx
  on public.categories (wedding_id, sort_order);

comment on column public.categories.sort_order is
  'User-controlled display order within a wedding.';
