-- Migration 010: Academy Settlement (Pelunasan) Fields
-- Allows tracking DP and Pelunasan on separate dates with independent payment methods (CASH/QRIS)

ALTER TABLE public.academy_transactions 
ADD COLUMN IF NOT EXISTS settled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS settlement_amount NUMERIC(15, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS settlement_payment_method TEXT CHECK (settlement_payment_method IN ('QRIS', 'CASH') OR settlement_payment_method IS NULL),
ADD COLUMN IF NOT EXISTS settlement_cashier_name TEXT;

-- Index for searching / filtering settled transactions by settlement date
CREATE INDEX IF NOT EXISTS idx_academy_settled_at ON public.academy_transactions(settled_at);
