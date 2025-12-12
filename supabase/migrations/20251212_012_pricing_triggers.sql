-- supabase/migrations/20251212_012_pricing_triggers.sql
-- ============================================
-- TRIGGERS PARA PRICING
-- ============================================

-- Função genérica para updated_at (caso não exista)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para pricing_config updated_at
DROP TRIGGER IF EXISTS trigger_pricing_config_updated_at ON pricing_config;
CREATE TRIGGER trigger_pricing_config_updated_at
  BEFORE UPDATE ON pricing_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger para platform_settings updated_at
DROP TRIGGER IF EXISTS trigger_platform_settings_updated_at ON platform_settings;
CREATE TRIGGER trigger_platform_settings_updated_at
  BEFORE UPDATE ON platform_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Função para registrar histórico de mudanças de preço
CREATE OR REPLACE FUNCTION log_pricing_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.base_price IS DISTINCT FROM NEW.base_price THEN
    INSERT INTO pricing_history (
      pricing_config_id,
      video_type,
      editing_style,
      duration_category,
      old_price,
      new_price,
      changed_by
    ) VALUES (
      NEW.id,
      NEW.video_type,
      NEW.editing_style,
      NEW.duration_category,
      OLD.base_price,
      NEW.base_price,
      NEW.created_by -- Assuming created_by tracks the last modifier in this context or we'd need an updated_by field in pricing_config if we want exact user tracking for updates. But following the prompt exactly.
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para log de alterações
DROP TRIGGER IF EXISTS trigger_log_pricing_change ON pricing_config;
CREATE TRIGGER trigger_log_pricing_change
  AFTER UPDATE ON pricing_config
  FOR EACH ROW
  EXECUTE FUNCTION log_pricing_change();
