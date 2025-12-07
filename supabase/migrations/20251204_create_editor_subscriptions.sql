-- ============================================
-- CRIAR TABELA EDITOR_SUBSCRIPTIONS
-- ============================================

CREATE TABLE IF NOT EXISTS editor_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  editor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES subscription_plans(id),
  status TEXT NOT NULL DEFAULT 'pending', -- pending, active, past_due, cancelled, expired
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN DEFAULT false,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_editor_subscriptions_editor ON editor_subscriptions(editor_id);
CREATE INDEX IF NOT EXISTS idx_editor_subscriptions_status ON editor_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_editor_subscriptions_stripe ON editor_subscriptions(stripe_subscription_id);

-- RLS
ALTER TABLE editor_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Users can view own subscription" ON editor_subscriptions;
CREATE POLICY "Users can view own subscription"
ON editor_subscriptions
FOR SELECT
TO authenticated
USING (editor_id = auth.uid());

DROP POLICY IF EXISTS "Service role can manage subscriptions" ON editor_subscriptions;
CREATE POLICY "Service role can manage subscriptions"
ON editor_subscriptions
FOR ALL
TO service_role
USING (true);
