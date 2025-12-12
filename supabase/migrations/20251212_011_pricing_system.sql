-- supabase/migrations/20251212_011_pricing_system.sql
-- ============================================
-- SISTEMA DE PRECIFICAÇÃO DINÂMICA
-- ============================================

-- Tabela de preços base
CREATE TABLE IF NOT EXISTS pricing_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_type VARCHAR(20) NOT NULL CHECK (video_type IN ('reels', 'motion', 'youtube')),
  editing_style VARCHAR(20) NOT NULL CHECK (editing_style IN ('lofi', 'dynamic', 'pro', 'motion')),
  duration_category VARCHAR(10) NOT NULL CHECK (duration_category IN ('30s', '1m', '2m', '5m')),
  base_price DECIMAL(10,2) NOT NULL CHECK (base_price > 0),
  platform_fee_percent DECIMAL(5,2) DEFAULT 15.00 CHECK (platform_fee_percent >= 0 AND platform_fee_percent <= 100),
  estimated_delivery_days INTEGER NOT NULL CHECK (estimated_delivery_days > 0),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  -- Constraint: Cada combinação única
  CONSTRAINT unique_pricing_combo UNIQUE (video_type, editing_style, duration_category)
);

-- Histórico de alterações de preços (auditoria)
CREATE TABLE IF NOT EXISTS pricing_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pricing_config_id UUID REFERENCES pricing_config(id) ON DELETE CASCADE,
  video_type VARCHAR(20) NOT NULL,
  editing_style VARCHAR(20) NOT NULL,
  duration_category VARCHAR(10) NOT NULL,
  old_price DECIMAL(10,2),
  new_price DECIMAL(10,2) NOT NULL,
  changed_by UUID REFERENCES auth.users(id),
  change_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Configurações globais (descontos, taxa da plataforma global, etc)
CREATE TABLE IF NOT EXISTS platform_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key VARCHAR(50) UNIQUE NOT NULL,
  setting_value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Índices para performance
CREATE INDEX idx_pricing_config_active ON pricing_config(is_active);
CREATE INDEX idx_pricing_config_type ON pricing_config(video_type);
CREATE INDEX idx_pricing_history_config ON pricing_history(pricing_config_id);
CREATE INDEX idx_pricing_history_date ON pricing_history(created_at DESC);
CREATE INDEX idx_platform_settings_key ON platform_settings(setting_key);

-- Comentários nas tabelas
COMMENT ON TABLE pricing_config IS 'Configuração de preços por combinação de tipo/estilo/duração';
COMMENT ON TABLE pricing_history IS 'Histórico de alterações de preços para auditoria';
COMMENT ON TABLE platform_settings IS 'Configurações globais da plataforma (descontos, taxas, etc)';
