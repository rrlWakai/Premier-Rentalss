begin;

create or replace function public.create_locked_booking(
  p_retreat_id uuid,
  p_property_id text,
  p_booking_date date,
  p_time_slot text,
  p_full_name text,
  p_email text,
  p_phone text,
  p_contact_number text,
  p_address text,
  p_booking_type text,
  p_preferred_dates text,
  p_preferred_time text,
  p_preferred_plan text,
  p_rate_tier text,
  p_mode_of_payment text,
  p_num_guests integer,
  p_num_cars integer,
  p_total_amount numeric,
  p_downpayment_amount numeric,
  p_special_requests text,
  p_locked_until timestamptz
)
returns table (
  id uuid,
  total_amount numeric,
  downpayment_amount numeric,
  locked_until timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key bigint;
begin
  if p_time_slot not in ('daytime', 'nighttime', 'overnight') then
    raise exception 'Invalid time slot';
  end if;

  v_key := hashtextextended(p_property_id || ':' || p_booking_date::text || ':' || p_time_slot, 0);
  perform pg_advisory_xact_lock(v_key);

  if exists (
    select 1
    from public.blocked_dates bd
    where bd.retreat_id = p_retreat_id
      and bd.date = p_booking_date
  ) then
    raise exception 'Slot already booked';
  end if;

  if exists (
    select 1
    from public.bookings b
    where b.property_id = p_property_id
      and b.booking_date = p_booking_date
      and b.time_slot = p_time_slot
      and (
        b.status = 'confirmed'
        or (b.locked_until is not null and b.locked_until > now())
      )
  ) then
    raise exception 'Slot already booked';
  end if;

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
    p_booking_date,
    p_preferred_dates,
    p_preferred_time,
    p_preferred_plan,
    p_rate_tier,
    p_mode_of_payment,
    p_num_guests,
    p_num_cars,
    p_num_guests,
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
  uuid, text, date, text, text, text, text, text, text, text, text, text, text, text, text, integer, integer, numeric, numeric, text, timestamptz
) from public;

grant execute on function public.create_locked_booking(
  uuid, text, date, text, text, text, text, text, text, text, text, text, text, text, text, integer, integer, numeric, numeric, text, timestamptz
) to service_role;

commit;
