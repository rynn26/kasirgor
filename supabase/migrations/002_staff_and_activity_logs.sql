-- ============================================================
-- 1. EXTENSION: pgcrypto (untuk hashing password auth)
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- 2. INSERT KASIR KE TABEL staff
-- ============================================================
-- Menghapus dulu jika ada nama yang sama agar tidak duplikat
DELETE FROM staff WHERE email IN ('yulibadminton11@gmail.com', 'asfiapickleball99@gmail.com') OR name IN ('Yuli', 'Asfia');

INSERT INTO staff (id, name, role, phone, email, assigned_shift, assigned_unit, status, avatar_color)
VALUES 
  (
    'a1111111-1111-4111-a111-111111111111',
    'Yuli',
    'Kasir',
    '0812-1111-2222',
    'yulibadminton11@gmail.com',
    'Shift Pagi (08:00 - 17:00)',
    'Semua Unit',
    'AKTIF',
    'from-orange-500 to-red-600'
  ),
  (
    'b2222222-2222-4222-b222-222222222222',
    'Asfia',
    'Kasir',
    '0813-3333-4444',
    'asfiapickleball99@gmail.com',
    'Shift Sore (17:00 - 23:00)',
    'Semua Unit',
    'AKTIF',
    'from-emerald-500 to-teal-600'
  )
ON CONFLICT (id) DO UPDATE 
SET 
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  phone = EXCLUDED.phone,
  email = EXCLUDED.email,
  assigned_shift = EXCLUDED.assigned_shift,
  assigned_unit = EXCLUDED.assigned_unit,
  status = EXCLUDED.status;

-- ============================================================
-- 3. INSERT / REGISTER KE SUPABASE AUTH (auth.users)
-- ============================================================
-- Akun 1: Yuli (yulibadminton11@gmail.com / sinyoyuli11)
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'a1111111-1111-4111-a111-111111111111',
  'authenticated',
  'authenticated',
  'yulibadminton11@gmail.com',
  crypt('sinyoyuli11', gen_salt('bf')),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"name":"Yuli","role":"Kasir"}',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE 
SET 
  encrypted_password = crypt('sinyoyuli11', gen_salt('bf')),
  email_confirmed_at = NOW(),
  raw_user_meta_data = '{"name":"Yuli","role":"Kasir"}';

-- Akun 2: Asfia (asfiapickleball99@gmail.com / sinyoasfia99)
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'b2222222-2222-4222-b222-222222222222',
  'authenticated',
  'authenticated',
  'asfiapickleball99@gmail.com',
  crypt('sinyoasfia99', gen_salt('bf')),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"name":"Asfia","role":"Kasir"}',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE 
SET 
  encrypted_password = crypt('sinyoasfia99', gen_salt('bf')),
  email_confirmed_at = NOW(),
  raw_user_meta_data = '{"name":"Asfia","role":"Kasir"}';

-- ============================================================
-- 4. TABEL: activity_logs (Audit Trail Perubahan & Log Kasir)
-- ============================================================
CREATE TABLE IF NOT EXISTS activity_logs (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  staff_name TEXT NOT NULL,
  staff_email TEXT,
  role TEXT NOT NULL DEFAULT 'Kasir',
  action_type TEXT NOT NULL,
  title TEXT NOT NULL,
  details TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action_type ON activity_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_staff_name ON activity_logs(staff_name);

-- ============================================================
-- 5. TABEL: cashier_presence (Presensi & Kasir Online)
-- ============================================================
CREATE TABLE IF NOT EXISTS cashier_presence (
  staff_name TEXT PRIMARY KEY,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'Kasir',
  unit TEXT,
  shift TEXT,
  status TEXT NOT NULL DEFAULT 'OFFLINE',
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 6. DISABLE RLS / ALLOW ALL ACCESS FOR POS CLIENT
-- ============================================================
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to staff" ON staff;
CREATE POLICY "Allow all access to staff" ON staff FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to activity_logs" ON activity_logs;
CREATE POLICY "Allow all access to activity_logs" ON activity_logs FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE cashier_presence ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to cashier_presence" ON cashier_presence;
CREATE POLICY "Allow all access to cashier_presence" ON cashier_presence FOR ALL USING (true) WITH CHECK (true);
