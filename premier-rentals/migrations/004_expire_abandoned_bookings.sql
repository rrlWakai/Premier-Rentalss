-- Expire abandoned pending bookings
alter table public.bookings add column if not exists cancellation_reason text;
