-- ============================================
-- FRAMEUP - FASE 13: APROVAÇÃO DE EDITORES
-- Schema do Banco de Dados
-- Execute este script no Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. CRIAR TABELA EDITOR_APPROVAL_QUEUE
-- ============================================

CREATE TABLE editor_approval_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  editor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  
  -- Dados da análise
  portfolio_quality_score INTEGER CHECK (portfolio_quality_score BETWEEN 1 AND 5),
  profile_completeness_score INTEGER CHECK (profile_completeness_score BETWEEN 1 AND 5),
  reviewer_notes TEXT,
  rejection_reason TEXT,
  
  -- Workflow
  reviewed_by UUID REFERENCES admin_users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Flags automáticas
  has_duplicate_portfolio BOOLEAN DEFAULT FALSE,
  has_suspicious_links BOOLEAN DEFAULT FALSE,
  auto_flags JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_editor_approval_status ON editor_approval_queue(status);
CREATE INDEX idx_editor_approval_pending ON editor_approval_queue(submitted_at) 
  WHERE status = 'pending';
CREATE INDEX idx_editor_approval_reviewed_by ON editor_approval_queue(reviewed_by);
CREATE INDEX idx_editor_approval_editor ON editor_approval_queue(editor_id);

COMMENT ON TABLE editor_approval_queue IS 'Fila de aprovação para novos editores';
COMMENT ON COLUMN editor_approval_queue.portfolio_quality_score IS 'Score de 1-5 da qualidade do portfólio';
COMMENT ON COLUMN editor_approval_queue.profile_completeness_score IS 'Score de 1-5 da completude do perfil';
COMMENT ON COLUMN editor_approval_queue.auto_flags IS 'Flags automáticas de verificação (JSON)';

-- ============================================
-- 2. TRIGGER PARA ADICIONAR NA FILA
-- ============================================

-- Função que adiciona editor na fila quando perfil é criado
CREATE OR REPLACE FUNCTION add_editor_to_approval_queue()
RETURNS TRIGGER AS $$
BEGIN
  -- Adicionar na fila de aprovação
  INSERT INTO editor_approval_queue (editor_id)
  VALUES (NEW.user_id)
  ON CONFLICT (editor_id) DO NOTHING;
  
  -- Garantir que existe entrada na metadata com status pending
  INSERT INTO user_metadata_extension (user_id, approval_status)
  VALUES (NEW.user_id, 'pending')
  ON CONFLICT (user_id) DO UPDATE
  SET approval_status = 'pending',
      updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger que executa após inserção de perfil de editor
CREATE TRIGGER on_editor_profile_created
  AFTER INSERT ON editor_profiles
  FOR EACH ROW
  EXECUTE FUNCTION add_editor_to_approval_queue();

COMMENT ON FUNCTION add_editor_to_approval_queue IS 'Adiciona editor na fila de aprovação quando perfil é criado';

-- ============================================
-- 3. FUNÇÃO PARA APROVAR EDITOR
-- ============================================

CREATE OR REPLACE FUNCTION approve_editor(
  p_editor_id UUID,
  p_admin_id UUID,
  p_portfolio_score INTEGER DEFAULT NULL,
  p_profile_score INTEGER DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_admin_user_id UUID;
BEGIN
  -- Buscar o user_id do admin a partir do admin_id
  SELECT user_id INTO v_admin_user_id
  FROM admin_users
  WHERE id = p_admin_id;
  
  -- Atualizar fila de aprovação
  UPDATE editor_approval_queue
  SET 
    status = 'approved',
    portfolio_quality_score = p_portfolio_score,
    profile_completeness_score = p_profile_score,
    reviewer_notes = p_notes,
    reviewed_by = p_admin_id,
    reviewed_at = NOW(),
    updated_at = NOW()
  WHERE editor_id = p_editor_id;
  
  -- Atualizar metadata do usuário
  INSERT INTO user_metadata_extension (
    user_id, 
    approval_status, 
    approved_by, 
    approved_at,
    approval_notes
  )
  VALUES (
    p_editor_id,
    'approved',
    p_admin_id,
    NOW(),
    p_notes
  )
  ON CONFLICT (user_id) DO UPDATE
  SET 
    approval_status = 'approved',
    approved_by = p_admin_id,
    approved_at = NOW(),
    approval_notes = p_notes,
    updated_at = NOW();
  
  -- Log da ação
  INSERT INTO admin_action_logs (
    admin_id, 
    action_type, 
    target_type, 
    target_id, 
    action_details,
    reason
  )
  VALUES (
    p_admin_id, 
    'approve_editor', 
    'user', 
    p_editor_id,
    jsonb_build_object(
      'portfolio_score', p_portfolio_score,
      'profile_score', p_profile_score
    ),
    p_notes
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION approve_editor IS 'Aprova um editor e atualiza todos os registros relacionados';

-- ============================================
-- 4. FUNÇÃO PARA REJEITAR EDITOR
-- ============================================

CREATE OR REPLACE FUNCTION reject_editor(
  p_editor_id UUID,
  p_admin_id UUID,
  p_rejection_reason TEXT,
  p_portfolio_score INTEGER DEFAULT NULL,
  p_profile_score INTEGER DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_admin_user_id UUID;
BEGIN
  -- Buscar o user_id do admin a partir do admin_id
  SELECT user_id INTO v_admin_user_id
  FROM admin_users
  WHERE id = p_admin_id;
  
  -- Atualizar fila de aprovação
  UPDATE editor_approval_queue
  SET 
    status = 'rejected',
    portfolio_quality_score = p_portfolio_score,
    profile_completeness_score = p_profile_score,
    rejection_reason = p_rejection_reason,
    reviewed_by = p_admin_id,
    reviewed_at = NOW(),
    updated_at = NOW()
  WHERE editor_id = p_editor_id;
  
  -- Atualizar metadata do usuário
  INSERT INTO user_metadata_extension (
    user_id,
    approval_status,
    approval_notes
  )
  VALUES (
    p_editor_id,
    'rejected',
    p_rejection_reason
  )
  ON CONFLICT (user_id) DO UPDATE
  SET 
    approval_status = 'rejected',
    approval_notes = p_rejection_reason,
    updated_at = NOW();
  
  -- Log da ação
  INSERT INTO admin_action_logs (
    admin_id, 
    action_type, 
    target_type, 
    target_id,
    action_details,
    reason
  )
  VALUES (
    p_admin_id, 
    'reject_editor', 
    'user', 
    p_editor_id,
    jsonb_build_object(
      'portfolio_score', p_portfolio_score,
      'profile_score', p_profile_score
    ),
    p_rejection_reason
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION reject_editor IS 'Rejeita um editor e atualiza todos os registros relacionados';

-- ============================================
-- 5. FUNÇÃO PARA VERIFICAÇÕES AUTOMÁTICAS
-- ============================================

CREATE OR REPLACE FUNCTION run_editor_auto_checks(p_editor_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_flags JSONB := '{}'::jsonb;
  v_portfolio_count INTEGER;
  v_profile_data RECORD;
BEGIN
  -- Verificar se tem vídeos de portfólio
  SELECT COUNT(*) INTO v_portfolio_count
  FROM portfolio_videos
  WHERE editor_id = p_editor_id;
  
  IF v_portfolio_count = 0 THEN
    v_flags := v_flags || jsonb_build_object('no_portfolio', true);
  END IF;
  
  -- Buscar dados do perfil
  SELECT * INTO v_profile_data
  FROM editor_profiles
  WHERE user_id = p_editor_id;
  
  -- Verificar completude do perfil
  IF v_profile_data.bio IS NULL OR LENGTH(v_profile_data.bio) < 50 THEN
    v_flags := v_flags || jsonb_build_object('incomplete_bio', true);
  END IF;
  
  IF v_profile_data.specialties IS NULL OR array_length(v_profile_data.specialties, 1) = 0 THEN
    v_flags := v_flags || jsonb_build_object('no_specialties', true);
  END IF;
  
  IF v_profile_data.software_skills IS NULL OR array_length(v_profile_data.software_skills, 1) = 0 THEN
    v_flags := v_flags || jsonb_build_object('no_software_skills', true);
  END IF;
  
  -- Atualizar flags na fila
  UPDATE editor_approval_queue
  SET auto_flags = v_flags,
      updated_at = NOW()
  WHERE editor_id = p_editor_id;
  
  RETURN v_flags;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION run_editor_auto_checks IS 'Executa verificações automáticas em um editor e retorna flags';

-- ============================================
-- 6. VIEW PARA FACILITAR CONSULTAS
-- ============================================

CREATE OR REPLACE VIEW pending_editors_view AS
SELECT 
  eq.id,
  eq.editor_id,
  eq.status,
  eq.portfolio_quality_score,
  eq.profile_completeness_score,
  eq.reviewer_notes,
  eq.rejection_reason,
  eq.reviewed_by,
  eq.reviewed_at,
  eq.submitted_at,
  eq.auto_flags,
  
  -- Dados do usuário
  u.email,
  u.full_name,
  u.username,
  u.created_at as user_created_at,
  
  -- Dados do perfil
  ep.bio,
  ep.city,
  ep.state,
  ep.specialties,
  ep.software_skills,
  
  -- Contagem de portfólio
  (SELECT COUNT(*) FROM portfolio_videos WHERE editor_id = eq.editor_id) as portfolio_count,
  
  -- Dados do revisor (se houver)
  au.role as reviewer_role,
  
  -- Tempo na fila
  EXTRACT(EPOCH FROM (NOW() - eq.submitted_at))/3600 as hours_in_queue
  
FROM editor_approval_queue eq
LEFT JOIN users u ON u.user_id = eq.editor_id
LEFT JOIN editor_profiles ep ON ep.user_id = eq.editor_id
LEFT JOIN admin_users au ON au.id = eq.reviewed_by
WHERE eq.status = 'pending'
ORDER BY eq.submitted_at ASC;

COMMENT ON VIEW pending_editors_view IS 'View consolidada de editores pendentes de aprovação';

-- ============================================
-- 7. CONFIGURAR RLS
-- ============================================

-- Habilitar RLS
ALTER TABLE editor_approval_queue ENABLE ROW LEVEL SECURITY;

-- Admins com permissão podem ver a fila
CREATE POLICY "Admins can view approval queue"
  ON editor_approval_queue FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid()
      AND is_active = TRUE
      AND 'approve_editors' = ANY(permissions)
    )
  );

-- Admins com permissão podem atualizar
CREATE POLICY "Admins can update approval queue"
  ON editor_approval_queue FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid()
      AND is_active = TRUE
      AND 'approve_editors' = ANY(permissions)
    )
  );

-- Editores podem ver seu próprio status
CREATE POLICY "Editors can view their own status"
  ON editor_approval_queue FOR SELECT
  USING (editor_id = auth.uid());

-- ============================================
-- 8. VERIFICAR INSTALAÇÃO
-- ============================================

-- Verificar se a tabela foi criada
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'editor_approval_queue';

-- Verificar se as funções foram criadas
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name IN (
  'add_editor_to_approval_queue',
  'approve_editor',
  'reject_editor',
  'run_editor_auto_checks'
);

-- Verificar se a view foi criada
SELECT table_name 
FROM information_schema.views 
WHERE table_schema = 'public' 
AND table_name = 'pending_editors_view';

-- ============================================
-- SCRIPT CONCLUÍDO
-- ============================================

-- Próximos passos:
-- 1. Execute todo este script no Supabase SQL Editor
-- 2. Verifique se não há erros
-- 3. Teste criando um editor de teste
-- 4. Verifique se ele aparece na fila automaticamente
-- 5. Teste as funções approve_editor e reject_editor
