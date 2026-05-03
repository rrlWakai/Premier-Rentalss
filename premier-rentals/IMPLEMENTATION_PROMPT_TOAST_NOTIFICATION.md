# Prompt: Add Toast Notification for New Reservations

## Context
Premier Rentals uses a React + Supabase real-time system where:
- Clients create bookings via the public website
- Bookings are inserted into the `bookings` table
- Admins have a real-time dashboard that subscribes to booking changes
- Currently, new bookings are silently synced without any notification to the admin

## Goal
**Add a toast notification that alerts the admin the moment a new reservation (booking) is received from a client.**

---

## Requirements

### Functional Requirements
1. **Trigger**: Toast should only show for NEW bookings (INSERT events), not updates or deletions
2. **Timing**: Toast must appear in real-time within 1 second of booking creation
3. **Content**: Display guest name, booking date, time slot, and total price
4. **Property Name**: Include the retreat/property name in the notification
5. **Duration**: Toast stays visible for 5 seconds (or longer if admin is reading)
6. **Position**: Top-right corner (already configured in App.tsx)

### Technical Requirements
1. Modify the real-time subscription callback in `AdminDashboard.tsx` to:
   - Capture the payload parameter from Supabase postgres_changes
   - Check if `payload.eventType === 'INSERT'`
   - Extract booking details from `payload.new`
   
2. Format the notification message to show:
   - Guest full name
   - Booking date (formatted as "May 10, 2026")
   - Time slot (daytime/nighttime/overnight)
   - Guest count (if available)
   - Retreat/property name (lookup from retreats list)
   - Total amount (formatted with PHP currency)

3. Show the toast using `toast.success()` or similar

### Optional Enhancements
1. Add a "View Details" button to the toast that navigates to the booking details
2. Highlight or scroll to the newly created booking in the bookings list
3. Add a subtle sound notification (optional)
4. Show different toast types based on booking status (success for pending, info for future updates)

---

## Implementation Steps

### Step 1: Modify the Callback Signature
In `AdminDashboard.tsx`, line 143-149, change:
```typescript
.on("postgres_changes",
  { event: "*", schema: "public", table: "bookings" },
  () => {
    console.log("Bookings realtime update");
    handleRealtimeChange();
  },
)
```

To:
```typescript
.on("postgres_changes",
  { event: "*", schema: "public", table: "bookings" },
  (payload) => {
    console.log("Bookings realtime update", payload.eventType);
    
    // NEW: Show toast for new bookings only
    if (payload.eventType === 'INSERT' && payload.new) {
      handleNewBooking(payload.new as Booking);
    }
    
    handleRealtimeChange();
  },
)
```

### Step 2: Create a Helper Function for Formatting
Add a new function in `AdminDashboard.tsx` to format the toast message:

```typescript
function formatNewBookingToast(booking: Booking, retreats: Retreat[]): string {
  const retreat = retreats.find(r => r.id === booking.retreat_id);
  const propertyName = retreat?.name || 'Unknown Property';
  
  const dateObj = new Date(booking.booking_date + 'T00:00:00');
  const dateStr = dateObj.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });
  
  const timeSlot = booking.time_slot ? 
    booking.time_slot.charAt(0).toUpperCase() + booking.time_slot.slice(1) : 
    'Unknown';
  
  const guestCount = booking.guests || booking.num_guests || 1;
  const amount = formatPHP(booking.total_amount);
  
  return `✨ New Booking: ${booking.full_name}\n${propertyName}\n${dateStr} • ${timeSlot} • ${guestCount} guest(s) • ${amount}`;
}
```

### Step 3: Create the Handler Function
Add this function in `AdminDashboard.tsx`:

```typescript
function handleNewBooking(newBooking: Booking) {
  const message = formatNewBookingToast(newBooking, retreats);
  toast.success(message, {
    duration: 5000,
    position: 'top-right',
    style: {
      background: '#10b981',
      color: 'white',
    },
    icon: '🎉',
  });
  
  console.log('New booking notification sent:', newBooking);
}
```

### Step 4: Test
1. Open admin dashboard (`/admin/dashboard`)
2. Open booking page in another tab/browser
3. Create a test booking
4. **Expected**: Toast appears in admin dashboard within 1 second

---

## Code Examples

### Example Toast Message Display
```
┌─────────────────────────────────────────────┐
│ 🎉 ✨ New Booking: John Doe                │
│    Premier Pool House                      │
│    May 10, 2026 • Daytime • 4 guests • PHP5,000 │
└─────────────────────────────────────────────┘
```

### Example Toast with Action Button (Advanced)
```typescript
const toastMessage = (
  <div>
    <strong>✨ New Booking: {newBooking.full_name}</strong>
    <p>{propertyName} • {dateStr} • {timeSlot}</p>
    <button 
      onClick={() => {
        // Highlight the booking in the list
        setSelectedBooking(newBooking);
        setTab('bookings');
      }}
      className="text-sm underline mt-2"
    >
      View Details →
    </button>
  </div>
);

toast.success(toastMessage, { duration: 7000 });
```

---

## Dependencies
- ✅ react-hot-toast (already installed)
- ✅ Supabase (already set up)
- ✅ Real-time enabled on bookings table (see REALTIME_SETUP.md)

---

## Expected Outcome
After implementation, admins will immediately know when a new booking arrives without needing to manually refresh or check the dashboard. The real-time notification provides instant visibility into new business activity.

---

## Files to Modify
1. **src/components/AdminDashboard.tsx**
   - Update real-time subscription callback (lines 143-149)
   - Add `formatNewBookingToast()` function
   - Add `handleNewBooking()` function

## Files NOT to Modify
- No database changes
- No API changes
- No type definition changes
- No dependency additions needed

---

## Success Criteria
✅ Toast appears within 1 second of booking creation
✅ Toast contains correct guest name and booking details
✅ Toast only shows for new bookings (not updates)
✅ Toast disappears after 5 seconds
✅ Admin can still interact with dashboard while toast is visible
✅ Works in real-time (no manual refresh needed)

---

## Notes
- The callback receives the full booking object, so you have access to all booking fields
- The `formatPHP()` function is already imported from propertyData.ts
- The `toast` object is already imported from react-hot-toast
- Ensure the toast appears only when admin is logged in and subscribed to real-time
