-- =====================================================
-- MIGRATION: Sistema de Wallet do Editor
-- Data: 2024-12-11
-- Descrição: Tabelas para gerenciar saldo e transações
-- =====================================================

-- 1. Tabela de Wallets dos Editores
CREATE TABLE IF NOT EXISTS editor_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  balance DECIMAL(10,2) DEFAULT 0.00,
  pending_balance DECIMAL(10,2) DEFAULT 0.00,
  total_earned DECIMAL(10,2) DEFAULT 0.00,
  total_withdrawn DECIMAL(10,2) DEFAULT 0.00,
  stripe_account_id TEXT, -- Para Stripe Connect (futuro)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabela de Transações da Wallet
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID REFERENCES editor_wallets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR(30) NOT NULL, -- 'payment_received', 'withdrawal', 'refund', 'bonus'
  amount DECIMAL(10,2) NOT NULL,
  description TEXT,
  related_project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  related_batch_video_id UUID REFERENCES batch_videos(id) ON DELETE SET NULL,
  status VARCHAR(20) DEFAULT 'completed', -- 'pending', 'completed', 'failed', 'cancelled'
  stripe_transfer_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT valid_type CHECK (type IN ('payment_received', 'withdrawal', 'refund', 'bonus', 'adjustment')),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'completed', 'failed', 'cancelled'))
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_editor_wallets_user ON editor_wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet ON wallet_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user ON wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_type ON wallet_transactions(type);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_created ON wallet_transactions(created_at DESC);

-- 3. RLS Policies
ALTER TABLE editor_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;

-- Wallet: usuário só vê a própria
CREATE POLICY "editor_wallets_select_own"
ON editor_wallets FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- Wallet: sistema pode atualizar (via functions)
CREATE POLICY "editor_wallets_update_system"
ON editor_wallets FOR UPDATE TO authenticated
USING (user_id = auth.uid());

-- Transactions: usuário vê as próprias
CREATE POLICY "wallet_transactions_select_own"
ON wallet_transactions FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- 4. Função para criar wallet automaticamente
CREATE OR REPLACE FUNCTION create_editor_wallet_if_not_exists(p_user_id UUID)
RETURNS UUID AS $$
DECLARE
  v_wallet_id UUID;
BEGIN
  -- Tentar buscar wallet existente
  SELECT id INTO v_wallet_id
  FROM editor_wallets
  WHERE user_id = p_user_id;
  
  -- Se não existe, criar
  IF v_wallet_id IS NULL THEN
    INSERT INTO editor_wallets (user_id, balance, pending_balance, total_earned, total_withdrawn)
    VALUES (p_user_id, 0, 0, 0, 0)
    RETURNING id INTO v_wallet_id;
  END IF;
  
  RETURN v_wallet_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Função para adicionar pagamento à wallet
CREATE OR REPLACE FUNCTION add_payment_to_wallet(
  p_user_id UUID,
  p_amount DECIMAL(10,2),
  p_project_id UUID,
  p_batch_video_id UUID,
  p_description TEXT DEFAULT 'Pagamento por vídeo aprovado'
)
RETURNS BOOLEAN AS $$
DECLARE
  v_wallet_id UUID;
BEGIN
  -- Garantir que wallet existe
  v_wallet_id := create_editor_wallet_if_not_exists(p_user_id);
  
  -- Atualizar saldo
  UPDATE editor_wallets
  SET 
    balance = balance + p_amount,
    total_earned = total_earned + p_amount,
    updated_at = NOW()
  WHERE id = v_wallet_id;
  
  -- Registrar transação
  INSERT INTO wallet_transactions (
    wallet_id,
    user_id,
    type,
    amount,
    description,
    related_project_id,
    related_batch_video_id,
    status
  ) VALUES (
    v_wallet_id,
    p_user_id,
    'payment_received',
    p_amount,
    p_description,
    p_project_id,
    p_batch_video_id,
    'completed'
  );
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_wallet_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_wallet_updated_at ON editor_wallets;
CREATE TRIGGER trigger_wallet_updated_at
  BEFORE UPDATE ON editor_wallets
  FOR EACH ROW
  EXECUTE FUNCTION update_wallet_updated_at();

-- 7. Conceder permissões às funções
GRANT EXECUTE ON FUNCTION create_editor_wallet_if_not_exists TO authenticated;
GRANT EXECUTE ON FUNCTION add_payment_to_wallet TO authenticated;

-- Comentários
COMMENT ON TABLE editor_wallets IS 'Carteira de saldo dos editores';
COMMENT ON TABLE wallet_transactions IS 'Histórico de transações das carteiras';
COMMENT ON FUNCTION add_payment_to_wallet IS 'Adiciona pagamento à wallet do editor e registra transação';
