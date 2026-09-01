-- ============================================================
-- KasirGOR - Initial Database Schema
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLE: products
-- ============================================================
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sku TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  cost_price NUMERIC,
  stock INTEGER NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'pcs',
  image TEXT,
  barcode TEXT,
  description TEXT,
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);

-- ============================================================
-- TABLE: transactions
-- ============================================================
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_number TEXT UNIQUE NOT NULL,
  cashier_name TEXT NOT NULL,
  customer_name TEXT,
  table_or_court_number TEXT,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  discount_total NUMERIC NOT NULL DEFAULT 0,
  tax_total NUMERIC NOT NULL DEFAULT 0,
  service_total NUMERIC NOT NULL DEFAULT 0,
  grand_total NUMERIC NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'CASH',
  amount_paid NUMERIC NOT NULL DEFAULT 0,
  change_amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'COMPLETED',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_invoice ON transactions(invoice_number);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);

-- ============================================================
-- TABLE: transaction_items
-- ============================================================
CREATE TABLE IF NOT EXISTS transaction_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  product_sku TEXT,
  category TEXT,
  price NUMERIC NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  discount_per_item NUMERIC DEFAULT 0,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transaction_items_transaction_id ON transaction_items(transaction_id);

-- ============================================================
-- TABLE: courts
-- ============================================================
CREATE TABLE IF NOT EXISTS courts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  price_per_hour NUMERIC NOT NULL DEFAULT 0,
  description TEXT,
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: court_bookings
-- ============================================================
CREATE TABLE IF NOT EXISTS court_bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_code TEXT UNIQUE NOT NULL,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  community_name TEXT,
  date DATE NOT NULL,
  court_id UUID REFERENCES courts(id) ON DELETE SET NULL,
  court_name TEXT NOT NULL,
  court_type TEXT NOT NULL,
  court_price_per_hour NUMERIC NOT NULL DEFAULT 0,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  duration_hours NUMERIC NOT NULL DEFAULT 1,
  court_fee NUMERIC NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  dp_amount NUMERIC NOT NULL DEFAULT 0,
  dp_payment_method TEXT,
  dp_paid_at TIMESTAMPTZ,
  dp_cashier TEXT,
  settlement_amount NUMERIC,
  settlement_payment_method TEXT,
  settlement_paid_at TIMESTAMPTZ,
  settlement_cashier TEXT,
  amount_paid_total NUMERIC NOT NULL DEFAULT 0,
  remaining_balance NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'DP_PAID',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_court_bookings_date ON court_bookings(date);
CREATE INDEX IF NOT EXISTS idx_court_bookings_status ON court_bookings(status);
CREATE INDEX IF NOT EXISTS idx_court_bookings_court_id ON court_bookings(court_id);
CREATE INDEX IF NOT EXISTS idx_court_bookings_code ON court_bookings(booking_code);

-- ============================================================
-- TABLE: booking_additional_items
-- ============================================================
CREATE TABLE IF NOT EXISTS booking_additional_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES court_bookings(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  qty INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_booking_additional_items_booking_id ON booking_additional_items(booking_id);

-- ============================================================
-- TABLE: staff
-- ============================================================
CREATE TABLE IF NOT EXISTS staff (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'Kasir',
  phone TEXT,
  email TEXT,
  assigned_shift TEXT,
  assigned_unit TEXT,
  status TEXT NOT NULL DEFAULT 'AKTIF',
  avatar_color TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_staff_status ON staff(status);

-- ============================================================
-- TABLE: shift_schedules
-- ============================================================
CREATE TABLE IF NOT EXISTS shift_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  assigned_staff_count INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: shift_logs
-- ============================================================
CREATE TABLE IF NOT EXISTS shift_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_name TEXT NOT NULL,
  shift_name TEXT NOT NULL,
  date TEXT NOT NULL,
  start_time TEXT,
  end_time TEXT,
  opening_cash NUMERIC NOT NULL DEFAULT 0,
  closing_cash NUMERIC,
  total_sales NUMERIC DEFAULT 0,
  total_transactions INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'BERJALAN',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shift_logs_date ON shift_logs(date);

-- ============================================================
-- TRIGGER: auto-update updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE TRIGGER courts_updated_at
  BEFORE UPDATE ON courts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE TRIGGER court_bookings_updated_at
  BEFORE UPDATE ON court_bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE TRIGGER staff_updated_at
  BEFORE UPDATE ON staff
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE TRIGGER shift_logs_updated_at
  BEFORE UPDATE ON shift_logs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- RLS: Disable RLS for now (allow all for anon key)
-- ============================================================
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE courts ENABLE ROW LEVEL SECURITY;
ALTER TABLE court_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_additional_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for anon" ON products FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON transactions FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON transaction_items FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON courts FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON court_bookings FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON booking_additional_items FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON staff FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON shift_schedules FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON shift_logs FOR ALL TO anon USING (true) WITH CHECK (true);
