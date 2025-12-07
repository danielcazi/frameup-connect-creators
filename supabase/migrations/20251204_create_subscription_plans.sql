-- ============================================
-- FRAMEUP - CRIAR TABELA SUBSCRIPTION_PLANS
-- Data: 04/12/2025
-- ============================================

-- Verificar se tabela existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'subscription_plans'
  ) THEN
    -- Criar tabela se não existir
    CREATE TABLE subscription_plans (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL UNIQUE, -- 'basic' ou 'pro'
      display_name TEXT NOT NULL, -- 'Plano Basic' ou 'Plano Pro'
      description TEXT,
      price NUMERIC(10,2) NOT NULL,
      currency TEXT DEFAULT 'BRL',
      interval TEXT DEFAULT 'month', -- 'month' ou 'year'
      max_simultaneous_projects INTEGER NOT NULL DEFAULT 2,
      platform_fee_percentage NUMERIC(5,2) NOT NULL DEFAULT 15.00,
      has_highlight_badge BOOLEAN DEFAULT false,
      has_priority_support BOOLEAN DEFAULT false,
      has_early_access BOOLEAN DEFAULT false,
      features JSONB, -- Array de features como JSON
      stripe_price_id TEXT, -- ID do Price no Stripe
      stripe_product_id TEXT, -- ID do Product no Stripe
      is_active BOOLEAN DEFAULT true,
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Índices
    CREATE INDEX idx_subscription_plans_name ON subscription_plans(name);
    CREATE INDEX idx_subscription_plans_active ON subscription_plans(is_active);

    RAISE NOTICE 'Tabela subscription_plans criada com sucesso!';
  ELSE
    RAISE NOTICE 'Tabela subscription_plans já existe.';
  END IF;
END $$;

-- Habilitar RLS
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

-- Policy para leitura pública (todos podem ver os planos)
DROP POLICY IF EXISTS "Anyone can view active plans" ON subscription_plans;
CREATE POLICY "Anyone can view active plans"
ON subscription_plans
FOR SELECT
USING (is_active = true);

-- Policy para admins gerenciarem planos
DROP POLICY IF EXISTS "Admins can manage plans" ON subscription_plans;
CREATE POLICY "Admins can manage plans"
ON subscription_plans
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admin_users 
    WHERE user_id = auth.uid() 
    AND is_active = true
  )
);

COMMENT ON TABLE subscription_plans IS 'Planos de assinatura para editores';
