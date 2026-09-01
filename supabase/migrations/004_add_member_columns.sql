-- ============================================================
-- MIGRATION: 004_add_member_columns.sql
-- Menambahkan kolom khusus Member Badminton ke tabel court_bookings
-- ============================================================

ALTER TABLE court_bookings 
ADD COLUMN IF NOT EXISTS member_type TEXT DEFAULT 'INSIDENTIL',
ADD COLUMN IF NOT EXISTS member_day TEXT,
ADD COLUMN IF NOT EXISTS member_sessions_count INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS member_dates JSONB;

-- Comment dokumentasi kolom
COMMENT ON COLUMN court_bookings.member_type IS 'Tipe sewa: MEMBER (Langganan Mingguan 1 Bulan) atau INSIDENTIL (Sekali Main)';
COMMENT ON COLUMN court_bookings.member_day IS 'Hari rutin main mingguan (misal: Senin, Selasa, dst)';
COMMENT ON COLUMN court_bookings.member_sessions_count IS 'Total pertemuan dalam 1 bulan (4 atau 5 pertemuan)';
COMMENT ON COLUMN court_bookings.member_dates IS 'Array JSON tanggal-tanggal pertemuan dalam bulan tersebut';
