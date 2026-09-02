-- ============================================================
-- Migration 006: Tambah kolom harga pickleball ke court_pricing_rules
-- Jalankan di Supabase Dashboard -> SQL Editor
-- ============================================================

ALTER TABLE court_pricing_rules
  ADD COLUMN IF NOT EXISTS pickleball_day_price NUMERIC NOT NULL DEFAULT 60000,
  ADD COLUMN IF NOT EXISTS pickleball_night_price NUMERIC NOT NULL DEFAULT 85000;
