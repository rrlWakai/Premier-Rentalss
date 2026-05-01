drop schema public cascade;
create schema public;
grant usage on schema public to anon, authenticated, service_role;
grant all on schema public to postgres;

create extension if not exists pgcrypto;

create type booking_status_enum as enum ('pending','confirmed','cancelled','completed');
create type payment_status_enum as enum ('unpaid','partial','paid','failed','refunded');
create type time_slot_enum as enum ('daytime','nighttime','overnight');
create type booking_type_enum as enum ('day','night','overnight');
create type discount_scope_enum as enum ('all','property','rate');

-- 1. retreats
create table public.retreats (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  slug             text not null unique,
  description      text,
  long_description text,
  price_day        numeric(10,2) not null default 0,
  price_night      numeric(10,2) not null default 0,
  price_overnight  numeric(10,2) not null default 0,
  max_guests       int not null default 20,
  image_url        text,
  gallery_urls     text[],
  tag              text,
  amenities        text[],
  created_at       timestamptz not null default now()
);

-- 2. profiles
create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  role       text not null default 'user' check (role in ('user','admin')),
  created_at timestamptz not null default now()
);

-- 3. discounts
create table public.discounts (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  percentage   numeric(5,2) not null check (percentage > 0 and percentage <= 100),
  applies_to   discount_scope_enum not null,
  property_ids text[],
  rate_labels  text[],
  start_date   date not null,
  end_date     date not null,
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  check (end_date >= start_date)
);

-- 4. bookings
create table public.bookings (
  id                  uuid primary key default gen_random_uuid(),
  retreat_id          uuid references public.retreats(id) on delete set null,
  property_id         text not null,
  full_name           text not null,
  email               text not null,
  phone               text not null,
  address             text not null default '',
  booking_type        booking_type_enum not null default 'day',
  booking_date        date not null,
  time_slot           time_slot_enum not null,
  guests              int not null default 1,
  num_guests          int,
  num_cars            int,
  total_amount        numeric(10,2) not null default 0,
  downpayment_amount  numeric(10,2) not null default 0,
  remaining_balance   numeric(10,2) generated always as (total_amount - downpayment_amount) stored,
  status              booking_status_enum not null default 'pending',
  payment_status      payment_status_enum not null default 'unpaid',
  checkout_session_id text,
  rate_tier           text,
  mode_of_payment     text,
  special_requests    text,
  created_at          timestamptz not null default now()
);

-- 5. blocked_dates
create table public.blocked_dates (
  id         uuid primary key default gen_random_uuid(),
  retreat_id uuid not null references public.retreats(id) on delete cascade,
  date       date not null,
  reason     text,
  created_at timestamptz not null default now(),
  unique (retreat_id, date)
);

-- 6. testimonials
create table public.testimonials (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  location   text,
  review     text not null,
  rating     int not null default 5 check (rating between 1 and 5),
  avatar_url text,
  created_at timestamptz not null default now()
);

-- 7. inquiries
create table public.inquiries (
  id         uuid primary key default gen_random_uuid(),
  full_name  text not null,
  email      text not null,
  phone      text,
  message    text,
  check_in   date,
  guests     int,
  created_at timestamptz not null default now()
);

-- 8. checkout_sessions
create table public.checkout_sessions (
  id                   uuid primary key default gen_random_uuid(),
  checkout_session_id  text not null unique,
  booking_id           uuid,
  booking_payload      jsonb not null,
  consumed             boolean not null default false,
  consumed_at          timestamptz,
  created_at           timestamptz not null default now()
);

-- 9. failed_bookings
create table public.failed_bookings (
  id                   uuid primary key default gen_random_uuid(),
  checkout_session_id  text not null,
  user_email           text,
  amount               numeric,
  booking_payload      jsonb not null,
  reason               text not null,
  created_at           timestamptz not null default now()
);

-- 10. payments
create table public.payments (
  id                   uuid primary key default gen_random_uuid(),
  booking_id           uuid references public.bookings(id) on delete cascade,
  checkout_session_id  text,
  amount               numeric(10,2) not null default 0,
  status               text not null default 'pending'
                         check (status in ('pending','paid','failed','cancelled','expired')),
  created_at           timestamptz not null default now()
);

-- 11. payment_webhook_events
create table public.payment_webhook_events (
  id         uuid primary key default gen_random_uuid(),
  event_id   text not null unique,
  event_type text not null,
  booking_id uuid references public.bookings(id) on delete set null,
  payload    jsonb not null,
  created_at timestamptz not null default now()
);

-- 12. api_rate_limits
create table public.api_rate_limits (
  scope        text not null,
  subject_hash text not null,
  window_start timestamptz not null,
  count        integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  primary key (scope, subject_hash, window_start)
);

-- Prevent double booking same slot
create unique index unique_booking_slot
  on public.bookings (property_id, booking_date, time_slot)
  where status in ('pending','confirmed');

create index idx_booking_lookup
  on public.bookings (property_id, booking_date, time_slot);

create index idx_bookings_created_at
  on public.bookings (created_at desc);

create index idx_payments_booking_id
  on public.payments (booking_id);

create unique index idx_payments_checkout_session_id
  on public.payments (checkout_session_id)
  where checkout_session_id is not null;

create unique index idx_payments_booking_id_unique
  on public.payments (booking_id);

create index idx_payment_webhook_events_booking_id
  on public.payment_webhook_events (booking_id);

create index idx_discounts_active_window
  on public.discounts (active, start_date, end_date);

alter table public.retreats              enable row level security;
alter table public.profiles              enable row level security;
alter table public.discounts             enable row level security;
alter table public.bookings              enable row level security;
alter table public.blocked_dates         enable row level security;
alter table public.testimonials          enable row level security;
alter table public.inquiries             enable row level security;
alter table public.checkout_sessions     enable row level security;
alter table public.failed_bookings       enable row level security;
alter table public.payments              enable row level security;
alter table public.payment_webhook_events enable row level security;
alter table public.api_rate_limits       enable row level security;

-- retreats
create policy "public read retreats" on public.retreats
  for select using (true);
create policy "admin write retreats" on public.retreats
  for all using ((auth.jwt()->'app_metadata'->>'role') = 'admin')
  with check ((auth.jwt()->'app_metadata'->>'role') = 'admin');

-- profiles
create policy "users read own profile" on public.profiles
  for select using (auth.uid() = id);
create policy "users insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

-- discounts
create policy "public read active discounts" on public.discounts
  for select using (active = true);
create policy "admin manage discounts" on public.discounts
  for all using ((auth.jwt()->'app_metadata'->>'role') = 'admin')
  with check ((auth.jwt()->'app_metadata'->>'role') = 'admin');
create policy "service role discounts" on public.discounts
  for all using (auth.role() = 'service_role');

-- bookings
create policy "service role unrestricted bookings" on public.bookings
  for all using (auth.role() = 'service_role');
create policy "admin read bookings" on public.bookings
  for select using (
    (auth.jwt()->'app_metadata'->>'role') in ('admin','staff')
  );
create policy "admin update bookings" on public.bookings
  for update
  using ((auth.jwt()->'app_metadata'->>'role') in ('admin','staff'))
  with check ((auth.jwt()->'app_metadata'->>'role') in ('admin','staff'));

-- blocked_dates
create policy "public read blocked dates" on public.blocked_dates
  for select using (true);
create policy "service role blocked dates" on public.blocked_dates
  for all using (auth.role() = 'service_role');
create policy "admin write blocked dates" on public.blocked_dates
  for all using ((auth.jwt()->'app_metadata'->>'role') = 'admin')
  with check ((auth.jwt()->'app_metadata'->>'role') = 'admin');

-- testimonials
create policy "public read testimonials" on public.testimonials
  for select using (true);
create policy "admin write testimonials" on public.testimonials
  for all using ((auth.jwt()->'app_metadata'->>'role') = 'admin')
  with check ((auth.jwt()->'app_metadata'->>'role') = 'admin');

-- inquiries
create policy "public insert inquiries" on public.inquiries
  for insert with check (true);
create policy "admin read inquiries" on public.inquiries
  for select using (
    (auth.jwt()->'app_metadata'->>'role') in ('admin','staff')
  );

-- checkout_sessions
create policy "service role checkout sessions" on public.checkout_sessions
  for all using (auth.role() = 'service_role');

-- failed_bookings
create policy "service role failed bookings" on public.failed_bookings
  for all using (auth.role() = 'service_role');

-- payments
create policy "service role payments" on public.payments
  for all using (auth.role() = 'service_role');
create policy "admin read payments" on public.payments
  for select using (
    (auth.jwt()->'app_metadata'->>'role') in ('admin','staff')
  );
create policy "admin write payments" on public.payments
  for all using ((auth.jwt()->'app_metadata'->>'role') = 'admin')
  with check ((auth.jwt()->'app_metadata'->>'role') = 'admin');

-- payment_webhook_events
create policy "service role webhook events" on public.payment_webhook_events
  for all using (auth.role() = 'service_role');
create policy "admin read webhook events" on public.payment_webhook_events
  for select using (
    (auth.jwt()->'app_metadata'->>'role') = 'admin'
  );

-- api_rate_limits: only service_role
revoke all on table public.api_rate_limits from public, anon, authenticated;

-- consume_rate_limit
create or replace function public.consume_rate_limit(
  p_scope          text,
  p_subject        text,
  p_max_requests   integer,
  p_window_seconds integer
)
returns table(allowed boolean, retry_after_seconds integer, current_count integer)
language plpgsql security definer
set search_path = public, extensions
as $$
declare
  v_now          timestamptz := now();
  v_window_start timestamptz;
  v_subject_hash text;
  v_count        integer;
  v_elapsed      integer;
begin
  if p_scope is null or p_scope = '' then
    raise exception 'scope required';
  end if;
  if p_subject is null or p_subject = '' then
    raise exception 'subject required';
  end if;
  if p_max_requests <= 0 or p_window_seconds <= 0 then
    raise exception 'invalid rate limit config';
  end if;

  v_window_start := to_timestamp(
    floor(extract(epoch from v_now) / p_window_seconds) * p_window_seconds
  );
  v_subject_hash := encode(extensions.digest(p_subject, 'sha256'), 'hex');

  perform pg_advisory_xact_lock(
    hashtextextended(p_scope || ':' || v_subject_hash || ':' || v_window_start::text, 0)
  );

  insert into public.api_rate_limits(scope, subject_hash, window_start, count, created_at, updated_at)
  values (p_scope, v_subject_hash, v_window_start, 1, v_now, v_now)
  on conflict (scope, subject_hash, window_start)
  do update set count = api_rate_limits.count + 1, updated_at = v_now
  returning count into v_count;

  delete from public.api_rate_limits
  where updated_at < v_now - interval '1 day';

  v_elapsed := greatest(0,
    floor(extract(epoch from (v_now - v_window_start)))::integer
  );

  return query select
    v_count <= p_max_requests,
    case when v_count <= p_max_requests then 0
         else greatest(1, p_window_seconds - v_elapsed) end,
    v_count;
end;
$$;

revoke all on function public.consume_rate_limit(text,text,integer,integer) from public;
grant execute on function public.consume_rate_limit(text,text,integer,integer) to service_role;

-- atomic_webhook_booking
create or replace function public.atomic_webhook_booking(
  p_session_id     uuid,
  p_insert_data    jsonb,
  p_paymongo_cs_id text,
  p_event_id       text
)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_session    checkout_sessions%rowtype;
  v_booking_id uuid;
begin
  select * into v_session
  from checkout_sessions
  where id = p_session_id
  for update;

  if not found then
    return jsonb_build_object('status', 'session_not_found');
  end if;

  if v_session.consumed then
    return jsonb_build_object('status', 'already_consumed');
  end if;

  insert into bookings (
    property_id, retreat_id, booking_date, time_slot,
    full_name, email, phone, address,
    guests, num_guests, num_cars,
    total_amount, downpayment_amount,
    status, payment_status, checkout_session_id,
    booking_type, special_requests, rate_tier, mode_of_payment
  ) values (
    nullif(p_insert_data->>'property_id', ''),
    nullif(p_insert_data->>'retreat_id', '')::uuid,
    (p_insert_data->>'booking_date')::date,
    (p_insert_data->>'time_slot')::time_slot_enum,
    p_insert_data->>'full_name',
    p_insert_data->>'email',
    p_insert_data->>'phone',
    coalesce(p_insert_data->>'address', ''),
    coalesce((p_insert_data->>'guests')::int, 1),
    (p_insert_data->>'num_guests')::int,
    (p_insert_data->>'num_cars')::int,
    (p_insert_data->>'total_amount')::numeric,
    (p_insert_data->>'downpayment_amount')::numeric,
    'confirmed',
    'paid',
    p_paymongo_cs_id,
    coalesce(
      (p_insert_data->>'booking_type')::booking_type_enum,
      'day'::booking_type_enum
    ),
    p_insert_data->>'special_requests',
    p_insert_data->>'rate_tier',
    p_insert_data->>'mode_of_payment'
  )
  returning id into v_booking_id;

  update checkout_sessions
  set consumed = true, consumed_at = now()
  where id = p_session_id;

  update payment_webhook_events
  set booking_id = v_booking_id
  where event_id = p_event_id;

  return jsonb_build_object('status', 'ok', 'booking_id', v_booking_id);
end;
$$;

revoke all on function public.atomic_webhook_booking(uuid,jsonb,text,text) from public;
grant execute on function public.atomic_webhook_booking(uuid,jsonb,text,text) to service_role;
