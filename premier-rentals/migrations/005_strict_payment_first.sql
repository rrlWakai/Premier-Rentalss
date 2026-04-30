-- migrations/005_strict_payment_first.sql
BEGIN;

-- 1. Create checkout_sessions to store payloads temporarily
CREATE TABLE IF NOT EXISTS public.checkout_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checkout_session_id text UNIQUE NOT NULL,
  booking_payload jsonb NOT NULL,
  consumed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- 2. Create failed_bookings for manual resolution
CREATE TABLE IF NOT EXISTS public.failed_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checkout_session_id text NOT NULL,
  user_email text,
  amount numeric,
  booking_payload jsonb NOT NULL,
  reason text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 3. Cleanup existing data (Optional/Safe)
UPDATE public.bookings SET status = 'cancelled' WHERE status = 'pending';

-- 4. Alter bookings constraints
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_status_check CHECK (status IN ('half', 'confirmed', 'cancelled'));

-- 5. Alter columns NOT NULL
-- (Delete nulls first if any exist to allow constraint application)
DELETE FROM public.bookings WHERE booking_date IS NULL OR time_slot IS NULL;
ALTER TABLE public.bookings ALTER COLUMN booking_date SET NOT NULL;
ALTER TABLE public.bookings ALTER COLUMN time_slot SET NOT NULL;

-- 6. Create UNIQUE INDEX (FINAL AUTHORITY)
DROP INDEX IF EXISTS idx_bookings_slot_lookup;
CREATE UNIQUE INDEX IF NOT EXISTS unique_booking_slot
ON public.bookings (property_id, booking_date, time_slot)
WHERE status IN ('half', 'confirmed');

-- 7. Process Webhook RPC (for atomic FOR UPDATE + exception handling)
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
  -- Check idempotency
  IF EXISTS (SELECT 1 FROM public.payment_webhook_events WHERE event_id = p_event_id) THEN
    RETURN jsonb_build_object('status', 'ignored', 'reason', 'duplicate_event');
  END IF;

  -- Insert event record to ensure idempotency
  INSERT INTO public.payment_webhook_events (event_id, event_type, payload)
  VALUES (p_event_id, p_event_type, p_full_event_payload);

  -- Lock the session row FOR UPDATE
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

  -- Extract data
  v_property_id := v_session.booking_payload->>'property_id';
  v_booking_date := (v_session.booking_payload->>'date')::date;
  v_time_slot := v_session.booking_payload->>'time_slot';
  v_retreat_id := (v_session.booking_payload->>'retreat_id')::uuid;
  
  -- Determine status
  v_status := 'half';
  IF (v_session.booking_payload->>'total_amount')::numeric <= p_payment_amount THEN
    v_status := 'confirmed';
  END IF;

  BEGIN
    -- Attempt to insert booking
    INSERT INTO public.bookings (
      retreat_id, property_id, booking_date, time_slot, full_name, email, phone, address,
      guests, num_guests, num_cars, total_amount, downpayment_amount,
      payment_status, status, checkout_session_id, booking_type, special_requests,
      rate_tier, mode_of_payment
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
    ) RETURNING id INTO v_booking_id;

    -- Update session as consumed
    UPDATE public.checkout_sessions SET consumed = true WHERE checkout_session_id = p_checkout_session_id;

    -- Insert payment record
    INSERT INTO public.payments (booking_id, checkout_session_id, amount, status)
    VALUES (v_booking_id, p_checkout_session_id, p_payment_amount, 'paid');

    RETURN jsonb_build_object('status', 'success', 'booking_id', v_booking_id);

  EXCEPTION WHEN unique_violation THEN
    -- UNIQUE constraint error (23505) caught
    -- DO NOT retry, DO NOT insert booking
    INSERT INTO public.failed_bookings (
      checkout_session_id, user_email, amount, booking_payload, reason
    ) VALUES (
      p_checkout_session_id,
      v_session.booking_payload->>'email',
      p_payment_amount,
      v_session.booking_payload,
      'slot_taken_after_payment'
    );
    
    -- Update session as consumed so it doesn't process again
    UPDATE public.checkout_sessions SET consumed = true WHERE checkout_session_id = p_checkout_session_id;
    
    RETURN jsonb_build_object('status', 'failed_booking', 'reason', 'slot_taken_after_payment');
  END;

END;
$$;

-- Grant execution to service_role
REVOKE ALL ON FUNCTION public.process_webhook_booking(text, text, text, numeric, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_webhook_booking(text, text, text, numeric, text, jsonb) TO service_role;

-- Drop old RPC
DROP FUNCTION IF EXISTS public.create_locked_booking;

COMMIT;
