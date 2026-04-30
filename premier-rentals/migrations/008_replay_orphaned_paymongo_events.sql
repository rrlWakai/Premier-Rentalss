begin;

-- One-time recovery script:
-- 1) replay unmatched paid webhook events by resolving checkout_sessions
-- 2) mark recovered sessions consumed and backfill webhook booking_id
-- 3) cleanup stale orphan rows (older than 24h)

do $$
declare
  rec record;
  v_booking_id uuid;
  v_event_checkout_session_id text;
  v_event_metadata_booking_id text;
begin
  for rec in
    select
      e.id as webhook_row_id,
      e.event_id,
      e.payload,
      cs.id as checkout_row_id,
      cs.checkout_session_id,
      cs.booking_payload
    from public.payment_webhook_events e
    join lateral (
      select s.*
      from public.checkout_sessions s
      where
        s.checkout_session_id = (e.payload #>> '{data,attributes,data,id}')
        or s.booking_id::text = coalesce(
          e.payload #>> '{data,attributes,data,attributes,metadata,booking_id}',
          e.payload #>> '{data,attributes,data,attributes,payments,0,attributes,metadata,booking_id}'
        )
        or s.checkout_session_id = coalesce(
          e.payload #>> '{data,attributes,data,attributes,metadata,booking_id}',
          e.payload #>> '{data,attributes,data,attributes,payments,0,attributes,metadata,booking_id}'
        )
      order by s.created_at desc
      limit 1
    ) cs on true
    where e.booking_id is null
      and e.event_type in ('payment.paid', 'checkout_session.payment.paid')
      and coalesce(cs.consumed, false) = false
  loop
    v_event_checkout_session_id := rec.payload #>> '{data,attributes,data,id}';
    v_event_metadata_booking_id := coalesce(
      rec.payload #>> '{data,attributes,data,attributes,metadata,booking_id}',
      rec.payload #>> '{data,attributes,data,attributes,payments,0,attributes,metadata,booking_id}'
    );

    begin
      insert into public.bookings (
        retreat_id,
        property_id,
        booking_date,
        time_slot,
        full_name,
        email,
        phone,
        address,
        guests,
        num_guests,
        num_cars,
        total_amount,
        downpayment_amount,
        status,
        payment_status,
        checkout_session_id,
        booking_type,
        special_requests,
        rate_tier,
        mode_of_payment
      ) values (
        (rec.booking_payload->>'retreat_id')::uuid,
        rec.booking_payload->>'property_id',
        (rec.booking_payload->>'booking_date')::date,
        rec.booking_payload->>'time_slot',
        rec.booking_payload->>'full_name',
        rec.booking_payload->>'email',
        rec.booking_payload->>'phone',
        coalesce(rec.booking_payload->>'address', ''),
        coalesce((rec.booking_payload->>'guests')::int, (rec.booking_payload->>'num_guests')::int, 1),
        coalesce((rec.booking_payload->>'num_guests')::int, (rec.booking_payload->>'guests')::int, 1),
        coalesce((rec.booking_payload->>'num_cars')::int, (rec.booking_payload->>'cars')::int, 0),
        (rec.booking_payload->>'total_amount')::numeric,
        (rec.booking_payload->>'downpayment_amount')::numeric,
        'confirmed',
        'paid',
        coalesce(v_event_checkout_session_id, rec.checkout_session_id),
        coalesce(
          rec.booking_payload->>'booking_type',
          case
            when rec.booking_payload->>'time_slot' in ('day', 'daytime') then 'day'
            when rec.booking_payload->>'time_slot' in ('night', 'nighttime') then 'night'
            when rec.booking_payload->>'time_slot' = 'overnight' then 'overnight'
            else 'day'
          end
        ),
        rec.booking_payload->>'special_requests',
        rec.booking_payload->>'rate_tier',
        rec.booking_payload->>'mode_of_payment'
      )
      returning id into v_booking_id;

      update public.checkout_sessions
      set consumed = true,
          consumed_at = now()
      where id = rec.checkout_row_id;

      update public.payment_webhook_events
      set booking_id = v_booking_id
      where id = rec.webhook_row_id;

    exception when unique_violation then
      -- Slot already taken or duplicate replay; keep audit trail and mark session consumed.
      insert into public.failed_bookings (
        checkout_session_id,
        user_email,
        amount,
        booking_payload,
        reason
      ) values (
        coalesce(v_event_checkout_session_id, rec.checkout_session_id, v_event_metadata_booking_id, rec.event_id),
        rec.booking_payload->>'email',
        (rec.booking_payload->>'downpayment_amount')::numeric,
        rec.booking_payload,
        'replay_unique_violation'
      );

      update public.checkout_sessions
      set consumed = true,
          consumed_at = now()
      where id = rec.checkout_row_id;
    end;
  end loop;
end $$;

-- Cleanup pass:
-- - remove stale unmatched webhook rows (older than 24h) that still have no booking_id
-- - remove stale orphan checkout sessions (older than 24h) that are unconsumed and
--   no webhook event references them by session id or metadata booking id
delete from public.payment_webhook_events e
where e.booking_id is null
  and e.event_type in ('payment.paid', 'checkout_session.payment.paid')
  and e.created_at < now() - interval '24 hours';

delete from public.checkout_sessions cs
where coalesce(cs.consumed, false) = false
  and cs.created_at < now() - interval '24 hours'
  and not exists (
    select 1
    from public.payment_webhook_events e
    where e.event_type in ('payment.paid', 'checkout_session.payment.paid')
      and (
        e.payload #>> '{data,attributes,data,id}' = cs.checkout_session_id
        or coalesce(
             e.payload #>> '{data,attributes,data,attributes,metadata,booking_id}',
             e.payload #>> '{data,attributes,data,attributes,payments,0,attributes,metadata,booking_id}'
           ) = cs.booking_id::text
      )
  );

commit;
