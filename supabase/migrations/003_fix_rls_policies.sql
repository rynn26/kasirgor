-- ============================================================
-- Fix RLS Policies for both anon & authenticated users
-- Jalankan query ini di Supabase Dashboard -> SQL Editor
-- ============================================================

-- Drop old policies
DROP POLICY IF EXISTS "Allow all for anon" ON products;
DROP POLICY IF EXISTS "Allow all for anon" ON transactions;
DROP POLICY IF EXISTS "Allow all for anon" ON transaction_items;
DROP POLICY IF EXISTS "Allow all for anon" ON courts;
DROP POLICY IF EXISTS "Allow all for anon" ON court_bookings;
DROP POLICY IF EXISTS "Allow all for anon" ON booking_additional_items;
DROP POLICY IF EXISTS "Allow all for anon" ON staff;
DROP POLICY IF EXISTS "Allow all for anon" ON shift_schedules;
DROP POLICY IF EXISTS "Allow all for anon" ON shift_logs;

DROP POLICY IF EXISTS "Allow all for public" ON products;
DROP POLICY IF EXISTS "Allow all for public" ON transactions;
DROP POLICY IF EXISTS "Allow all for public" ON transaction_items;
DROP POLICY IF EXISTS "Allow all for public" ON courts;
DROP POLICY IF EXISTS "Allow all for public" ON court_bookings;
DROP POLICY IF EXISTS "Allow all for public" ON booking_additional_items;
DROP POLICY IF EXISTS "Allow all for public" ON staff;
DROP POLICY IF EXISTS "Allow all for public" ON shift_schedules;
DROP POLICY IF EXISTS "Allow all for public" ON shift_logs;

-- Create full access policies for public (both anon and authenticated)
CREATE POLICY "Allow all for public" ON products FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for public" ON transactions FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for public" ON transaction_items FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for public" ON courts FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for public" ON court_bookings FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for public" ON booking_additional_items FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for public" ON staff FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for public" ON shift_schedules FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for public" ON shift_logs FOR ALL TO public USING (true) WITH CHECK (true);
