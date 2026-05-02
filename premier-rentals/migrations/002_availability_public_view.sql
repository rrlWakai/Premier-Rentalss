-- Create availability_public view for client-side calendar
-- Only exposes property_id, start_date, end_date, status
-- Maps booking statuses to availability: confirmed/blocked/completed → unavailable, pending → pending, else → available

create or replace view public.availability_public as
select
  b.property_id,
  b.booking_date as start_date,
  b.booking_date as end_date,
  case
    when b.status in ('confirmed', 'completed') then 'unavailable'
    when b.status = 'pending' then 'pending'
    else 'available'
  end as status
from public.bookings b
where b.status not in ('cancelled') -- exclude cancelled bookings

union all

-- Include blocked dates as unavailable
select
  bd.retreat_id as property_id,
  bd.date as start_date,
  bd.date as end_date,
  'unavailable' as status
from public.blocked_dates bd;

-- Grant SELECT on availability_public to anon role only
grant select on public.availability_public to anon;

-- Enable RLS on bookings table (already enabled in migration, but ensuring)
alter table public.bookings enable row level security;

-- Create policy for anon to read availability_public (views inherit policies from underlying tables)
-- Since we're using a view, we need to ensure the underlying tables allow anon access for this specific use case
-- The view itself will be accessible to anon since we granted select above