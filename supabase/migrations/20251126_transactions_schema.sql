-- ============================================
-- FRAMEUP - SCHEMA DE TRANSAÇÕES FINANCEIRAS
-- Data: 26/11/2025
-- Fase: 21.1
-- ============================================

-- ============================================
-- 1. CRIAR ENUMS
-- ============================================

-- Tipos de transação financeira
CREATE TYPE transaction_type AS ENUM (
  'project_payment',      -- Pagamento de projeto pelo creator
  'editor_payout',        -- Repasse para editor
  'subscription_payment', -- Pagamento de assinatura
  'refund',               -- Reembolso
  'platform_fee',         -- Taxa da plataforma
  'adjustment'            -- Ajuste manual
);

-- Status da transação
CREATE TYPE transaction_status AS ENUM (
  'pending',    -- Aguardando processamento
  'processing', -- Em processamento
  'completed',  -- Concluído
  'failed',     -- Falhou
  'refunded',   -- Reembolsado
  'cancelled'   -- Cancelado
);

-- ============================================
-- 2. CRIAR TABELA DE TRANSAÇÕES
-- ============================================

CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type transaction_type NOT NULL,
  status transaction_status DEFAULT 'pending',
  
  -- Valores
  amount NUMERIC(10,2) NOT NULL, -- Valor bruto
  currency TEXT DEFAULT 'BRL',
  platform_fee NUMERIC(10,2) DEFAULT 0, -- Taxa da plataforma
  net_amount NUMERIC(10,2), -- Valor líquido (amount - platform_fee)
  
  -- Relacionamentos
  user_id UUID REFERENCES auth.users(id), -- Usuário relacionado (creator ou editor)
  project_id UUID REFERENCES projects(id), -- Projeto relacionado (se aplicável)
  subscription_id UUID, -- FK para editor_subscriptions (adicionar constraint se tabela existir)
  
  -- Stripe
  stripe_payment_intent_id TEXT, -- ID do PaymentIntent no Stripe
  stripe_charge_id TEXT, -- ID do Charge no Stripe
  stripe_transfer_id TEXT, -- ID da Transfer no Stripe
  stripe_refund_id TEXT, -- ID do Refund no Stripe
  
  -- Metadados
  description TEXT,
  metadata JSONB, -- Dados extras
  
  -- Timestamps
  processed_at TIMESTAMP WITH TIME ZONE, -- Quando foi processado
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_transactions_user ON transactions(user_id);
CREATE INDEX idx_transactions_project ON transactions(project_id);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_created ON transactions(created_at DESC);
CREATE INDEX idx_transactions_stripe_pi ON transactions(stripe_payment_intent_id) WHERE stripe_payment_intent_id IS NOT NULL;

COMMENT ON TABLE transactions IS 'Registro de todas as movimentações financeiras da plataforma';

-- ============================================
-- 3. CRIAR TABELA DE RESUMO DIÁRIO
-- ============================================

CREATE TABLE financial_daily_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  summary_date DATE UNIQUE NOT NULL,
  
  -- Valores Financeiros
  total_revenue NUMERIC(10,2) DEFAULT 0, -- Receita total
  project_payments NUMERIC(10,2) DEFAULT 0, -- Pagamentos de projetos
  subscription_payments NUMERIC(10,2) DEFAULT 0, -- Pagamentos de assinaturas
  platform_fees NUMERIC(10,2) DEFAULT 0, -- Taxas coletadas
  editor_payouts NUMERIC(10,2) DEFAULT 0, -- Repasses para editores
  refunds NUMERIC(10,2) DEFAULT 0, -- Reembolsos
  net_revenue NUMERIC(10,2) DEFAULT 0, -- Receita líquida
  
  -- Contagens de Transações
  transaction_count INTEGER DEFAULT 0,
  successful_transactions INTEGER DEFAULT 0,
  failed_transactions INTEGER DEFAULT 0,
  
  -- Métricas de Assinaturas
  new_subscriptions INTEGER DEFAULT 0,
  cancelled_subscriptions INTEGER DEFAULT 0,
  active_subscriptions INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE financial_daily_summary IS 'Agregado diário de métricas financeiras para dashboards rápidos';

-- ============================================
-- 4. VIEW PARA DASHBOARD
-- ============================================

CREATE OR REPLACE VIEW v_financial_overview AS
SELECT
  -- Período
  DATE_TRUNC('month', t.created_at) as month,
  
  -- Receitas
  SUM(CASE WHEN t.type = 'project_payment' AND t.status = 'completed' THEN t.amount ELSE 0 END) as project_revenue,
  SUM(CASE WHEN t.type = 'subscription_payment' AND t.status = 'completed' THEN t.amount ELSE 0 END) as subscription_revenue,
  SUM(CASE WHEN t.status = 'completed' THEN t.platform_fee ELSE 0 END) as platform_fees,
  
  -- Saídas
  SUM(CASE WHEN t.type = 'editor_payout' AND t.status = 'completed' THEN t.amount ELSE 0 END) as editor_payouts,
  SUM(CASE WHEN t.type = 'refund' AND t.status = 'completed' THEN t.amount ELSE 0 END) as refunds,
  
  -- Contagens
  COUNT(*) FILTER (WHERE t.status = 'completed') as completed_transactions,
  COUNT(*) FILTER (WHERE t.status = 'failed') as failed_transactions,
  
  -- Métricas
  AVG(CASE WHEN t.type = 'project_payment' AND t.status = 'completed' THEN t.amount END) as avg_project_value
  
FROM transactions t
GROUP BY DATE_TRUNC('month', t.created_at)
ORDER BY month DESC;

-- ============================================
-- 5. FUNÇÕES DE SUPORTE
-- ============================================

-- Função para atualizar o resumo diário
CREATE OR REPLACE FUNCTION update_financial_daily_summary(target_date DATE DEFAULT CURRENT_DATE)
RETURNS VOID AS $$
BEGIN
  INSERT INTO financial_daily_summary (
    summary_date,
    total_revenue,
    project_payments,
    subscription_payments,
    platform_fees,
    editor_payouts,
    refunds,
    net_revenue,
    transaction_count,
    successful_transactions,
    failed_transactions,
    new_subscriptions,
    cancelled_subscriptions,
    active_subscriptions,
    updated_at
  )
  SELECT
    target_date,
    COALESCE(SUM(CASE WHEN type IN ('project_payment', 'subscription_payment') AND status = 'completed' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type = 'project_payment' AND status = 'completed' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type = 'subscription_payment' AND status = 'completed' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN status = 'completed' THEN platform_fee ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type = 'editor_payout' AND status = 'completed' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type = 'refund' AND status = 'completed' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type IN ('project_payment', 'subscription_payment') AND status = 'completed' THEN platform_fee ELSE 0 END), 0),
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'completed'),
    COUNT(*) FILTER (WHERE status = 'failed'),
    -- Nota: Estas subqueries assumem que a tabela editor_subscriptions existe. Se não, retornarão 0 ou erro.
    -- Ajuste conforme necessário quando a tabela de assinaturas for criada.
    (SELECT COUNT(*) FROM editor_subscriptions WHERE DATE(created_at) = target_date),
    (SELECT COUNT(*) FROM editor_subscriptions WHERE DATE(updated_at) = target_date AND status = 'cancelled'),
    (SELECT COUNT(*) FROM editor_subscriptions WHERE status = 'active'),
    NOW()
  FROM transactions
  WHERE DATE(created_at) = target_date
  ON CONFLICT (summary_date)
  DO UPDATE SET
    total_revenue = EXCLUDED.total_revenue,
    project_payments = EXCLUDED.project_payments,
    subscription_payments = EXCLUDED.subscription_payments,
    platform_fees = EXCLUDED.platform_fees,
    editor_payouts = EXCLUDED.editor_payouts,
    refunds = EXCLUDED.refunds,
    net_revenue = EXCLUDED.net_revenue,
    transaction_count = EXCLUDED.transaction_count,
    successful_transactions = EXCLUDED.successful_transactions,
    failed_transactions = EXCLUDED.failed_transactions,
    new_subscriptions = EXCLUDED.new_subscriptions,
    cancelled_subscriptions = EXCLUDED.cancelled_subscriptions,
    active_subscriptions = EXCLUDED.active_subscriptions,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para registrar uma nova transação
CREATE OR REPLACE FUNCTION record_transaction(
  p_type transaction_type,
  p_amount NUMERIC,
  p_user_id UUID DEFAULT NULL,
  p_project_id UUID DEFAULT NULL,
  p_subscription_id UUID DEFAULT NULL,
  p_stripe_payment_intent_id TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_platform_fee NUMERIC;
  v_net_amount NUMERIC;
  v_transaction_id UUID;
BEGIN
  -- Calcular taxa da plataforma (5% para projetos, exemplo)
  IF p_type = 'project_payment' THEN
    v_platform_fee := p_amount * 0.05;
  ELSE
    v_platform_fee := 0;
  END IF;
  
  v_net_amount := p_amount - v_platform_fee;
  
  INSERT INTO transactions (
    type, amount, platform_fee, net_amount,
    user_id, project_id, subscription_id,
    stripe_payment_intent_id, description, metadata,
    status
  ) VALUES (
    p_type, p_amount, v_platform_fee, v_net_amount,
    p_user_id, p_project_id, p_subscription_id,
    p_stripe_payment_intent_id, p_description, p_metadata,
    'pending'
  ) RETURNING id INTO v_transaction_id;
  
  RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. TRIGGERS
-- ============================================

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_transaction_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_transaction_timestamp();

-- ============================================
-- 7. RLS POLICIES (SEGURANÇA)
-- ============================================

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_daily_summary ENABLE ROW LEVEL SECURITY;

-- Transactions: admins podem ver tudo, usuários só as próprias
CREATE POLICY "Admins can view all transactions"
  ON transactions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE user_id = auth.uid() 
      AND is_active = true
      AND 'view_financial_data' = ANY(permissions)
    )
  );

CREATE POLICY "Users can view own transactions"
  ON transactions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Financial summary: apenas admins
CREATE POLICY "Only admins can view financial summary"
  ON financial_daily_summary FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE user_id = auth.uid() 
      AND is_active = true
      AND 'view_financial_data' = ANY(permissions)
    )
  );

-- ============================================
-- FIM DO SCRIPT
-- ============================================
