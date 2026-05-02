-- Drop and recreate clean view
drop view if exists public.availability_public;

create or replace view public.availability_public
with (security_invoker = false) as

-- bookings: property_id is already a text slug
select
  b.property_id,
  b.booking_date   as date,
  case
    when b.status in ('confirmed', 'completed') then 'unavailable'
    when b.status = 'pending'                     then 'pending'
  end as status
from  public.bookings b
where b.status not in ('cancelled')

union all

-- blocked_dates: join retreats to get text slug (fixes uuid/text mismatch)
select
  r.slug           as property_id,
  bd.date          as date,
  'unavailable'    as status
from  public.blocked_dates bd
join  public.retreats r on r.id = bd.retreat_id;

-- Grant to anon only (re-run after every view recreate)
grant select on public.availability_public to anon;
grant select on public.availability_public to authenticated;

-- Create policy for anon to read availability_public (views inherit policies from underlying tables)
-- Since we're using a view, we need to ensure the underlying tables allow anon access for this specific use case
-- The view itself will be accessible to anon since we granted select above