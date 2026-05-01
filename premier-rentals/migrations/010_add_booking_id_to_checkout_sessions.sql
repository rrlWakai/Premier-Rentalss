ALTER TABLE checkout_sessions
ADD COLUMN IF NOT EXISTS booking_id uuid;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'bookings'
      AND column_name = 'property_id'
      AND udt_name = 'uuid'
  ) THEN
    ALTER TABLE bookings
    ALTER COLUMN property_id TYPE text USING property_id::text;
  END IF;
END;
$$;
