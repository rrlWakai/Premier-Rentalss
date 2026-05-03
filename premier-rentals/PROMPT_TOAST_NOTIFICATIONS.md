# Implementation Prompt for Admin Toast Notifications

## Executive Summary

You have a **fully functional real-time booking system** where:
1. Clients submit bookings via the public website
2. Bookings are instantly saved to Supabase
3. Admins have a real-time dashboard that syncs automatically
4. **Gap**: Admin gets NO NOTIFICATION when a new booking arrives

## What You're Building

A **toast notification system** that alerts the admin the moment a new reservation is received. The notification appears in the top-right corner of the admin dashboard and displays:

```
✨ New Booking: John Doe
   Premier Pool House
   May 10, 2026 • Daytime • 4 guests • ₱5,000
```

---

## System Analysis

### Current Flow (Without Notification)
```
Client Creates Booking
        ↓
Server saves to Supabase (bookings table)
        ↓
Real-time trigger fires (postgres_changes: INSERT event)
        ↓
Admin's dashboard receives event
        ↓
Dashboard silently refetches data & updates list
        ↓
❌ Admin has NO visual/audio alert
```

### New Flow (With Notification)
```
Client Creates Booking
        ↓
Server saves to Supabase (bookings table)
        ↓
Real-time trigger fires (postgres_changes: INSERT event)
        ↓
Admin's dashboard receives event
        ↓
🔍 Check: Is this an INSERT event?
        ↓
✅ YES → Show toast notification
✅ YES → Dashboard refetches data & updates list
```

---

## Why This Works

Your system already has everything in place:

| Component | Status | Why It Works |
|-----------|--------|-------------|
| Real-time subscription | ✅ Configured | AdminDashboard.tsx listens to bookings changes |
| Booking data | ✅ Available | Payload contains full booking object |
| Toast library | ✅ Installed | react-hot-toast already in package.json |
| Toast provider | ✅ Set up | App.tsx has `<Toaster />` component |

**All you need to do**: Capture the payload and format the notification message.

---

## Implementation (Simple Version)

### Step 1: Modify AdminDashboard.tsx

Find line 143 (the `.on("postgres_changes"` callback for bookings):

**Current code**:
```typescript
.on("postgres_changes",
  { event: "*", schema: "public", table: "bookings" },
  () => {
    console.log("Bookings realtime update");
    handleRealtimeChange();
  },
)
```

**Replace with**:
```typescript
.on("postgres_changes",
  { event: "*", schema: "public", table: "bookings" },
  (payload) => {
    console.log("Bookings realtime update", payload.eventType);
    
    // Show notification for NEW bookings only
    if (payload.eventType === 'INSERT' && payload.new) {
      const newBooking = payload.new as Booking;
      const retreat = retreats.find(r => r.id === newBooking.retreat_id);
      const propertyName = retreat?.name || 'Booking Received';
      
      const dateStr = new Date(newBooking.booking_date + 'T00:00:00')
        .toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      
      const timeSlot = newBooking.time_slot 
        ? newBooking.time_slot.charAt(0).toUpperCase() + newBooking.time_slot.slice(1)
        : 'TBD';
      
      const guestCount = newBooking.guests || newBooking.num_guests || 1;
      const amount = formatPHP(newBooking.total_amount);
      
      const message = `✨ New Booking: ${newBooking.full_name}\n${propertyName}\n${dateStr} • ${timeSlot} • ${guestCount} guest(s) • ${amount}`;
      
      toast.success(message, {
        duration: 5000,
        icon: '🎉',
      });
    }
    
    handleRealtimeChange();
  },
)
```

### That's It!

No other changes needed. The toast will automatically appear when a new booking is created.

---

## Implementation (Recommended Version)

For cleaner code, extract the logic into helper functions:

### Add These Functions (in AdminDashboard.tsx before the return statement):

```typescript
function formatNewBookingToast(booking: Booking): string {
  const retreat = retreats.find(r => r.id === booking.retreat_id);
  const propertyName = retreat?.name || 'Booking Received';
  
  const dateStr = new Date(booking.booking_date + 'T00:00:00')
    .toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  
  const timeSlot = booking.time_slot 
    ? booking.time_slot.charAt(0).toUpperCase() + booking.time_slot.slice(1)
    : 'TBD';
  
  const guestCount = booking.guests || booking.num_guests || 1;
  const amount = formatPHP(booking.total_amount);
  
  return `✨ New Booking: ${booking.full_name}\n${propertyName}\n${dateStr} • ${timeSlot} • ${guestCount} guest(s) • ${amount}`;
}

function showNewBookingNotification(booking: Booking): void {
  toast.success(formatNewBookingToast(booking), {
    duration: 5000,
    icon: '🎉',
  });
}
```

### Then Update the Callback to:

```typescript
.on("postgres_changes",
  { event: "*", schema: "public", table: "bookings" },
  (payload) => {
    console.log("Bookings realtime update", payload.eventType);
    
    if (payload.eventType === 'INSERT' && payload.new) {
      showNewBookingNotification(payload.new as Booking);
    }
    
    handleRealtimeChange();
  },
)
```

---

## Implementation (Advanced Version)

For a clickable toast that navigates to the booking:

```typescript
function showNewBookingNotification(booking: Booking): void {
  toast.success(
    <div 
      className="cursor-pointer"
      onClick={() => {
        setSelectedBooking(booking);
        setTab('bookings');
        toast.dismiss();
      }}
    >
      <div className="font-bold">{formatNewBookingToast(booking)}</div>
      <div className="text-xs mt-2 opacity-75">Click to view details</div>
    </div>,
    {
      duration: 7000,
      icon: '🎉',
    }
  );
}
```

---

## What Happens After You Implement This

1. **Admin opens dashboard** → Real-time subscription connects
2. **Client creates booking** → Booking saved to database
3. **Admin receives toast** → "✨ New Booking: John Doe..." appears at top-right
4. **Toast auto-dismisses** → After 5 seconds
5. **Booking list updates** → Automatically synced via refreshData()

---

## Testing the Implementation

### Test Case 1: Basic Flow
1. Open admin dashboard in browser: `http://localhost:5173/admin/dashboard`
2. Keep this tab visible
3. Open booking page in another tab: `http://localhost:5173/property/premier-pool-house`
4. Submit a test booking
5. **Expected**: Toast appears in admin tab within 1 second
6. **Toast content**: Guest name, property, date, time, guests, amount

### Test Case 2: Multiple Bookings
1. Repeat Test Case 1 multiple times
2. Each booking should trigger a new toast
3. Previous toasts dismiss automatically

### Test Case 3: Non-Insert Events
1. Open admin dashboard
2. Open a booking and update its status (e.g., pending → confirmed)
3. **Expected**: Booking list updates BUT no new toast appears (only for INSERT)

---

## Key Points to Remember

✅ **Only INSERT events trigger the notification** - Updates and deletes won't show a new toast
✅ **Payload contains the full booking object** - You have access to all booking details
✅ **Toast uses the existing framework** - react-hot-toast is already configured
✅ **No database changes needed** - This is purely a frontend enhancement
✅ **No API changes needed** - Real-time is working as-is
✅ **Runs in real-time** - Updates appear within 1-2 seconds of booking creation

---

## Common Customizations

### Change Toast Duration
```typescript
toast.success(message, { duration: 3000 }); // 3 seconds
toast.success(message, { duration: 10000 }); // 10 seconds
```

### Change Toast Icon
```typescript
toast.success(message, { icon: '📅' }); // Calendar icon
toast.success(message, { icon: '🔔' }); // Bell icon
```

### Change Toast Type
```typescript
toast.success(message);    // Green toast
toast.info(message);       // Blue toast
toast.custom(message);     // Custom styling
```

### Change Toast Position
```typescript
// In App.tsx, change Toaster component
<Toaster
  position="top-left"    // or "bottom-right", "bottom-center", etc.
  ...
/>
```

---

## Troubleshooting

### Toast Never Appears
**Check**: 
1. Real-time is enabled for `bookings` table (see REALTIME_SETUP.md)
2. Admin is logged in
3. Browser console shows "Admin realtime subscribed"

### Toast Shows for All Events, Not Just INSERT
**Fix**: Make sure this line is present:
```typescript
if (payload.eventType === 'INSERT' && payload.new) {
```

### Wrong Property Name in Toast
**Cause**: `booking.retreat_id` doesn't match any retreat
**Fix**: Add fallback in `formatNewBookingToast()`:
```typescript
const retreat = retreats.find(r => r.id === booking.retreat_id);
const propertyName = retreat?.name || 'New Booking';
```

### Date Shows Wrong Format
**Cause**: `booking_date` might be in different format
**Fix**: Check the database - should be YYYY-MM-DD

---

## Files Referenced

- ✅ [src/components/AdminDashboard.tsx](src/components/AdminDashboard.tsx) - Main file to modify
- ✅ [src/App.tsx](src/App.tsx) - Toast provider setup
- ✅ [src/lib/supabase.ts](src/lib/supabase.ts) - Booking type definition
- ✅ [src/lib/propertyData.ts](src/lib/propertyData.ts) - formatPHP() function

---

## Related Documentation

- [REALTIME_SETUP.md](REALTIME_SETUP.md) - How to enable real-time in Supabase
- [TOAST_NOTIFICATION_ANALYSIS.md](TOAST_NOTIFICATION_ANALYSIS.md) - Full system analysis
- [QUICK_REFERENCE_TOAST.md](QUICK_REFERENCE_TOAST.md) - Quick implementation reference

---

## Summary

You're adding **one enhanced callback** to detect new bookings and show a notification. The feature:
- ✅ Takes 5 minutes to implement
- ✅ Uses existing libraries and infrastructure
- ✅ Requires no database changes
- ✅ Works in real-time
- ✅ Improves admin experience significantly

**The toast notification feature is a non-breaking, additive enhancement that makes your admin dashboard production-ready.**
