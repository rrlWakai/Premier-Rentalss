-- ================================================================
-- Premier Rentals — Supabase Schema v5 (PayMongo + Slot Booking)
-- ================================================================
-- NOTE:
-- This file is a legacy bootstrap reference only.
-- For real deployments, apply the SQL files in /migrations in order.
-- The migrations are the source of truth for RLS, RPCs, webhook idempotency,
-- checkout locking, and rate limiting.

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

-- ── blocked_dates (MANUAL FULL-DATE BLOCKS) ──────────────────────
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

-- NOTE:
-- blocked_dates is reserved for manual whole-date closures such as maintenance,
-- owner holds, or dates intentionally closed by admins.
--
-- Confirmed bookings are NOT auto-inserted into blocked_dates because availability
-- is now checked per property + booking_date + time_slot. Auto-blocking the full
-- date would incorrectly prevent multiple valid time slots on the same day.
drop trigger if exists trg_block_date on public.bookings;
drop function if exists block_date_on_confirm();

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

-- ── schema alignment for request-style + checkout booking flow ───────────
alter table public.bookings
  add column if not exists property_id text,
  add column if not exists booking_date date,
  add column if not exists time_slot text,
  add column if not exists locked_until timestamptz,
  add column if not exists checkout_session_id text,
  add column if not exists contact_number text,
  add column if not exists address text default '',
  add column if not exists preferred_dates text,
  add column if not exists preferred_time text,
  add column if not exists preferred_plan text,
  add column if not exists rate_tier text,
  add column if not exists mode_of_payment text,
  add column if not exists num_guests int,
  add column if not exists num_cars int,
  add column if not exists approved_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'bookings_time_slot_check'
      and conrelid = 'public.bookings'::regclass
  ) then
    alter table public.bookings
      add constraint bookings_time_slot_check
      check (time_slot is null or time_slot in ('daytime', 'nighttime', 'overnight'));
  end if;
end $$;

create index if not exists idx_bookings_slot_lookup
on public.bookings (property_id, booking_date, time_slot, status, locked_until);

create table if not exists public.payments (
  id                  uuid primary key default gen_random_uuid(),
  booking_id          uuid references public.bookings(id) on delete cascade,
  checkout_session_id text,
  amount              numeric(10,2) not null default 0,
  status              text not null default 'pending',
  created_at          timestamptz default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'payments_status_check'
      and conrelid = 'public.payments'::regclass
  ) then
    alter table public.payments
      add constraint payments_status_check
      check (status in ('pending', 'paid', 'failed', 'cancelled', 'expired'));
  end if;
end $$;

alter table public.payments enable row level security;

create policy "Admin read payments"
on public.payments for select
using (auth.role() = 'authenticated');

create policy "Admin write payments"
on public.payments for all
using (auth.role() = 'authenticated');

create index if not exists idx_payments_booking_id
on public.payments (booking_id);

create unique index if not exists idx_payments_checkout_session_id
on public.payments (checkout_session_id)
where checkout_session_id is not null;

-- ── useful view ─────────────────────────────────────────────────
create or replace view public.bookings_detail as
select 
  b.*,
  r.name as retreat_name,
  r.slug as retreat_slug
from public.bookings b
left join public.retreats r on b.retreat_id = r.id;
