-- Upgrade categories created by earlier versions of the app. Each rename keeps
-- the existing category id, budget, and linked expense items intact. If the
-- destination category already exists for a wedding, the legacy row is left as
-- a custom category rather than risking a duplicate or merging financial data.

update public.categories as category
set name = 'Venue + Catering', category_type = 'default'
where category.name = 'Venue & reception'
  and not exists (
    select 1 from public.categories as existing
    where existing.wedding_id = category.wedding_id
      and existing.name = 'Venue + Catering'
  );

update public.categories as category
set name = 'Venue + Catering', category_type = 'default'
where category.name = 'Catering & bar'
  and not exists (
    select 1 from public.categories as existing
    where existing.wedding_id = category.wedding_id
      and existing.name = 'Venue + Catering'
  );

update public.categories as category
set name = 'Wedding Attire', category_type = 'default'
where category.name = 'Attire & beauty'
  and not exists (
    select 1 from public.categories as existing
    where existing.wedding_id = category.wedding_id
      and existing.name = 'Wedding Attire'
  );

update public.categories as category
set name = 'Stationery and Invitations', category_type = 'default'
where category.name = 'Invitations & stationery'
  and not exists (
    select 1 from public.categories as existing
    where existing.wedding_id = category.wedding_id
      and existing.name = 'Stationery and Invitations'
  );

update public.categories as category
set name = 'Decor', category_type = 'default'
where category.name = 'Flowers & decor'
  and not exists (
    select 1 from public.categories as existing
    where existing.wedding_id = category.wedding_id
      and existing.name = 'Decor'
  );

update public.categories as category
set name = 'Music and Entertainment', category_type = 'default'
where category.name = 'Music & entertainment'
  and not exists (
    select 1 from public.categories as existing
    where existing.wedding_id = category.wedding_id
      and existing.name = 'Music and Entertainment'
  );

update public.categories as category
set name = 'Favors and Gifts', category_type = 'default'
where category.name = 'Favors & gifts'
  and not exists (
    select 1 from public.categories as existing
    where existing.wedding_id = category.wedding_id
      and existing.name = 'Favors and Gifts'
  );

update public.categories as category
set name = 'Photography & Videography', category_type = 'default'
where category.name = 'Photography & videography'
  and not exists (
    select 1 from public.categories as existing
    where existing.wedding_id = category.wedding_id
      and existing.name = 'Photography & Videography'
  );

update public.categories as category
set name = 'Misc', category_type = 'default'
where category.name = 'Miscellaneous & contingency'
  and not exists (
    select 1 from public.categories as existing
    where existing.wedding_id = category.wedding_id
      and existing.name = 'Misc'
  );

-- Ensure canonical rows are protected even if they were created before the
-- category_type field existed.
update public.categories
set category_type = 'default'
where name in (
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
);

-- Add any defaults that the wedding does not have yet. This is idempotent and
-- does not alter existing category budgets or expense relationships.
insert into public.categories (
  wedding_id,
  name,
  budget,
  is_visible,
  category_type
)
select
  wedding.id,
  default_category.name,
  0,
  true,
  'default'
from public.weddings as wedding
cross join (
  values
    ('Venue + Catering'),
    ('Wedding Attire'),
    ('Beauty Services'),
    ('Stationery and Invitations'),
    ('Decor'),
    ('Florals'),
    ('Music and Entertainment'),
    ('Transportation'),
    ('Favors and Gifts'),
    ('Officiant'),
    ('Photography & Videography'),
    ('Misc')
) as default_category(name)
where not exists (
  select 1
  from public.categories as existing
  where existing.wedding_id = wedding.id
    and existing.name = default_category.name
);
