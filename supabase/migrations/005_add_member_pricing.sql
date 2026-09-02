-- ============================================================
-- Migration 005: Tambah kolom harga member ke court_pricing_rules
-- Jalankan di Supabase Dashboard ? SQL Editor
-- ============================================================

ALTER TABLE court_pricing_rules
  ADD COLUMN IF NOT EXISTS member_day_price NUMERIC NOT NULL DEFAULT 60000,
  ADD COLUMN IF NOT EXISTS member_night_price NUMERIC NOT NULL DEFAULT 85000;
