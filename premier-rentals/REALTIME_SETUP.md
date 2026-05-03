# Supabase Real-Time Configuration Guide

## Overview

Your application is **already using real-time subscriptions**, but real-time needs to be **explicitly enabled** in your Supabase project for each table. Without proper setup, real-time channels will fail silently.

---

## Current Real-Time Usage in Your App

### 1. **Availability Calendar** (`useAvailability.ts`)
```typescript
// Subscribes to two channels
- Channel 1: bookings table changes
- Channel 2: blocked_dates table changes
```
**Impact**: When a user views the calendar, they see updates in real-time if dates are booked or blocked.

### 2. **Admin Dashboard** (`AdminDashboard.tsx`)
```typescript
// Subscribes to three channels
- bookings table
- blocked_dates table  
- discounts table
```
**Impact**: Admin sees live updates to bookings, blocked dates, and active discounts without manual refresh.

---

## What Needs to be Enabled in Supabase

### ✅ Step 1: Enable Real-Time on Required Tables

In your Supabase dashboard, you **must enable real-time broadcast** on these tables:

1. **`bookings`** ⭐ (CRITICAL)
   - Reason: Calendar updates, admin dashboard live updates
   - Events to monitor: INSERT, UPDATE, DELETE

2. **`blocked_dates`** ⭐ (CRITICAL)
   - Reason: Calendar availability updates
   - Events to monitor: INSERT, UPDATE, DELETE

3. **`discounts`** (IMPORTANT)
   - Reason: Admin dashboard discount changes
   - Events to monitor: INSERT, UPDATE, DELETE

### ✅ Step 2: How to Enable Real-Time (Supabase Dashboard)

**For each table above:**

1. Go to **Supabase Dashboard** → Your Project
2. Navigate to **Database** → **Replication**
3. Find each table name in the list
4. Toggle the switch to **ON** (to enable real-time broadcasts)
5. Repeat for all three tables

**Alternative via SQL:**
```sql
-- Enable real-time for bookings
ALTER TABLE public.bookings REPLICA IDENTITY FULL;

-- Enable real-time for blocked_dates
ALTER TABLE public.blocked_dates REPLICA IDENTITY FULL;

-- Enable real-time for discounts
ALTER TABLE public.discounts REPLICA IDENTITY FULL;
```

### ✅ Step 3: Verify RLS Policies Allow Real-Time

Your tables already have RLS enabled. Make sure these policies exist:

**For `bookings` (need read access for real-time):**
```sql
-- Admin/staff can read bookings
create policy "admin read bookings" on public.bookings
  for select using (
    (auth.jwt()->'app_metadata'->>'role') in ('admin','staff')
  );

-- For public viewing (if needed for calendar):
create policy "public read bookings for availability" on public.bookings
  for select using (true);
```

**For `blocked_dates` (should be public readable):**
```sql
-- Already enabled in your schema ✅
create policy "public read blocked dates" on public.blocked_dates
  for select using (true);
```

**For `discounts` (already configured):**
```sql
-- Already enabled in your schema ✅
create policy "public read active discounts" on public.discounts
  for select using (active = true);
```

---

## Configuration Checklist

- [ ] **Access Supabase Dashboard**
- [ ] **Navigate to Settings → Replication**
- [ ] **Enable real-time for `bookings` table**
- [ ] **Enable real-time for `blocked_dates` table**
- [ ] **Enable real-time for `discounts` table**
- [ ] **Verify RLS policies allow SELECT access**
- [ ] **Test real-time connection**

---

## Testing Real-Time

### Test 1: Calendar Real-Time
1. Open the booking calendar on two browser tabs
2. Create a booking in one tab
3. **Expected**: Second tab's calendar updates automatically without refresh

### Test 2: Admin Dashboard Real-Time
1. Open admin dashboard in two browser tabs (admin user)
2. Update a booking status in one tab
3. **Expected**: Second tab shows "connected" status and updates live

### Test 3: Check Console Logs
Open browser DevTools → Console and look for:
```
✅ "Admin realtime subscribed"  // Means connection successful
✅ "Blocked dates realtime update"
✅ "Discounts realtime update"

❌ "Admin realtime error: CHANNEL_ERROR" // Real-time not enabled
❌ "Admin realtime error: TIMED_OUT"
```

---

## Troubleshooting

### Issue: "CHANNEL_ERROR" or "TIMED_OUT"
**Solution**: 
- Make sure real-time is enabled for the table in Supabase Dashboard
- Run the SQL commands above to enable REPLICA IDENTITY

### Issue: Updates work in admin but not in public calendar
**Solution**:
- Check that `public read bookings for availability` policy exists
- Allow anon users to SELECT from availability_public view

### Issue: Real-time connects but doesn't receive updates
**Solution**:
- Verify RLS policies allow the user's role to read the table
- Check that REPLICA IDENTITY FULL is set on the table

### Issue: Performance degradation with real-time
**Solution**:
- Consider adding filters to subscriptions:
```typescript
.on('postgres_changes', {
  event: 'UPDATE', // Only updates, not inserts
  schema: 'public',
  table: 'bookings',
  filter: `property_id=eq.${propertyId}` // Only specific property
}, callback)
```

---

## Current Implementation Details

### `useAvailability.ts` - How It Works
```typescript
const ch1 = supabase
  .channel(`bookings-${propertySlug}-${year}-${pad(month)}`)
  .on('postgres_changes',
    { event: '*', schema: 'public', table: 'bookings' },
    fetchMonth)  // Refetch data on any change
  .subscribe(s => setLive(s === 'SUBSCRIBED'))

const ch2 = supabase
  .channel(`blocked-${propertySlug}-${year}-${pad(month)}`)
  .on('postgres_changes',
    { event: '*', schema: 'public', table: 'blocked_dates' },
    fetchMonth)
  .subscribe()
```

**What happens**:
1. When user views calendar, two real-time channels connect
2. Any insert/update/delete to `bookings` or `blocked_dates` triggers `fetchMonth()`
3. Calendar rerenders with updated availability
4. `setLive(true)` shows real-time is connected

### `AdminDashboard.tsx` - How It Works
```typescript
const channel = supabase
  .channel('admin-updates')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, ...)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'blocked_dates' }, ...)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'discounts' }, ...)
  .subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      console.log("Admin realtime subscribed");
      setRealtimeStatus("connected");
    }
  });
```

---

## Summary Table

| Table | Real-Time Enabled? | Used By | Purpose |
|-------|-------------------|---------|---------|
| `bookings` | ❓ Need to enable | Calendar + Admin | Live availability updates |
| `blocked_dates` | ❓ Need to enable | Calendar + Admin | Live blocked date changes |
| `discounts` | ❓ Need to enable | Admin Dashboard | Live discount updates |
| `retreats` | ✗ Not needed | Both | Static data (rare changes) |
| `profiles` | ✗ Not needed | Admin | User roles (rare changes) |
| `testimonials` | ✗ Not needed | Homepage | Static content |
| `inquiries` | ✗ Not needed | Admin | Form submissions (one-way) |

---

## Next Steps

1. **Complete the setup** by enabling real-time in Supabase Dashboard
2. **Test** each feature as described above
3. **Monitor** browser console for real-time connection status
4. **Optimize** subscriptions if needed (add filters, select specific columns)

---

## Additional Resources

- [Supabase Real-Time Documentation](https://supabase.com/docs/guides/realtime)
- [How to enable Real-Time for tables](https://supabase.com/docs/guides/realtime/quickstart)
- [Supabase Replication Configuration](https://supabase.com/docs/guides/database/replication)
