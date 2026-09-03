-- ============================================================
-- MIGRATION: 005_add_booking_date.sql
-- Menambahkan kolom booking_date ke tabel court_bookings
-- ============================================================

ALTER TABLE court_bookings 
ADD COLUMN IF NOT EXISTS booking_date DATE;

COMMENT ON COLUMN court_bookings.booking_date IS 'Tanggal customer memesan/booking lapangan (biasanya tanggal bayar DP)';
