-- ============================================================================
-- 003_enable_realtime.sql
-- Enable real-time for Premier Rentals
-- 
-- Run this in Supabase SQL Editor to enable real-time broadcasts
-- ============================================================================

-- 1. Enable REPLICA IDENTITY FULL on bookings table
alter table public.bookings replica identity full;

-- 2. Enable REPLICA IDENTITY FULL on blocked_dates table
alter table public.blocked_dates replica identity full;

-- 3. Enable REPLICA IDENTITY FULL on discounts table
alter table public.discounts replica identity full;

-- ============================================================================
-- Verification Queries
-- ============================================================================
-- Run these to verify real-time is enabled:

-- Check bookings real-time status
-- SELECT relname, relreplident FROM pg_class WHERE relname = 'bookings';
-- Expected output: bookings | f (where 'f' means FULL)

-- Check blocked_dates real-time status
-- SELECT relname, relreplident FROM pg_class WHERE relname = 'blocked_dates';
-- Expected output: blocked_dates | f

-- Check discounts real-time status
-- SELECT relname, relreplident FROM pg_class WHERE relname = 'discounts';
-- Expected output: discounts | f

-- ============================================================================
-- Next Steps:
-- 1. Run this migration in Supabase SQL Editor
-- 2. Go to Supabase Dashboard → Database → Replication
-- 3. Toggle ON for: bookings, blocked_dates, discounts
-- 4. Test real-time by opening calendar on two browser tabs
-- ============================================================================
