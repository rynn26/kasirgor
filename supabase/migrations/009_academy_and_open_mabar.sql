-- Migration 009: Academy Transactions & Open Mabar Transactions
-- Separate tables to prevent any collision or regression with court bookings

-- 1. Table for Sinyo Academy Transactions
CREATE TABLE IF NOT EXISTS public.academy_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_number TEXT NOT NULL UNIQUE,
    customer_name TEXT NOT NULL,
    program TEXT NOT NULL CHECK (program IN ('BADMINTON', 'PICKLEBALL')),
    category TEXT CHECK (category IN ('ANAK', 'DEWASA') OR category IS NULL),
    package TEXT CHECK (package IN ('4X', '5X') OR package IS NULL),
    training_month TEXT,
    session_time TEXT CHECK (session_time IN ('PAGI_SIANG', 'SORE_MALAM') OR session_time IS NULL),
    period_start DATE,
    period_end DATE,
    fee_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    dp_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    remaining_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('QRIS', 'CASH')),
    status TEXT NOT NULL DEFAULT 'LUNAS' CHECK (status IN ('LUNAS', 'DP_PAID')),
    cashier_name TEXT NOT NULL,
    shift TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexes for academy_transactions
CREATE INDEX IF NOT EXISTS idx_academy_created_at ON public.academy_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_academy_program ON public.academy_transactions(program);
CREATE INDEX IF NOT EXISTS idx_academy_customer ON public.academy_transactions(customer_name);

-- 2. Table for Open Mabar Transactions
CREATE TABLE IF NOT EXISTS public.open_mabar_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_number TEXT NOT NULL UNIQUE,
    sport_type TEXT NOT NULL CHECK (sport_type IN ('BADMINTON', 'PICKLEBALL')),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    nominal_cash NUMERIC(15, 2) NOT NULL DEFAULT 0,
    nominal_qris NUMERIC(15, 2) NOT NULL DEFAULT 0,
    total_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    cashier_name TEXT NOT NULL,
    shift TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexes for open_mabar_transactions
CREATE INDEX IF NOT EXISTS idx_open_mabar_created_at ON public.open_mabar_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_open_mabar_date ON public.open_mabar_transactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_open_mabar_sport ON public.open_mabar_transactions(sport_type);

-- RLS Configuration
ALTER TABLE public.academy_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.open_mabar_transactions ENABLE ROW LEVEL SECURITY;

-- Permissive public policies
DROP POLICY IF EXISTS "Public full access to academy_transactions" ON public.academy_transactions;
CREATE POLICY "Public full access to academy_transactions"
    ON public.academy_transactions
    FOR ALL
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Public full access to open_mabar_transactions" ON public.open_mabar_transactions;
CREATE POLICY "Public full access to open_mabar_transactions"
    ON public.open_mabar_transactions
    FOR ALL
    USING (true)
    WITH CHECK (true);
