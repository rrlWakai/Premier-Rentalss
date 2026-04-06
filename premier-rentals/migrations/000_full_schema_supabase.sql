-- ================================================================
-- Premier Rentals — Complete Supabase Schema
-- Single file. Safe to run on a fresh database.
-- All statements are idempotent (IF NOT EXISTS / OR REPLACE / DROP IF EXISTS).
-- ================================================================

-- ── Extensions ───────────────────────────────────────────────────
create extension if not exists "pgcrypto";

-- ================================================================
-- TABLES
-- ================================================================

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

-- ── bookings ─────────────────────────────────────────────────────
create table if not exists public.bookings (
  id                  uuid primary key default gen_random_uuid(),
  retreat_id          uuid references public.retreats(id) on delete cascade,

  -- Property (matches BOOKING_CATALOG key: "premier-pool-house" | "premier-patio")
  property_id         text,

  -- Guest info
  full_name           text not null,
  email               text not null,
  phone               text not null,
  contact_number      text,
  address             text default '',

  -- Slot
  booking_type        text not null default 'day'
    check (booking_type in ('day','night','overnight')),
  booking_date        date,
  checkin             date,
  checkout            date,
  time_slot           text
    check (time_slot is null or time_slot in ('daytime','nighttime','overnight')),

  -- Pricing
  total_amount        numeric(10,2) not null default 0,
  downpayment_amount  numeric(10,2) default 0,
  remaining_balance   numeric(10,2) generated always as (total_amount - downpayment_amount) stored,

  -- Status
  status              text not null default 'pending'
    check (status in ('pending','confirmed','cancelled','completed')),
  payment_status      text not null default 'unpaid'
    check (payment_status in ('unpaid','partial','paid','failed','refunded')),
  payment_reference   text,

  -- Checkout lifecycle
  locked_until        timestamptz,
  checkout_session_id text,

  -- Guest counts
  guests              int default 1,
  num_guests          int,
  num_cars            int,

  -- Metadata stored for admin/email
  preferred_dates     text,
  preferred_time      text,
  preferred_plan      text,
  rate_tier           text,
  mode_of_payment     text,
  special_requests    text,
  approved_at         timestamptz,

  created_at          timestamptz default now()
);

-- ── blocked_dates ─────────────────────────────────────────────────
create table if not exists public.blocked_dates (
  id          uuid primary key default gen_random_uuid(),
  retreat_id  uuid references public.retreats(id) on delete cascade,
  date        date not null,
  reason      text,
  created_at  timestamptz default now(),
  unique (retreat_id, date)
);

-- ── testimonials ─────────────────────────────────────────────────
create table if not exists public.testimonials (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  location    text,
  review      text not null,
  rating      int default 5 check (rating between 1 and 5),
  avatar_url  text,
  created_at  timestamptz default now()
);

-- ── inquiries ────────────────────────────────────────────────────
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

-- ── payments ─────────────────────────────────────────────────────
create table if not exists public.payments (
  id                  uuid primary key default gen_random_uuid(),
  booking_id          uuid references public.bookings(id) on delete cascade,
  checkout_session_id text,
  amount              numeric(10,2) not null default 0,
  status              text not null default 'pending'
    check (status in ('pending','paid','failed','cancelled','expired')),
  created_at          timestamptz default now()
);

-- ── payment_webhook_events ────────────────────────────────────────
create table if not exists public.payment_webhook_events (
  id          uuid primary key default gen_random_uuid(),
  event_id    text not null unique,
  event_type  text not null,
  booking_id  uuid references public.bookings(id) on delete cascade,
  payload     jsonb not null,
  created_at  timestamptz not null default now()
);

-- ── api_rate_limits ───────────────────────────────────────────────
create table if not exists public.api_rate_limits (
  scope          text not null,
  subject_hash   text not null,
  window_start   timestamptz not null,
  count          integer not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  primary key (scope, subject_hash, window_start)
);


-- ================================================================
-- INDEXES
-- ================================================================

create index if not exists idx_bookings_slot_lookup
  on public.bookings (property_id, booking_date, time_slot, status, locked_until);

create index if not exists idx_payments_booking_id
  on public.payments (booking_id);

create unique index if not exists idx_payments_checkout_session_id
  on public.payments (checkout_session_id)
  where checkout_session_id is not null;

create unique index if not exists idx_payments_booking_id_unique
  on public.payments (booking_id);

create index if not exists idx_payment_webhook_events_booking_id
  on public.payment_webhook_events (booking_id);


-- ================================================================
-- ROW LEVEL SECURITY
-- ================================================================

alter table public.retreats             enable row level security;
alter table public.bookings             enable row level security;
alter table public.blocked_dates        enable row level security;
alter table public.testimonials         enable row level security;
alter table public.inquiries            enable row level security;
alter table public.payments             enable row level security;
alter table public.payment_webhook_events enable row level security;
alter table public.api_rate_limits      enable row level security;

-- ── retreats policies ────────────────────────────────────────────
drop policy if exists "Public read retreats"    on public.retreats;
drop policy if exists "Admin write retreats"    on public.retreats;

create policy "Public read retreats"
  on public.retreats for select
  using (true);

create policy "Admin write retreats"
  on public.retreats for all
  using  ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- ── bookings policies ────────────────────────────────────────────
-- Public users may NOT read bookings directly (status checks go through /api/bookings/status).
-- All writes go through the create_locked_booking RPC (security definer).
-- Service role (Edge Functions) has unrestricted access.
drop policy if exists "Public insert bookings"    on public.bookings;
drop policy if exists "Block user select"         on public.bookings;
drop policy if exists "Block user update"         on public.bookings;
drop policy if exists "Service role unrestricted" on public.bookings;
drop policy if exists "Admin read bookings"       on public.bookings;
drop policy if exists "Admin update bookings"     on public.bookings;

create policy "Service role unrestricted"
  on public.bookings for all
  using (auth.role() = 'service_role');

create policy "Admin read bookings"
  on public.bookings for select
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "Admin update bookings"
  on public.bookings for update
  using  ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- ── blocked_dates policies ───────────────────────────────────────
drop policy if exists "Public read blocked_dates"  on public.blocked_dates;
drop policy if exists "Service role unrestricted"  on public.blocked_dates;
drop policy if exists "Admin write blocked_dates"  on public.blocked_dates;

create policy "Public read blocked_dates"
  on public.blocked_dates for select
  using (true);

create policy "Service role unrestricted"
  on public.blocked_dates for all
  using (auth.role() = 'service_role');

create policy "Admin write blocked_dates"
  on public.blocked_dates for all
  using  ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- ── testimonials policies ────────────────────────────────────────
drop policy if exists "Public read testimonials"  on public.testimonials;
drop policy if exists "Admin write testimonials"  on public.testimonials;

create policy "Public read testimonials"
  on public.testimonials for select
  using (true);

create policy "Admin write testimonials"
  on public.testimonials for all
  using  ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- ── inquiries policies ───────────────────────────────────────────
drop policy if exists "Public insert inquiries" on public.inquiries;
drop policy if exists "Admin read inquiries"    on public.inquiries;

create policy "Public insert inquiries"
  on public.inquiries for insert
  with check (true);

create policy "Admin read inquiries"
  on public.inquiries for select
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- ── payments policies ────────────────────────────────────────────
drop policy if exists "Admin read payments"  on public.payments;
drop policy if exists "Admin write payments" on public.payments;

create policy "Admin read payments"
  on public.payments for select
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "Admin write payments"
  on public.payments for all
  using  ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- ── payment_webhook_events policies ─────────────────────────────
drop policy if exists "Admin read payment webhook events" on public.payment_webhook_events;

create policy "Admin read payment webhook events"
  on public.payment_webhook_events for select
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- ── api_rate_limits — no direct client access ────────────────────
revoke all on table public.api_rate_limits from public;


-- ================================================================
-- RPC: create_locked_booking
-- Called by /api/bookings/create via service_role.
-- Atomically locks the slot, checks availability, inserts booking.
-- ================================================================

create or replace function public.create_locked_booking(
  p_retreat_id          uuid,
  p_property_id         text,
  p_booking_date        date,
  p_time_slot           text,
  p_full_name           text,
  p_email               text,
  p_phone               text,
  p_contact_number      text,
  p_address             text,
  p_booking_type        text,
  p_preferred_dates     text,
  p_preferred_time      text,
  p_preferred_plan      text,
  p_rate_tier           text,
  p_mode_of_payment     text,
  p_num_guests          integer,
  p_num_cars            integer,
  p_total_amount        numeric,
  p_downpayment_amount  numeric,
  p_special_requests    text,
  p_locked_until        timestamptz
)
returns table (
  id                 uuid,
  total_amount       numeric,
  downpayment_amount numeric,
  locked_until       timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key bigint;
begin
  -- Validate time slot
  if p_time_slot not in ('daytime', 'nighttime', 'overnight') then
    raise exception 'Invalid time slot';
  end if;

  -- Advisory lock scoped to this exact property + date + slot.
  -- Prevents two simultaneous requests from both passing the conflict check.
  v_key := hashtextextended(
    p_property_id || ':' || p_booking_date::text || ':' || p_time_slot,
    0
  );
  perform pg_advisory_xact_lock(v_key);

  -- Check manual full-date blocks (owner closures, maintenance, etc.)
  if exists (
    select 1
    from public.blocked_dates bd
    where bd.retreat_id = p_retreat_id
      and bd.date = p_booking_date
  ) then
    raise exception 'Slot already booked';
  end if;

  -- Check confirmed bookings and active locks for the same slot
  if exists (
    select 1
    from public.bookings b
    where b.property_id = p_property_id
      and b.booking_date = p_booking_date
      and b.time_slot    = p_time_slot
      and (
        b.status = 'confirmed'
        or (b.locked_until is not null and b.locked_until > now())
      )
  ) then
    raise exception 'Slot already booked';
  end if;

  -- Atomic insert with 15-minute hold
  return query
  insert into public.bookings (
    retreat_id,
    property_id,
    full_name,
    email,
    phone,
    contact_number,
    address,
    booking_type,
    booking_date,
    checkin,
    preferred_dates,
    preferred_time,
    preferred_plan,
    rate_tier,
    mode_of_payment,
    num_guests,
    num_cars,
    guests,
    total_amount,
    downpayment_amount,
    status,
    payment_status,
    locked_until,
    time_slot,
    special_requests
  )
  values (
    p_retreat_id,
    p_property_id,
    p_full_name,
    p_email,
    p_phone,
    p_contact_number,
    p_address,
    p_booking_type,
    p_booking_date,
    p_booking_date,      -- checkin mirrors booking_date
    p_preferred_dates,
    p_preferred_time,
    p_preferred_plan,
    p_rate_tier,
    p_mode_of_payment,
    p_num_guests,
    p_num_cars,
    p_num_guests,        -- guests mirrors num_guests (legacy column)
    p_total_amount,
    p_downpayment_amount,
    'pending',
    'unpaid',
    p_locked_until,
    p_time_slot,
    p_special_requests
  )
  returning
    bookings.id,
    bookings.total_amount,
    bookings.downpayment_amount,
    bookings.locked_until;
end;
$$;

revoke all on function public.create_locked_booking(
  uuid, text, date, text, text, text, text, text, text,
  text, text, text, text, text, text, integer, integer,
  numeric, numeric, text, timestamptz
) from public;

grant execute on function public.create_locked_booking(
  uuid, text, date, text, text, text, text, text, text,
  text, text, text, text, text, text, integer, integer,
  numeric, numeric, text, timestamptz
) to service_role;


-- ================================================================
-- RPC: consume_rate_limit
-- Called by Edge Functions to enforce per-IP / per-booking rate limits.
-- Returns: allowed (bool), retry_after_seconds (int), current_count (int)
-- ================================================================

create or replace function public.consume_rate_limit(
  p_scope          text,
  p_subject        text,
  p_max_requests   integer,
  p_window_seconds integer
)
returns table (
  allowed             boolean,
  retry_after_seconds integer,
  current_count       integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now             timestamptz := now();
  v_window_start    timestamptz;
  v_subject_hash    text;
  v_count           integer;
  v_elapsed_seconds integer;
begin
  if p_scope is null or p_scope = '' then
    raise exception 'Rate limit scope is required';
  end if;

  if p_subject is null or p_subject = '' then
    raise exception 'Rate limit subject is required';
  end if;

  if p_max_requests <= 0 or p_window_seconds <= 0 then
    raise exception 'Invalid rate limit configuration';
  end if;

  v_window_start := to_timestamp(
    floor(extract(epoch from v_now) / p_window_seconds) * p_window_seconds
  );
  v_subject_hash := encode(digest(p_subject, 'sha256'), 'hex');

  -- Advisory lock prevents race conditions between concurrent requests
  perform pg_advisory_xact_lock(
    hashtextextended(
      p_scope || ':' || v_subject_hash || ':' || v_window_start::text,
      0
    )
  );

  insert into public.api_rate_limits (
    scope, subject_hash, window_start, count, created_at, updated_at
  )
  values (
    p_scope, v_subject_hash, v_window_start, 1, v_now, v_now
  )
  on conflict (scope, subject_hash, window_start)
  do update
    set count      = public.api_rate_limits.count + 1,
        updated_at = v_now
  returning count into v_count;

  -- Clean up entries older than 1 day
  delete from public.api_rate_limits
  where updated_at < v_now - interval '1 day';

  v_elapsed_seconds := greatest(
    0,
    floor(extract(epoch from (v_now - v_window_start)))::integer
  );

  return query
  select
    v_count <= p_max_requests,
    case
      when v_count <= p_max_requests then 0
      else greatest(1, p_window_seconds - v_elapsed_seconds)
    end,
    v_count;
end;
$$;

revoke all on function public.consume_rate_limit(text, text, integer, integer) from public;

grant execute on function public.consume_rate_limit(text, text, integer, integer)
  to service_role;


-- ================================================================
-- VERIFICATION QUERIES
-- Run these after applying the schema to confirm everything is correct.
-- ================================================================

-- 1. Confirm RPC signature (must return pronargs = 21)
-- select proname, pronargs from pg_proc where proname = 'create_locked_booking';

-- 2. Confirm remaining_balance is a generated column
-- select column_name, generation_expression
-- from information_schema.columns
-- where table_name = 'bookings' and column_name = 'remaining_balance';

-- 3. List all RLS policies
-- select tablename, policyname, cmd, qual
-- from pg_policies
-- where schemaname = 'public'
-- order by tablename, policyname;
