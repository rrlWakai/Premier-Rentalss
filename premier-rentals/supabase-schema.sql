-- ================================================================
-- Premier Rentals — Supabase Schema v4 (Aligned with Frontend)
-- ================================================================

create extension if not exists "pgcrypto";

-- ── retreats ─────────────────────────────────────────────────────
create table if not exists public.retreats (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  slug             text unique not null,
  description      text,
  long_description text,
  price_day        numeric(10,2) default 0,
  price_night      numeric(10,2) default 0,
  price_overnight  numeric(10,2) default 0,
  max_guests       int default 20,
  image_url        text,
  gallery_urls     text[],
  tag              text,
  amenities        text[],
  created_at       timestamptz default now()
);

alter table public.retreats enable row level security;

create policy "Public read retreats"
on public.retreats for select
using (true);

create policy "Admin write retreats"
on public.retreats for all
using (auth.role() = 'authenticated');

-- ── bookings (UPDATED) ───────────────────────────────────────────
create table if not exists public.bookings (
  id                  uuid primary key default gen_random_uuid(),
  retreat_id          uuid references public.retreats(id) on delete cascade,

  -- Guest info
  full_name           text not null,
  email               text not null,
  phone               text not null,

  -- Booking type (aligned with frontend)
  booking_type        text not null check (booking_type in ('day','night','overnight')),

  -- Single date system (no checkout needed for day/night)
  checkin             date not null,
  checkout            date,

  guests              int default 1,

  -- 💰 Pricing
  total_amount        numeric(10,2) not null default 0,
  downpayment_amount  numeric(10,2) default 0,
  remaining_balance   numeric(10,2) generated always as (total_amount - downpayment_amount) stored,

  -- 📌 Status Flow
  status              text not null default 'pending'
    check (status in ('pending','confirmed','cancelled','completed')),

  payment_status      text not null default 'unpaid'
    check (payment_status in ('unpaid','partial','paid','failed','refunded')),

  payment_reference   text,

  special_requests    text,

  created_at          timestamptz default now()
);

alter table public.bookings enable row level security;

create policy "Public insert bookings"
on public.bookings for insert
with check (true);

create policy "Admin read bookings"
on public.bookings for select
using (auth.role() = 'authenticated');

create policy "Admin update bookings"
on public.bookings for update
using (auth.role() = 'authenticated');

-- ── blocked_dates (AUTO BLOCKING READY) ──────────────────────────
create table if not exists public.blocked_dates (
  id          uuid primary key default gen_random_uuid(),
  retreat_id  uuid references public.retreats(id) on delete cascade,
  date        date not null,
  reason      text,
  created_at  timestamptz default now(),
  unique (retreat_id, date)
);

alter table public.blocked_dates enable row level security;

create policy "Public read blocked_dates"
on public.blocked_dates for select
using (true);

create policy "Admin write blocked_dates"
on public.blocked_dates for all
using (auth.role() = 'authenticated');

-- ── AUTO BLOCK WHEN CONFIRMED (IMPORTANT FEATURE) ────────────────
create or replace function block_date_on_confirm()
returns trigger as $$
begin
  if new.status = 'confirmed' then
    insert into public.blocked_dates (retreat_id, date, reason)
    values (new.retreat_id, new.checkin, 'Booked')
    on conflict do nothing;
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_block_date on public.bookings;

create trigger trg_block_date
after update on public.bookings
for each row
execute function block_date_on_confirm();

-- ── testimonials ────────────────────────────────────────────────
create table if not exists public.testimonials (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  location    text,
  review      text not null,
  rating      int default 5 check (rating between 1 and 5),
  avatar_url  text,
  created_at  timestamptz default now()
);

alter table public.testimonials enable row level security;

create policy "Public read testimonials"
on public.testimonials for select
using (true);

create policy "Admin write testimonials"
on public.testimonials for all
using (auth.role() = 'authenticated');

-- ── inquiries ───────────────────────────────────────────────────
create table if not exists public.inquiries (
  id          uuid primary key default gen_random_uuid(),
  full_name   text not null,
  email       text not null,
  phone       text,
  message     text,
  check_in    date,
  guests      int,
  created_at  timestamptz default now()
);

alter table public.inquiries enable row level security;

create policy "Public insert inquiries"
on public.inquiries for insert
with check (true);

create policy "Admin read inquiries"
on public.inquiries for select
using (auth.role() = 'authenticated');

-- ── useful view ─────────────────────────────────────────────────
create or replace view public.bookings_detail as
select 
  b.*,
  r.name as retreat_name,
  r.slug as retreat_slug
from public.bookings b
left join public.retreats r on b.retreat_id = r.id;