# Production Deployment Guide

## Architecture Overview

This project uses a **secure, scalable backend architecture**:

```
┌─────────────────────────────────────────────────────────┐
│                   React Frontend                          │
│  (src/lib/supabase.ts - Admin API calls via auth token) │
└────────────────────┬────────────────────────────────────┘
                     │ Bearer Token Auth
                     ▼
┌─────────────────────────────────────────────────────────┐
│        Supabase Edge Functions (API)                     │
│  ├─ /api/admin/bookings                                 │
│  ├─ /api/admin/blocked-dates                            │
│  └─ Service Role Authentication (Server-side)           │
└────────────────────┬────────────────────────────────────┘
                     │ Service Role Key
                     ▼
┌─────────────────────────────────────────────────────────┐
│  Supabase Database with RLS Policies                     │
│  ├─ bookings (RLS enabled - secure)                      │
│  ├─ blocked_dates (RLS enabled - secure)                 │
│  └─ retreats (publicly readable)                         │
└─────────────────────────────────────────────────────────┘
```

## Security Guarantees

### Frontend (Client-Side)
- ✅ **No direct database access** - All admin operations go through Edge Functions
- ✅ **Bearer token authentication** - Uses user session token
- ✅ **Frontend auth check** - Only authenticated admins can call functions
- ✅ **Protected routes** - AdminDashboard component verifies authenticated session

### Backend (Edge Functions)
- ✅ **Service Role Key** - Has unrestricted database access (server-side secret only)
- ✅ **Token verification** - Validates Bearer token authenticity
- ✅ **Role-based access control** - Checks `user.app_metadata.role === 'admin'`
- ✅ **SQL injection prevention** - Uses Supabase SDK parameterized queries
- ✅ **No RLS conflicts** - Service role bypasses RLS (RLS remains for regular users)

### Database (Supabase)
- ✅ **Row Level Security (RLS) enabled** - Protects against unauthorized client access
- ✅ **Regular users isolated** - Can only see/modify their own bookings
- ✅ **Admins use service role** - Edge Functions authenticate via service role key
- ✅ **No open policies** - No `USING true` or `USING (auth.uid() IS NOT NULL)` policies

## Environment Variables

### Required for Production

```bash
# Supabase - Frontend (public, safe to commit to repo)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...

# Supabase - Backend ONLY (SECRET - never commit to repo)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# PayMongo - Payment Processing (optional but recommended)
VITE_PAYMONGO_PUBLIC_KEY=pk_...      # Frontend public key
SUPABASE_PAYMONGO_SECRET_KEY=sk_...   # Backend secret key (Edge Functions)
```

### Where to Set Them

**Local Development (.env.local - gitignored):**
```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
VITE_PAYMONGO_PUBLIC_KEY=...
SUPABASE_PAYMONGO_SECRET_KEY=...
```

**Production (Supabase Dashboard):**
1. Go to Supabase Dashboard → Project Settings → API Keys
2. Add to **Edge Function secrets**:
   - `SUPABASE_SERVICE_ROLE_KEY` from the "Service Role" key
   - `SUPABASE_PAYMONGO_SECRET_KEY` for payment processing

## Admin User Setup

### Grant Admin Role in Supabase

```sql
-- Run in Supabase SQL Editor
UPDATE auth.users
SET app_metadata = jsonb_set(
  COALESCE(app_metadata, '{}'::jsonb),
  '{role}',
  '"admin"'
)
WHERE email = 'admin@example.com';
```

## File Structure

### Backend (Edge Functions)

```
api/
├── _shared/
│   ├── supabaseAdmin.ts       ← Service role client
│   ├── response.ts            ← Consistent response utilities (NEW)
│   ├── catalog.ts             ← Public retreat data
│   └── paymongo.ts            ← Payment utilities
├── admin/
│   ├── bookings.ts            ← ENHANCED: GET/PATCH with validation
│   └── blocked-dates.ts       ← ENHANCED: GET/POST/DELETE with validation
├── bookings/
│   └── create.ts              ← Customer-facing booking creation
└── payments/
    └── checkout.ts            ← Payment checkout handler
```

### Frontend (React)

```
src/
├── lib/
│   ├── supabase.ts            ← REFACTORED: All admin calls via API
│   ├── bookingApi.ts          ← Customer booking API calls
│   └── propertyData.ts        ← Static retreat data
├── components/
│   ├── AdminDashboard.tsx     ← Admin interface (unchanged UI)
│   ├── AdminCalendarView.tsx  ← Calendar management (uses API)
│   └── ProtectedRoute.tsx     ← Auth guard for admin routes
└── context/
    └── AuthContext.tsx        ← Auth state management
```

## Edge Function Response Format

All Edge Functions now return **consistent JSON responses**:

### Success Response (200-201)
```json
{
  "success": true,
  "data": { /* operation result */ }
}
```

### Error Response (400-500)
```json
{
  "success": false,
  "error": "Descriptive error message"
}
```

### HTTP Status Codes
- **200**: Successful GET/PATCH
- **201**: Successful POST (created)
- **400**: Bad request (validation error)
- **401**: Unauthorized (missing/invalid token)
- **404**: Resource not found
- **405**: Method not allowed
- **409**: Conflict (e.g., duplicate blocked date)
- **500**: Server error

## Admin Operations

### Fetch All Bookings
```
GET /api/admin/bookings
Authorization: Bearer {session_token}
```

### Update Booking
```
PATCH /api/admin/bookings
Authorization: Bearer {session_token}
{
  "bookingId": "uuid",
  "updates": {
    "status": "approved",
    "payment_status": "paid"
  }
}
```

### Fetch Blocked Dates
```
GET /api/admin/blocked-dates?retreat_id=uuid
Authorization: Bearer {session_token}
```

### Block a Date
```
POST /api/admin/blocked-dates
Authorization: Bearer {session_token}
{
  "retreatId": "uuid",
  "date": "2026-04-15",
  "reason": "Maintenance"
}
```

### Unblock a Date
```
DELETE /api/admin/blocked-dates?id=uuid
Authorization: Bearer {session_token}
```

## Deployment Checklist

### Before Going Live

- [ ] Set all environment variables in Supabase project settings
- [ ] Grant admin role to admin users via SQL
- [ ] Test admin login and operations in staging
- [ ] Verify RLS policies are enabled on `bookings` and `blocked_dates` tables
- [ ] Verify service role key is NOT exposed in frontend code
- [ ] Enable CORS in Supabase project settings (if needed)
- [ ] Test payment flow with PayMongo keys (if applicable)
- [ ] Enable audit logging in Supabase (optional but recommended)

### Deployment

```bash
# Build frontend
npm run build

# Deploy to Supabase (via CLI or dashboard)
npm install -g supabase
supabase link --project-ref your-project-ref
supabase functions deploy

# Verify Edge Functions deployed
supabase functions list
```

## Error Handling

### Common Issues & Solutions

**Error: "Unauthorized" on admin calls**
- ✅ Verify user is logged in via AdminLogin
- ✅ Check user has `role: 'admin'` in `auth.users.app_metadata`
- ✅ Verify Bearer token is being passed correctly

**Error: "Method not allowed"**
- ✅ Check correct HTTP method (GET/POST/PATCH/DELETE)
- ✅ Verify endpoint path is correct

**Error: "Internal server error"**
- ✅ Check Supabase service role key is set
- ✅ Check database query syntax
- ✅ Review Edge Function logs in Supabase dashboard

**Error: "Booking not found" on update**
- ✅ Verify booking ID is correct and exists
- ✅ Check that RLS isn't blocking the query

## Monitoring & Logging

### Edge Function Logs
```
Supabase Dashboard → Functions → Select function → Logs
```

### Best Practices
- ✅ All errors are logged with context
- ✅ User actions (admin updates) are logged
- ✅ Auth failures are logged with user ID
- ✅ Database errors logged with error message

## PayMongo Integration (When Ready)

### Payment Flow
1. Frontend sends booking request to `/api/bookings/create` with payment details
2. Edge Function creates checkout session via PayMongo API
3. Customer redirects to PayMongo checkout
4. PayMongo webhook confirms payment
5. Edge Function updates booking status to `payment_status: 'paid'`

### Keys Handling
- ✅ Public key stored in `.env.local` for frontend
- ✅ Secret key stored in Supabase Edge Function secrets (server-only)
- ✅ Missing keys don't crash app (graceful fallback)

## Next Steps

1. **Deploy to Supabase**: Push code to production branch
2. **Set Environment Variables**: Add keys in Supabase project settings
3. **Test Admin Flow**: Login and verify CRUD operations work
4. **Configure PayMongo**: Add payment keys when ready
5. **Monitor Logs**: Watch Edge Function logs for errors
6. **Backup Database**: Enable point-in-time recovery (PITR)

---

**Last Updated**: 2026-03-30  
**Architecture Version**: Production-Ready v1.0  
**Status**: ✅ Ready for Deployment
