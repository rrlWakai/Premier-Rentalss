# Security Architecture

## Defense in Depth Strategy

```
┌──────────────────────────────────────────────────────────────┐
│ Layer 1: Frontend Authentication                             │
│ - User login via Supabase Auth                               │
│ - Session stored with Bearer token                           │
│ - Protected routes check auth state                          │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│ Layer 2: API Authorization                                   │
│ - Bearer token passed in Authorization header                │
│ - Edge Function validates token authenticity                 │
│ - Checks user.app_metadata.role === 'admin'                 │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│ Layer 3: Database Access Control                             │
│ - Service role key used (server-side only)                   │
│ - Bypasses RLS for authorized server operations              │
│ - Regular users still protected by RLS                       │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│ Layer 4: Input Validation                                    │
│ - Edge Functions validate all inputs                         │
│ - Check resource existence before operations                 │
│ - Prevent duplicate operations (409 Conflict)                │
└──────────────────────────────────────────────────────────────┘
```

## Authentication Flow

### User Login
```
User enters credentials
    ↓
Supabase Auth validates email/password
    ↓
Session created with:
  - user.id (UUID)
  - user.email
  - user.app_metadata.role = 'admin' (if admin)
  - access_token (JWT)
    ↓
Stored in browser localStorage
```

### API Request
```
Frontend calls API:
  GET /api/admin/bookings
  Headers: { Authorization: "Bearer {access_token}" }
    ↓
Edge Function receives request:
  1. Extracts token from header
  2. Calls supabaseAdmin.auth.getUser(token)
  3. Validates response.user exists
  4. Checks response.user.app_metadata.role === 'admin'
    ↓
If all checks pass:
  - Query database with service role
  - Return data
    ↓
If any check fails:
  - Return 401 Unauthorized
```

## Why Service Role?

### Problem with Direct RLS
```typescript
// ❌ This fails for admin:
const { data: bookings } = await supabase
  .from("bookings")
  .select("*");
// Why? RLS policy prevents regular users from seeing all bookings
// Frontend has no way to bypass RLS
```

### Solution: Service Role
```typescript
// ✅ This works on the server:
const { data: bookings } = await supabaseAdmin
  .from("bookings")
  .select("*");
// Server-side service role key bypasses RLS
// Client never sees the secret key
```

## RLS Policy Design

### What RLS Should Look Like

**bookings table:**
```sql
-- Regular users can ONLY see their own bookings
CREATE POLICY "users_select_own_bookings" ON bookings
  FOR SELECT
  USING (auth.uid() = created_by);

CREATE POLICY "users_insert_own_bookings" ON bookings
  FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- Admin role or service role can do anything (via Edge Functions)
-- No need for explicit RLS for admin - service role bypasses RLS
```

**blocked_dates table:**
```sql
-- Regular users can view blocked dates (no sensitive data)
CREATE POLICY "public_view_blocked_dates" ON blocked_dates
  FOR SELECT
  USING (true);

-- Only service role (via Edge Functions) can insert/delete
-- No policy for INSERT/DELETE - only service role can do these
```

### What RLS Should NOT Look Like

❌ **Anti-Pattern 1: Open access**
```sql
-- BAD: Allows everyone to do everything
CREATE POLICY "open" ON bookings
  FOR ALL
  USING (true);
```

❌ **Anti-Pattern 2: Authenticated users get all access**
```sql
-- BAD: All logged-in users can see all bookings
CREATE POLICY "all_authenticated" ON bookings
  FOR SELECT
  USING (auth.role() = 'authenticated');
```

❌ **Anti-Pattern 3: No policies at all**
```sql
-- BAD: RLS enabled but no policies = no access (oops!)
-- Admins via service role still work, but causes issues
```

## Token Security

### Access Token (Sent to Frontend)
- ✅ JWT token with expiration
- ✅ Contains user info and metadata
- ✅ Sent in Authorization header to API
- ✅ Safe to use - automatically rotated by Supabase Auth

### Service Role Key (Server-Side Secret)
- 🔒 **NEVER expose to frontend**
- 🔒 **NEVER commit to git** (use environment variables)
- 🔒 **ONLY use in Edge Functions** on the server
- 🔒 Has unrestricted database access (used for admin ops)

### Bearer Token Flow
```
[Browser localStorage]
  access_token: "eyJhbGc..."
         ↓
[Frontend API Call]
  Authorization: "Bearer eyJhbGc..."
         ↓
[Edge Function]
  token = "eyJhbGc..."
  getUser(token) → validates signature
         ↓
[Supabase Auth]
  Confirms token is valid
  Returns user object
```

## Admin Role Assignment

### Via SQL (Recommended)
```sql
UPDATE auth.users
SET app_metadata = jsonb_set(
  COALESCE(app_metadata, '{}'::jsonb),
  '{role}',
  '"admin"'
)
WHERE email = 'admin@example.com';

-- Verify
SELECT email, app_metadata->>'role' as role
FROM auth.users
WHERE email = 'admin@example.com';
```

### What This Does
- Sets `user.app_metadata.role = 'admin'` in database
- This value is included in every JWT token for that user
- Edge Functions check this field to authorize admin access

## Preventing Common Attacks

### 1. Unauthorized Data Access
```
Attacker tries: GET /api/admin/bookings without auth
Defense: "Authorization" header required → 401 Unauthorized
```

### 2. Privilege Escalation
```
Attacker tries: curl with Bearer token but no admin role
Defense: Role check fails → 401 Unauthorized
```

### 3. Duplicate Blocked Dates
```
Attacker tries: POST same date twice
Defense: Duplicate check returns 409 Conflict
```

### 4. Deleting Non-Existent Rows
```
Attacker tries: DELETE /api/admin/blocked-dates?id=fake-id
Defense: Not found check returns 404 Not Found
```

### 5. SQL Injection
```
Attacker tries: Pass SQL in request: { bookingId: "'; DROP TABLE--" }
Defense: Supabase SDK uses parameterized queries → safe
```

### 6. Session Hijacking
```
Attacker tries: Steal Bearer token from localStorage
Defense: Token is automatically rotated; CORS prevents cross-origin calls
```

## Monitoring & Auditing

### What to Track
- ✅ All admin API calls (log user_id + action)
- ✅ Failed auth attempts (log attempt + reason)
- ✅ Data modifications (log before/after)
- ✅ Errors (log for debugging)

### Implementation
```typescript
// In Edge Function
console.error("Unauthorized admin access attempt:", {
  userId: user?.id,
  email: user?.email,
  role: user?.app_metadata?.role,
  action: "fetchBookings",
  timestamp: new Date().toISOString(),
});
```

### View Logs
- Supabase Dashboard → Functions → Select Function → Logs
- Or use: `supabase functions logs admin:bookings`

## CORS Configuration (If Needed)

Default Supabase CORS settings allow same-origin requests:
- ✅ Requests from `yourdomain.com` → Supabase allowed
- ✅ Requests from `api.supabase.co` → Cross-origin allowed

If deploying frontend elsewhere:
```javascript
// Supabase SDK handles CORS automatically
// No additional configuration needed
```

## Data Sensitivity Levels

### Public (No Auth Needed)
- ✅ Retreat catalog (`retreats` table)
- ✅ Testimonials (public reviews)
- ✅ Blocked dates (users need to see them)

### Private (Auth Required)
- 🔒 Bookings (users see only their own)
- 🔒 Payment status
- 🔒 Personal contact info

### Admin Only (Service Role + API)
- 🔐 All bookings (admin view)
- 🔐 Update booking status
- 🔐 Manage blocked dates
- 🔐 Admin dashboard operations

## Deployment Security Checklist

- [ ] Service role key is in Supabase secrets (not `.env.local`)
- [ ] Service role key is NOT in git history
- [ ] All admin functions require Bearer token
- [ ] RLS policies are enabled on sensitive tables
- [ ] Admin users have `role: 'admin'` in app_metadata
- [ ] Edge Functions validate admin role on every request
- [ ] Input validation catches malformed requests
- [ ] Error messages don't leak sensitive info
- [ ] Logging tracks unauthorized attempts
- [ ] HTTPS enforced (Supabase handles this)

## Maintenance & Updates

### Rotating Secrets
```
Old Service Role Key → New Service Role Key
  1. Generate new key in Supabase
  2. Update Edge Function secrets
  3. Deploy functions
  4. Monitor logs for errors
  5. Revoke old key
```

### Revoking Admin Access
```sql
UPDATE auth.users
SET app_metadata = jsonb_delete(
  app_metadata,
  '{role}'
)
WHERE email = 'former-admin@example.com';
```

### Regular Audits
- Review admin user list monthly
- Check Edge Function logs for errors
- Verify RLS policies are still correct
- Update password policies as needed

---

**Security Status**: ✅ Production-Ready  
**Last Reviewed**: 2026-03-30  
**Next Review**: Quarterly
