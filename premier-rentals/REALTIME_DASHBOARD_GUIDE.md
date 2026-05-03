# Real-Time Setup: Step-by-Step Dashboard Guide

## Quick Setup (5 minutes)

### Step 1: Access Supabase Dashboard

1. Go to https://app.supabase.com
2. Select your **premier-rentals** project
3. Sign in with your credentials

---

### Step 2: Run the SQL Migration

1. In the left sidebar, click **SQL Editor**
2. Click **New Query**
3. Copy and paste the contents of `migrations/003_enable_realtime.sql`
4. Click **Run**
5. You should see a green checkmark ✅

**Expected output:**
```
ALTER TABLE
ALTER TABLE
ALTER TABLE
```

---

### Step 3: Enable Real-Time in Replication Settings

1. Go to **Settings** → **Database** (or use left sidebar)
2. Click **Replication**
3. You'll see a list of tables in the "REPLICATION" section

**For each of these 3 tables, toggle the switch to ON:**

| Table Name | Status | Action |
|-----------|--------|--------|
| `bookings` | 🔴 OFF | Toggle to **ON** |
| `blocked_dates` | 🔴 OFF | Toggle to **ON** |
| `discounts` | 🔴 OFF | Toggle to **ON** |

**Visual Guide:**
```
┌─────────────────────────────────────────┐
│ REPLICATION                             │
├─────────────────────────────────────────┤
│ Table Name          │ Real-Time Enabled │
├─────────────────────┼──────────────────┤
│ api_rate_limits     │ ⚪ OFF            │
│ blocked_dates       │ 🟢 ON ← TOGGLE   │
│ bookings            │ 🟢 ON ← TOGGLE   │
│ checkout_sessions   │ ⚪ OFF            │
│ discounts           │ 🟢 ON ← TOGGLE   │
│ failed_bookings     │ ⚪ OFF            │
│ inquiries           │ ⚪ OFF            │
│ payment_webhook...  │ ⚪ OFF            │
│ payments            │ ⚪ OFF            │
│ profiles            │ ⚪ OFF            │
│ retreats            │ ⚪ OFF            │
│ testimonials        │ ⚪ OFF            │
└─────────────────────┴──────────────────┘
```

---

### Step 4: Verify RLS Policies

1. Go to **Authentication** → **Policies**
2. For each table, verify policies allow read access:

**For `bookings`:**
- ✅ `public read bookings for availability` (or similar)
- ✅ `admin read bookings`
- ✅ `admin update bookings`

**For `blocked_dates`:**
- ✅ `public read blocked dates`
- ✅ `admin write blocked dates`

**For `discounts`:**
- ✅ `public read active discounts`
- ✅ `admin manage discounts`

If any are missing, they were added in `migrations/001_clean_schema.sql`

---

### Step 5: Test Real-Time Connection

#### Test 1: Calendar Real-Time

1. **Open your site in two browser tabs**
2. **Tab 1:** Go to `/property/premier-pool-house` (or any property)
3. **Tab 2:** Go to same property in the second tab
4. **In Tab 1:** Try to book a date
5. **Expected in Tab 2:** Calendar updates immediately without refresh

#### Test 2: Admin Dashboard Real-Time

1. **Open admin dashboard in two browser tabs**
   - `/admin` → login
2. **Tab 1:** Admin Dashboard → Bookings
3. **Tab 2:** Admin Dashboard (same page)
4. **In Tab 1:** Click on a booking and change its status (e.g., pending → confirmed)
5. **Check Tab 2:**
   - Look for green "connected" indicator (if shown)
   - Booking status should update automatically

#### Test 3: Check Browser Console

1. Open **DevTools** → **Console**
2. Look for these messages:

```
✅ SUCCESS (Real-Time is working):
   "Admin realtime subscribed"
   "Bookings realtime update"
   "Blocked dates realtime update"

❌ ERROR (Real-Time not enabled):
   "Admin realtime error: CHANNEL_ERROR"
   "Admin realtime error: TIMED_OUT"
   "Admin realtime error: CLOSED"
```

---

## Troubleshooting

### Problem: "CHANNEL_ERROR" in console

**Cause:** Real-time not enabled in Replication settings

**Solution:**
1. Verify `bookings`, `blocked_dates`, `discounts` are toggled ON in Replication
2. Wait 30 seconds for changes to propagate
3. Refresh the page
4. Try again

### Problem: Updates only work in admin, not in public calendar

**Cause:** RLS policy might not allow anon users to read bookings

**Solution:**
1. Go to **Authentication** → **Policies** → **bookings**
2. Check if there's a policy like `public read bookings for availability`
3. If missing, add this policy in SQL Editor:

```sql
create policy "public read bookings for availability" on public.bookings
  for select using (true);
```

### Problem: Real-time connects but takes 5+ seconds to update

**Cause:** The subscription is calling `fetchMonth()` which re-queries all data

**Solution:** This is normal for now. If performance degrades, we can optimize by:
- Using incremental updates instead of full refetch
- Adding filters to subscriptions

---

## Verifying Setup Completion

Run these checks to ensure everything is working:

### Database Check
```sql
-- In SQL Editor, run these queries:

-- 1. Check REPLICA IDENTITY
SELECT relname, relreplident 
FROM pg_class 
WHERE relname IN ('bookings', 'blocked_dates', 'discounts');

-- Expected output:
-- relname           | relreplident
-- ─────────────────┼──────────────
-- bookings          | f
-- blocked_dates     | f
-- discounts         | f
-- (f = FULL, meaning real-time enabled)
```

### Real-Time Connection Check
1. Open calendar on any property
2. Open browser DevTools → Console
3. You should see: `"Admin realtime subscribed"` (or similar success message)

### Data Change Check
1. Create a test booking
2. Check calendar in another browser immediately
3. New date should appear as "unavailable" or "pending"

---

## Success Checklist

- [ ] SQL migration (003_enable_realtime.sql) executed successfully
- [ ] `bookings` table real-time toggled **ON**
- [ ] `blocked_dates` table real-time toggled **ON**
- [ ] `discounts` table real-time toggled **ON**
- [ ] Waited 30+ seconds for changes to propagate
- [ ] Tested calendar real-time on two tabs ✅ Working
- [ ] Tested admin dashboard real-time ✅ Working
- [ ] No errors in browser console 🟢 Connected

---

## Need Help?

If real-time still isn't working:

1. **Check Supabase Status:** https://status.supabase.com/
2. **Review logs:** In Supabase dashboard → Function → Logs
3. **Restart browser:** Close all tabs and reload
4. **Check network:** Make sure WebSocket isn't blocked by firewall/VPN

For more info, see: [REALTIME_SETUP.md](./REALTIME_SETUP.md)
