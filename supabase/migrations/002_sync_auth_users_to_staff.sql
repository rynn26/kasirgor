-- ============================================================
-- KasirGOR: Auto-sync Supabase Auth users to public.staff table
-- Jalankan query ini di Supabase Dashboard -> SQL Editor
-- ============================================================

-- 1. Masukkan akun yang sudah ada di Authentication (seperti admin@poslapangan.app) ke tabel staff
INSERT INTO public.staff (id, name, role, email, phone, status, assigned_unit, assigned_shift, avatar_color)
SELECT 
  id,
  INITCAP(SPLIT_PART(email, '@', 1)) AS name,
  'Owner' AS role,
  email,
  phone,
  'AKTIF' AS status,
  'Semua Unit' AS assigned_unit,
  'Shift Pagi (08:00 - 17:00)' AS assigned_shift,
  'from-orange-500 to-red-600' AS avatar_color
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- 2. Buat Trigger Otomatis: Setiap ada user baru yang dibuat di Authentication -> langsung otomatis masuk ke tabel staff
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.staff (id, name, role, email, phone, status, assigned_unit, assigned_shift, avatar_color)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', INITCAP(SPLIT_PART(NEW.email, '@', 1))),
    COALESCE(NEW.raw_user_meta_data->>'role', 'Owner'),
    NEW.email,
    NEW.phone,
    'AKTIF',
    'Semua Unit',
    'Shift Pagi (08:00 - 17:00)',
    'from-orange-500 to-red-600'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    phone = EXCLUDED.phone;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();
