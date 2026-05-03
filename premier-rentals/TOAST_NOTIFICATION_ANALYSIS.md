# System Analysis: Toast Notification for New Reservations

## Current System Architecture

### 1. **Booking Creation Flow**
```
┌─────────────────────────────────────────────────────────────┐
│ CLIENT SIDE: BookingFormModal.tsx                           │
│ - User fills in booking details                             │
│ - Calls /api/payments/checkout endpoint                     │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ SERVER SIDE: /api/payments/checkout (Edge Function)         │
│ - Validates booking data                                    │
│ - Checks availability (slot locking)                        │
│ - Inserts booking into bookings table (status: 'pending')   │
│ - Creates payment checkout session                          │
│ - Returns checkout URL                                      │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ DATABASE: Supabase PostgreSQL                               │
│ INSERT into public.bookings:                                │
│   - id, property_id, full_name, email, phone               │
│   - booking_date, time_slot, guests                         │
│   - total_amount, status: 'pending'                         │
└─────────────────────────────────────────────────────────────┘
                         ↓
⚡ TRIGGERS REAL-TIME BROADCAST ⚡
(via Supabase postgres_changes)
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ ADMIN DASHBOARD: Real-Time Subscription                     │
│ - Listens to bookings table INSERT/UPDATE/DELETE           │
│ - Currently: silently calls refreshData()                   │
│ - NEW: Should notify admin with toast                       │
└─────────────────────────────────────────────────────────────┘
```

### 2. **Toast Notification System (Already Set Up)**

**Framework**: react-hot-toast v2.4.1

**Current Usage**:
- AdminDashboard: `toast.success("Marked as ...")`
- DiscountsTab: `toast.success("Discount updated")`
- AuthContext: `toast.error("Session expired...")`

**Configured in App.tsx**:
```typescript
<Toaster
  position="top-right"
  reverseOrder={false}
  gutter={8}
  toastOptions={{...}}
/>
```

### 3. **Real-Time Subscription Architecture**

**Location**: `AdminDashboard.tsx` lines 135-191

**Current Setup**:
```typescript
const channel = supabase
  .channel("admin-realtime")
  .on("postgres_changes", {
    event: "*",  // ← Listens to all events (INSERT, UPDATE, DELETE)
    schema: "public",
    table: "bookings",
  },
  () => {
    console.log("Bookings realtime update");
    handleRealtimeChange();  // ← Just refreshes data silently
  })
  .subscribe((status) => {
    if (status === "SUBSCRIBED") {
      console.log("Admin realtime subscribed");
      setRealtimeStatus("connected");
    }
  });
```

**Problem**: The callback doesn't use the payload parameter, so we can't tell if it's a new booking (INSERT) vs. an update (UPDATE).

---

## What Needs to be Changed

### Required Modifications

1. **Update Real-Time Callback Signature**
   - Capture the `payload` parameter from Supabase
   - Extract event type (`payload.eventType`)
   - Extract new record data (`payload.new`)

2. **Add Conditional Logic**
   - Show toast only for INSERT events (new bookings)
   - Format booking details for display (name, date, property, amount)
   - Use appropriate toast type (success, info, or custom)

3. **Optional Enhancements**
   - Show guest count and booking type
   - Display retreat/property name
   - Add sound notification
   - Include action button (go to booking)
   - Use custom toast component with richer UI

---

## Booking Data Structure

From [src/lib/supabase.ts](src/lib/supabase.ts), the Booking interface includes:

```typescript
interface Booking {
  id: string;
  retreat_id: string;
  retreat?: Retreat;
  
  full_name: string;        // ✅ Guest name
  email?: string;
  phone?: string;
  address: string;
  
  booking_date?: string;     // ✅ Date (YYYY-MM-DD)
  time_slot?: "daytime" | "nighttime" | "overnight" | null;  // ✅ Time
  booking_type?: "day" | "night" | "overnight";
  
  guests?: number;           // ✅ Guest count
  num_guests?: number;
  num_cars?: number;
  
  total_amount: number;      // ✅ Total price
  downpayment_amount?: number;
  
  payment_status: PaymentStatus;
  status: BookingStatus;
  
  created_at: string;
}
```

---

## Proposed Implementation

### Toast Notification Content

**Simple version**:
```
✨ New Booking: John Doe
   May 10, 2026 • Daytime • ₱5,000
```

**Rich version** (with retreat name):
```
✨ New Booking from John Doe
   Premier Pool House
   May 10, 2026 • Daytime • 4 guests • ₱5,000
   [View Details →]
```

---

## Step-by-Step Implementation Plan

### Phase 1: Basic Toast (5 minutes)
- Update `.on()` callback to capture payload
- Check for INSERT events only
- Show basic toast with guest name and date

### Phase 2: Enhanced Toast (10 minutes)
- Format booking details nicely
- Include property name (via retreat lookup)
- Add currency formatting
- Show guest count and time slot

### Phase 3: Interactive Toast (Optional, 15 minutes)
- Add "View Details" button
- Highlight the new booking in the list
- Scroll to newly created booking
- Add sound notification option

---

## Related Files

| File | Purpose | Status |
|------|---------|--------|
| [src/components/AdminDashboard.tsx](src/components/AdminDashboard.tsx) | Main admin dashboard, real-time subscriptions | ⚠️ Needs modification |
| [src/lib/supabase.ts](src/lib/supabase.ts) | Type definitions, booking data structure | ✅ Reference only |
| [src/App.tsx](src/App.tsx) | Toast provider configuration | ✅ Already set up |
| [package.json](package.json) | react-hot-toast dependency | ✅ Already installed |

---

## Expected Behavior After Implementation

1. **Admin opens dashboard** → Real-time subscription connects ✅
2. **Client creates booking** → Booking inserted into database
3. **Admin receives toast notification** → "✨ New Booking: John Doe, May 10..."
4. **Toast stays visible** → 4-5 seconds (configurable)
5. **Admin can click** → (Optional) Go to booking details
6. **Bookings list updates** → Data refreshes automatically

---

## Testing Checklist

- [ ] Open admin dashboard in browser
- [ ] Create booking from client (public site)
- [ ] Verify toast appears at top-right
- [ ] Check toast shows correct guest name and date
- [ ] Check toast disappears after 5 seconds
- [ ] Verify bookings list also updates
- [ ] Test with multiple rapid bookings
- [ ] Test on mobile (toast positioning)

---

## Files to Modify

1. **[src/components/AdminDashboard.tsx](src/components/AdminDashboard.tsx)**
   - Lines 135-191: Update real-time subscription callback
   - Add new handler for INSERT events specifically
   - Add logic to format and show toast

---

## Notes

- The real-time engine needs to be enabled in Supabase first (see REALTIME_SETUP.md)
- Current implementation calls `refreshData()` which already fetches the new booking
- Toast is a **real-time enhancement** on top of existing data sync
- No database changes needed
- No backend API changes needed
