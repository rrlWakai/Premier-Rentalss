-- migrations/009_atomic_webhook_booking.sql
CREATE OR REPLACE FUNCTION atomic_webhook_booking(
  p_session_id        uuid,
  p_insert_data       jsonb,
  p_paymongo_cs_id    text,
  p_event_id          text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session    checkout_sessions%ROWTYPE;
  v_booking_id uuid;
BEGIN
  SELECT * INTO v_session
  FROM checkout_sessions
  WHERE id = p_session_id
  FOR UPDATE;

  IF v_session.consumed THEN
    RETURN jsonb_build_object('status', 'already_consumed');
  END IF;

  INSERT INTO bookings (
    property_id, retreat_id, booking_date, time_slot,
    full_name, email, phone, address,
    guests, num_guests, num_cars,
    total_amount, downpayment_amount,
    status, payment_status, checkout_session_id,
    booking_type, special_requests, rate_tier, mode_of_payment
  )
  VALUES (
    NULLIF(p_insert_data->>'property_id',''),
    NULLIF(p_insert_data->>'retreat_id','')::uuid,
    (p_insert_data->>'booking_date')::date,
    p_insert_data->>'time_slot',
    p_insert_data->>'full_name',
    p_insert_data->>'email',
    p_insert_data->>'phone',
    p_insert_data->>'address',
    (p_insert_data->>'guests')::int,
    (p_insert_data->>'num_guests')::int,
    (p_insert_data->>'num_cars')::int,
    (p_insert_data->>'total_amount')::numeric,
    (p_insert_data->>'downpayment_amount')::numeric,
    'confirmed', 'paid',
    p_paymongo_cs_id,
    p_insert_data->>'booking_type',
    p_insert_data->>'special_requests',
    p_insert_data->>'rate_tier',
    p_insert_data->>'mode_of_payment'
  )
  RETURNING id INTO v_booking_id;

  UPDATE checkout_sessions
  SET consumed = true, consumed_at = now()
  WHERE id = p_session_id;

  UPDATE payment_webhook_events
  SET booking_id = v_booking_id
  WHERE event_id = p_event_id;

  RETURN jsonb_build_object('status', 'ok', 'booking_id', v_booking_id);
END;
$$;
