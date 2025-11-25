-- =====================================================
-- FASE 16: WARNINGS E BANIMENTOS
-- =====================================================

-- CRIAR TABELA USER_WARNINGS
CREATE TABLE IF NOT EXISTS user_warnings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  
  warning_type TEXT CHECK (warning_type IN (
    'contact_sharing',
    'inappropriate_behavior',
    'spam',
    'poor_quality',
    'repeated_cancellations',
    'payment_abuse',
    'fake_portfolio',
    'other'
  )) NOT NULL,
  
  severity TEXT CHECK (severity IN ('warning', 'suspension', 'ban')) NOT NULL,
  
  reason TEXT NOT NULL,
  related_project_id UUID REFERENCES projects(id),
  related_dispute_id UUID REFERENCES disputes(id),
  
  suspension_until TIMESTAMP WITH TIME ZONE,
  is_permanent_ban BOOLEAN DEFAULT FALSE,
  
  issued_by UUID REFERENCES admin_users(id) NOT NULL,
  issued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  revoked BOOLEAN DEFAULT FALSE,
  revoked_by UUID REFERENCES admin_users(id),
  revoked_at TIMESTAMP WITH TIME ZONE,
  revoke_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_user_warnings_user ON user_warnings(user_id, issued_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_warnings_active ON user_warnings(user_id) 
  WHERE NOT revoked AND (suspension_until IS NULL OR suspension_until > NOW());
CREATE INDEX IF NOT EXISTS idx_user_warnings_type ON user_warnings(warning_type);

-- TRIGGER PARA ATUALIZAR METADATA
CREATE OR REPLACE FUNCTION update_user_metadata_on_warning()
RETURNS TRIGGER AS $$
BEGIN
  -- Incrementar contador de warnings
  UPDATE user_metadata_extension
  SET total_warnings = total_warnings + 1
  WHERE user_id = NEW.user_id;
  
  -- Se for banimento
  IF NEW.severity = 'ban' THEN
    UPDATE user_metadata_extension
    SET 
      is_banned = TRUE,
      ban_reason = NEW.reason,
      banned_by = NEW.issued_by,
      banned_at = NEW.issued_at
    WHERE user_id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_warning_issued ON user_warnings;
CREATE TRIGGER on_warning_issued
  AFTER INSERT ON user_warnings
  FOR EACH ROW
  EXECUTE FUNCTION update_user_metadata_on_warning();

-- FUNÇÃO PARA CALCULAR BIAS SCORE
CREATE OR REPLACE FUNCTION calculate_user_bias_score(p_user_id UUID)
RETURNS DECIMAL AS $$
DECLARE
  v_score DECIMAL := 0;
  v_total_projects INTEGER;
  v_cancelled INTEGER;
  v_disputed INTEGER;
  v_warnings INTEGER;
  v_avg_rating DECIMAL;
BEGIN
  -- Buscar estatísticas do usuário
  SELECT 
    COUNT(*) FILTER (WHERE status IN ('completed', 'cancelled')) as total,
    COUNT(*) FILTER (WHERE status = 'cancelled' AND creator_id = p_user_id) as cancelled,
    COUNT(*) FILTER (WHERE has_dispute = TRUE) as disputed
  INTO v_total_projects, v_cancelled, v_disputed
  FROM projects
  WHERE creator_id = p_user_id OR assigned_editor_id = p_user_id;
  
  -- Buscar warnings
  SELECT COUNT(*) INTO v_warnings
  FROM user_warnings
  WHERE user_id = p_user_id AND NOT revoked;
  
  -- Buscar rating médio dado pelo usuário
  SELECT AVG(rating) INTO v_avg_rating
  FROM reviews
  WHERE reviewer_id = p_user_id;
  
  -- Calcular score (0-100, quanto maior pior)
  IF v_total_projects > 0 THEN
    -- Taxa de cancelamento alta
    IF v_cancelled::DECIMAL / v_total_projects > 0.3 THEN
      v_score := v_score + 30;
    END IF;
    
    -- Taxa de disputa alta
    IF v_disputed::DECIMAL / v_total_projects > 0.1 THEN
      v_score := v_score + 25;
    END IF;
  END IF;
  
  -- Warnings recebidos
  v_score := v_score + (v_warnings * 10);
  
  -- Rating muito baixo (indica que é muito crítico)
  IF v_avg_rating IS NOT NULL AND v_avg_rating < 2.5 THEN
    v_score := v_score + 20;
  END IF;
  
  -- Limitar entre 0-100
  v_score := LEAST(v_score, 100);
  
  -- Atualizar metadata
  UPDATE user_metadata_extension
  SET bias_score = v_score
  WHERE user_id = p_user_id;
  
  RETURN v_score;
END;
$$ LANGUAGE plpgsql;
