-- ============================================================
-- 008: PUSH SUBSCRIPTIONS TABLE (Web Push untuk Owner HP)
-- ============================================================
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id TEXT PRIMARY KEY,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'owner',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to push_subscriptions" ON push_subscriptions;
CREATE POLICY "Allow all access to push_subscriptions" ON push_subscriptions FOR ALL USING (true) WITH CHECK (true);
