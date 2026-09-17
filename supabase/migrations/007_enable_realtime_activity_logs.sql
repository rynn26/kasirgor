-- ============================================================
-- 007: ENABLE SUPABASE REALTIME FOR ACTIVITY LOGS & REALTIME TABLES
-- ============================================================
-- This migration adds activity_logs and related tables to the
-- supabase_realtime publication so that postgres_changes events
-- are broadcasted instantly to Owner devices in real-time.

DO $$
BEGIN
  -- Add activity_logs to realtime publication if not already added
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'activity_logs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE activity_logs;
  END IF;

  -- Add cashier_presence to realtime publication if exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'cashier_presence') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'cashier_presence'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE cashier_presence;
    END IF;
  END IF;

  -- Add court_bookings to realtime publication if exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'court_bookings') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'court_bookings'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE court_bookings;
    END IF;
  END IF;

  -- Add transactions to realtime publication if exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'transactions') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'transactions'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE transactions;
    END IF;
  END IF;

  -- Add products to realtime publication if exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'products') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'products'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE products;
    END IF;
  END IF;
END $$;
