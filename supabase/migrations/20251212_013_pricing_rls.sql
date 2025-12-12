-- supabase/migrations/20251212_013_pricing_rls.sql
-- ============================================
-- ROW LEVEL SECURITY PARA PRICING
-- ============================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE pricing_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PRICING_CONFIG POLICIES
-- ============================================

-- Todos autenticados podem ler preços ativos (necessário para calcular valores)
DROP POLICY IF EXISTS "Anyone can view active pricing" ON pricing_config;
CREATE POLICY "Anyone can view active pricing"
ON pricing_config FOR SELECT
TO authenticated
USING (is_active = true);

-- Apenas admins podem gerenciar preços
DROP POLICY IF EXISTS "Admins can manage pricing" ON pricing_config;
CREATE POLICY "Admins can manage pricing"
ON pricing_config FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.user_type = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.user_type = 'admin'
  )
);

-- ============================================
-- PRICING_HISTORY POLICIES
-- ============================================

-- Apenas admins podem ver histórico de preços
DROP POLICY IF EXISTS "Admins can view pricing history" ON pricing_history;
CREATE POLICY "Admins can view pricing history"
ON pricing_history FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.user_type = 'admin'
  )
);

-- Sistema pode inserir histórico (via trigger)
DROP POLICY IF EXISTS "System can insert pricing history" ON pricing_history;
CREATE POLICY "System can insert pricing history"
ON pricing_history FOR INSERT
TO authenticated
WITH CHECK (true);

-- ============================================
-- PLATFORM_SETTINGS POLICIES
-- ============================================

-- Todos autenticados podem ler configurações (necessário para validações)
DROP POLICY IF EXISTS "Anyone can view settings" ON platform_settings;
CREATE POLICY "Anyone can view settings"
ON platform_settings FOR SELECT
TO authenticated
USING (true);

-- Apenas admins podem modificar configurações
DROP POLICY IF EXISTS "Admins can manage settings" ON platform_settings;
CREATE POLICY "Admins can manage settings"
ON platform_settings FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.user_type = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.user_type = 'admin'
  )
);
