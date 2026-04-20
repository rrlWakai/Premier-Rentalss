-- ─── Profiles table ──────────────────────────────────────────────────────────
-- Stores per-user roles managed by admins.
-- app_metadata.role (Supabase Auth) controls portal access (admin/staff).
-- profiles.role controls invite-system access (admin/user).

CREATE TABLE IF NOT EXISTS profiles (
  id         UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role       TEXT        NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users may read their own profile
CREATE POLICY "profiles: users read own"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Users may insert their own profile row (initial creation on first login)
CREATE POLICY "profiles: users insert own"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ─── Set the first admin manually ────────────────────────────────────────────
-- After running this migration, promote your first admin via SQL:
--
--   INSERT INTO profiles (id, role)
--   SELECT id, 'admin'
--   FROM auth.users
--   WHERE email = 'your-admin@example.com'
--   ON CONFLICT (id) DO UPDATE SET role = 'admin';
