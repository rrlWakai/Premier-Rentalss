-- migrations/005_strict_payment_first.sql
BEGIN;

-- 1. Create checkout_sessions
CREATE TABLE IF NOT EXISTS public.checkout_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checkout_session_id text UNIQUE NOT NULL,
  booking_payload jsonb NOT NULL,
  consumed boolean DEFAULT false,
  consumed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- 2. Create failed_bookings
CREATE TABLE IF NOT EXISTS public.failed_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checkout_session_id text NOT NULL,
  user_email text,
  amount numeric,
  booking_payload jsonb NOT NULL,
  reason text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 3. Cleanup old data
UPDATE public.bookings SET status = 'cancelled' WHERE status = 'pending';

-- 4. Update status constraint
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_status_check
CHECK (status IN ('half', 'confirmed', 'cancelled'));

-- 5. Enforce NOT NULL
DELETE FROM public.bookings WHERE booking_date IS NULL OR time_slot IS NULL;
ALTER TABLE public.bookings ALTER COLUMN booking_date SET NOT NULL;
ALTER TABLE public.bookings ALTER COLUMN time_slot SET NOT NULL;

-- 6. UNIQUE INDEX (FINAL AUTHORITY)
DROP INDEX IF EXISTS idx_bookings_slot_lookup;
CREATE UNIQUE INDEX IF NOT EXISTS unique_booking_slot
ON public.bookings (property_id, booking_date, time_slot)
WHERE status IN ('half', 'confirmed');

-- 7. PERFORMANCE INDEX
CREATE INDEX IF NOT EXISTS idx_booking_lookup
ON public.bookings (property_id, booking_date, time_slot);

-- 8. PROCESS WEBHOOK FUNCTION (FIXED)
CREATE OR REPLACE FUNCTION public.process_webhook_booking(
  p_event_id text,
  p_event_type text,
  p_checkout_session_id text,
  p_payment_amount numeric,
  p_payment_status text,
  p_full_event_payload jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session public.checkout_sessions%ROWTYPE;
  v_booking_id uuid;
  v_property_id text;
  v_booking_date date;
  v_time_slot text;
  v_status text;
  v_retreat_id uuid;
BEGIN
  -- Idempotency check
  IF EXISTS (
    SELECT 1 FROM public.payment_webhook_events WHERE event_id = p_event_id
  ) THEN
    RETURN jsonb_build_object('status', 'ignored', 'reason', 'duplicate_event');
  END IF;

  -- Save webhook event
  INSERT INTO public.payment_webhook_events (event_id, event_type, payload)
  VALUES (p_event_id, p_event_type, p_full_event_payload);

  -- Lock session
  SELECT * INTO v_session
  FROM public.checkout_sessions
  WHERE checkout_session_id = p_checkout_session_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'error', 'reason', 'session_not_found');
  END IF;

  IF v_session.consumed THEN
    RETURN jsonb_build_object('status', 'ignored', 'reason', 'session_already_consumed');
  END IF;

  -- Extract aligned payload fields
  v_property_id := v_session.booking_payload->>'property_id';
  v_booking_date := (v_session.booking_payload->>'booking_date')::date;
  v_time_slot := v_session.booking_payload->>'time_slot';
  v_retreat_id := (v_session.booking_payload->>'retreat_id')::uuid;

  -- Determine status
  IF p_payment_amount >= (v_session.booking_payload->>'total_amount')::numeric THEN
    v_status := 'confirmed';
  ELSE
    v_status := 'half';
  END IF;

  BEGIN
    -- Insert booking
    INSERT INTO public.bookings (
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
      payment_status,
      status,
      checkout_session_id,
      booking_type,
      special_requests,
      rate_tier,
      mode_of_payment
    ) VALUES (
      v_retreat_id,
      v_property_id,
      v_booking_date,
      v_time_slot,
      v_session.booking_payload->>'full_name',
      v_session.booking_payload->>'email',
      v_session.booking_payload->>'phone',
      v_session.booking_payload->>'address',
      (v_session.booking_payload->>'guests')::int,
      (v_session.booking_payload->>'guests')::int,
      (v_session.booking_payload->>'cars')::int,
      (v_session.booking_payload->>'total_amount')::numeric,
      (v_session.booking_payload->>'downpayment_amount')::numeric,
      p_payment_status,
      v_status,
      p_checkout_session_id,
      v_session.booking_payload->>'booking_type',
      v_session.booking_payload->>'special_requests',
      v_session.booking_payload->>'rate_tier',
      v_session.booking_payload->>'mode_of_payment'
    )
    RETURNING id INTO v_booking_id;

    -- Mark session consumed
    UPDATE public.checkout_sessions
    SET consumed = true,
        consumed_at = now()
    WHERE checkout_session_id = p_checkout_session_id;

    -- Insert payment record
    INSERT INTO public.payments (
      booking_id,
      checkout_session_id,
      amount,
      status
    ) VALUES (
      v_booking_id,
      p_checkout_session_id,
      p_payment_amount,
      'paid'
    );

    RETURN jsonb_build_object(
      'status', 'success',
      'booking_id', v_booking_id
    );

  EXCEPTION WHEN unique_violation THEN
    -- Slot already taken after payment
    INSERT INTO public.failed_bookings (
      checkout_session_id,
      user_email,
      amount,
      booking_payload,
      reason
    ) VALUES (
      p_checkout_session_id,
      v_session.booking_payload->>'email',
      p_payment_amount,
      v_session.booking_payload,
      'slot_taken_after_payment'
    );

    UPDATE public.checkout_sessions
    SET consumed = true,
        consumed_at = now()
    WHERE checkout_session_id = p_checkout_session_id;

    RETURN jsonb_build_object(
      'status', 'failed_booking',
      'reason', 'slot_taken_after_payment'
    );
  END;

END;
$$;

-- Grant access
REVOKE ALL ON FUNCTION public.process_webhook_booking(
  text, text, text, numeric, text, jsonb
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.process_webhook_booking(
  text, text, text, numeric, text, jsonb
) TO service_role;

-- Remove old system
DROP FUNCTION IF EXISTS public.create_locked_booking;

COMMIT;