-- supabase/migrations/20251212_015_update_pricing_structure.sql
-- ============================================
-- ATUALIZAR ESTRUTURA DE PREÇOS
-- ============================================

-- 1. Remover constraint antigo de duration_category
ALTER TABLE pricing_config DROP CONSTRAINT IF EXISTS pricing_config_duration_category_check;

-- 2. Adicionar novo constraint com TODAS as durações possíveis
ALTER TABLE pricing_config 
  ADD CONSTRAINT pricing_config_duration_category_check 
  CHECK (duration_category IN ('30s', '1m', '1m30s', '2m', '3m', '5m', '8m', '12m', '15m', '25m'));

-- 3. Limpar dados antigos (necessário para nova estrutura)
DELETE FROM pricing_config;

-- 4. Resetar sequência de histórico (opcional, para auditoria limpa)
DELETE FROM pricing_history;

-- Confirmar alterações
COMMENT ON TABLE pricing_config IS 'Configuração de preços - Atualizada em 12/12/2025 com nova estrutura de durações';
