# Quick Reference: Toast Notification Implementation

## In 60 Seconds

**What**: Add a toast notification to alert admin when a new booking is received
**Where**: AdminDashboard.tsx (real-time callback)
**How**: Detect INSERT event in payload, format booking details, show toast

---

## Code Changes Summary

### Change 1: Capture Payload in Callback

**Location**: `src/components/AdminDashboard.tsx` lines 143-149

**Before**:
```typescript
.on("postgres_changes",
  { event: "*", schema: "public", table: "bookings" },
  () => {  // ← No payload capture
    console.log("Bookings realtime update");
    handleRealtimeChange();
  },
)
```

**After**:
```typescript
.on("postgres_changes",
  { event: "*", schema: "public", table: "bookings" },
  (payload) => {  // ← Capture payload
    console.log("Bookings realtime update", payload.eventType);
    
    if (payload.eventType === 'INSERT' && payload.new) {
      handleNewBooking(payload.new as Booking);
    }
    
    handleRealtimeChange();
  },
)
```

---

### Change 2: Add Helper Function

**Add to AdminDashboard.tsx** (before the return statement):

```typescript
function formatNewBookingToast(booking: Booking): string {
  const retreat = retreats.find(r => r.id === booking.retreat_id);
  const propertyName = retreat?.name || 'Unknown Property';
  
  const dateStr = new Date(booking.booking_date + 'T00:00:00')
    .toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  
  const timeSlot = booking.time_slot 
    ? booking.time_slot.charAt(0).toUpperCase() + booking.time_slot.slice(1)
    : 'Unknown';
  
  const guestCount = booking.guests || booking.num_guests || 1;
  const amount = formatPHP(booking.total_amount);
  
  return `✨ New Booking: ${booking.full_name}\n${propertyName}\n${dateStr} • ${timeSlot} • ${guestCount} guest(s) • ${amount}`;
}

function handleNewBooking(newBooking: Booking) {
  toast.success(formatNewBookingToast(newBooking), {
    duration: 5000,
    icon: '🎉',
  });
}
```

---

## What Gets Displayed

**Toast Notification Example**:
```
┌─────────────────────────────────────────────┐
│ 🎉 ✨ New Booking: John Doe                │
│    Premier Pool House                      │
│    May 10, 2026 • Daytime • 4 guests • PHP5,000 │
└─────────────────────────────────────────────┘
     (auto-dismisses after 5 seconds)
```

---

## Technical Details

### Supabase Payload Structure
```typescript
payload = {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE',
  schema: 'public',
  table: 'bookings',
  new: Booking,      // ← New record data
  old: Booking | null, // ← Old record data (for UPDATE/DELETE)
  errors: []
}
```

### Booking Object Fields Used
```typescript
booking.full_name      // "John Doe"
booking.booking_date   // "2026-05-10"
booking.time_slot      // "daytime"
booking.guests         // 4
booking.total_amount   // 5000
booking.retreat_id     // UUID
```

---

## Files to Modify

| File | Lines | Change |
|------|-------|--------|
| src/components/AdminDashboard.tsx | 143-149 | Capture payload, check event type |
| src/components/AdminDashboard.tsx | (before return) | Add 2 functions |

---

## Imports Already Available
✅ `toast` from react-hot-toast (line 61)
✅ `formatPHP` from propertyData.ts
✅ `Booking` type from supabase.ts
✅ `retreats` state variable (already in component)

---

## Testing

```bash
# 1. Start dev server
npm run dev

# 2. Open dashboard
# Visit: http://localhost:5173/admin/dashboard

# 3. Create test booking
# In another tab: Create booking on public site

# 4. Observe
# Toast should appear in dashboard within 1 second
# Shows guest name, property, date, time, count, price
# Auto-dismisses after 5 seconds
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Toast doesn't appear | Check real-time is enabled (see REALTIME_SETUP.md) |
| Wrong property name | Ensure `booking.retreat_id` matches a retreat in the list |
| Date shows wrong | Verify `booking.booking_date` is in YYYY-MM-DD format |
| Toast shows for all changes | Make sure `payload.eventType === 'INSERT'` check is present |

---

## Success Indicators

✅ When you create a booking on the public site, admin dashboard shows toast within 1 second
✅ Toast contains correct guest name, property, date, time, guests, amount
✅ Toast auto-dismisses after 5 seconds
✅ Dashboard data also syncs normally (handleRealtimeChange still called)
✅ No console errors

---

## Files Created (Reference)

- `TOAST_NOTIFICATION_ANALYSIS.md` - Detailed system analysis
- `IMPLEMENTATION_PROMPT_TOAST_NOTIFICATION.md` - Full implementation guide
- `QUICK_REFERENCE_TOAST.md` - This file

---

## Next Steps

1. Read `IMPLEMENTATION_PROMPT_TOAST_NOTIFICATION.md` for detailed context
2. Make the 2 code changes above
3. Test by creating a booking
4. Adjust toast styling/duration if needed
