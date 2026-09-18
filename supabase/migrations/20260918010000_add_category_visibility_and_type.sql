alter table public.categories
  add column if not exists is_visible boolean not null default true,
  add column if not exists category_type text not null default 'custom';

alter table public.categories
  drop constraint if exists categories_category_type_check;

alter table public.categories
  add constraint categories_category_type_check
  check (category_type in ('default', 'custom'));

-- Classify the product's built-in categories without changing existing
-- budgets, items, or user-created category names.
update public.categories
set category_type = case
  when name in (
    'Venue + Catering',
    'Wedding Attire',
    'Beauty Services',
    'Stationery and Invitations',
    'Decor',
    'Florals',
    'Music and Entertainment',
    'Transportation',
    'Favors and Gifts',
    'Officiant',
    'Photography & Videography',
    'Misc'
  ) then 'default'
  else 'custom'
end;

comment on column public.categories.is_visible is
  'Whether the category is shown in the planner navigation and summary.';

comment on column public.categories.category_type is
  'Product-owned default category or user-owned custom category.';
