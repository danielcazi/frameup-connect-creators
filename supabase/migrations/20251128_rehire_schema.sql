-- ================================================
-- SISTEMA DE RECONTRATAÇÃO DE EDITORES
-- FrameUp - Fase 25
-- ================================================

-- ================================================
-- 1. ADICIONAR NOVO STATUS (Se for enum, senão apenas ignorar)
-- ================================================

-- Tentativa de adicionar ao enum se existir, caso contrário nada acontece (pois é TEXT)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'project_status_enum') THEN
        ALTER TYPE project_status_enum ADD VALUE IF NOT EXISTS 'pending_acceptance' AFTER 'draft';
    END IF;
END$$;

-- ================================================
-- 2. ADICIONAR CAMPOS NA TABELA PROJECTS
-- ================================================

-- Campo para indicar se é recontratação
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS is_rehire BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS rehire_editor_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS rehire_message TEXT,
ADD COLUMN IF NOT EXISTS rehire_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS rehire_responded_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS rehire_rejection_reason TEXT;

-- Índice para buscar projetos de recontratação pendentes
CREATE INDEX IF NOT EXISTS idx_projects_pending_acceptance 
ON projects(rehire_editor_id, status) 
WHERE status = 'pending_acceptance';

-- Comentários
COMMENT ON COLUMN projects.is_rehire IS 'Indica se o projeto é uma recontratação direta';
COMMENT ON COLUMN projects.rehire_editor_id IS 'ID do editor sendo recontratado (antes de aceitar)';
COMMENT ON COLUMN projects.rehire_message IS 'Mensagem personalizada do creator para o editor';

-- ================================================
-- 3. CRIAR VIEW DE EDITORES TRABALHADOS
-- ================================================

CREATE OR REPLACE VIEW creator_worked_editors AS
SELECT DISTINCT
  p.creator_id,
  p.assigned_editor_id as editor_id,
  pr.full_name as editor_name,
  pr.username as editor_username,
  pr.profile_photo_url as editor_photo,
  ep.rating_average as editor_rating,
  (SELECT COUNT(*) FROM projects WHERE assigned_editor_id = p.assigned_editor_id AND status = 'completed') as editor_total_projects,
  ep.specialties as editor_specialties,
  COUNT(p.id) OVER (PARTITION BY p.creator_id, p.assigned_editor_id) as projects_together,
  MAX(p.updated_at) OVER (PARTITION BY p.creator_id, p.assigned_editor_id) as last_project_at,
  -- Última avaliação que o creator deu para este editor
  (
    SELECT r.rating_overall 
    FROM reviews r 
    WHERE r.reviewer_id = p.creator_id 
      AND r.reviewee_id = p.assigned_editor_id 
    ORDER BY r.created_at DESC 
    LIMIT 1
  ) as last_rating_given
FROM projects p
JOIN users pr ON pr.id = p.assigned_editor_id
LEFT JOIN editor_profiles ep ON ep.user_id = p.assigned_editor_id
WHERE p.status = 'completed'
  AND p.assigned_editor_id IS NOT NULL;

COMMENT ON VIEW creator_worked_editors IS 'Lista de editores com quem cada creator já trabalhou';

-- ================================================
-- 4. FUNÇÕES PARA RECONTRATAÇÃO
-- ================================================

-- Verificar se creator pode recontratar
CREATE OR REPLACE FUNCTION can_rehire_editor(
  p_creator_id UUID,
  p_editor_id UUID
) RETURNS TABLE (
  can_rehire BOOLEAN,
  reason TEXT
) AS $$
BEGIN
  -- Verificar se já trabalhou com o editor
  IF NOT EXISTS (
    SELECT 1 FROM projects 
    WHERE creator_id = p_creator_id 
    AND assigned_editor_id = p_editor_id 
    AND status = 'completed'
  ) THEN
    RETURN QUERY SELECT FALSE, 'Você nunca trabalhou com este editor';
    RETURN;
  END IF;
  
  -- Verificar se já tem proposta pendente para este editor
  IF EXISTS (
    SELECT 1 FROM projects 
    WHERE creator_id = p_creator_id 
    AND rehire_editor_id = p_editor_id 
    AND status = 'pending_acceptance'
  ) THEN
    RETURN QUERY SELECT FALSE, 'Você já tem uma proposta pendente para este editor';
    RETURN;
  END IF;
  
  -- Verificar se editor ainda é ativo
  IF NOT EXISTS (
    SELECT 1 FROM users 
    WHERE id = p_editor_id 
    AND user_type = 'editor'
  ) THEN
    RETURN QUERY SELECT FALSE, 'Este editor não está mais disponível';
    RETURN;
  END IF;
  
  RETURN QUERY SELECT TRUE, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Buscar editores disponíveis para recontratação
CREATE OR REPLACE FUNCTION get_rehire_editors(p_creator_id UUID)
RETURNS TABLE (
  editor_id UUID,
  editor_name TEXT,
  editor_photo TEXT,
  editor_rating NUMERIC,
  editor_specialties TEXT[],
  projects_together BIGINT,
  last_project_at TIMESTAMP WITH TIME ZONE,
  last_rating_given NUMERIC,
  has_pending_proposal BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cwe.editor_id,
    cwe.editor_name,
    cwe.editor_photo,
    cwe.editor_rating,
    cwe.editor_specialties,
    cwe.projects_together,
    cwe.last_project_at,
    cwe.last_rating_given,
    EXISTS (
      SELECT 1 FROM projects p 
      WHERE p.creator_id = p_creator_id 
      AND p.rehire_editor_id = cwe.editor_id 
      AND p.status = 'pending_acceptance'
    ) as has_pending_proposal
  FROM creator_worked_editors cwe
  WHERE cwe.creator_id = p_creator_id
  ORDER BY cwe.last_project_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar projeto de recontratação
CREATE OR REPLACE FUNCTION create_rehire_project(
  p_creator_id UUID,
  p_editor_id UUID,
  p_title TEXT,
  p_description TEXT,
  p_video_type TEXT,
  p_editing_style TEXT,
  p_duration_category TEXT,
  p_base_price DECIMAL,
  p_platform_fee DECIMAL,
  p_total_price DECIMAL,
  p_deadline_days INTEGER DEFAULT NULL,
  p_reference_files_url TEXT DEFAULT NULL,
  p_context_description TEXT DEFAULT NULL,
  p_rehire_message TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_can_rehire BOOLEAN;
  v_reason TEXT;
  v_project_id UUID;
BEGIN
  -- Verificar se pode recontratar
  SELECT can_rehire, reason INTO v_can_rehire, v_reason
  FROM can_rehire_editor(p_creator_id, p_editor_id);
  
  IF NOT v_can_rehire THEN
    RAISE EXCEPTION '%', v_reason;
  END IF;
  
  -- Criar projeto
  INSERT INTO projects (
    creator_id,
    title,
    description,
    video_type,
    editing_style,
    duration_category,
    base_price,
    platform_fee,
    platform_fee_percentage,
    total_paid_by_creator,
    editor_receives,
    deadline_days,
    reference_files_url,
    context_description,
    status,
    is_rehire,
    rehire_editor_id,
    rehire_message,
    rehire_sent_at
  ) VALUES (
    p_creator_id,
    p_title,
    p_description,
    p_video_type,
    p_editing_style,
    p_duration_category,
    p_base_price,
    p_platform_fee,
    5, -- taxa padrão
    p_total_price,
    p_base_price,
    p_deadline_days,
    p_reference_files_url,
    p_context_description,
    'pending_acceptance',
    TRUE,
    p_editor_id,
    p_rehire_message,
    NOW()
  ) RETURNING id INTO v_project_id;
  
  RETURN v_project_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Editor aceita proposta de recontratação
CREATE OR REPLACE FUNCTION accept_rehire_proposal(
  p_project_id UUID,
  p_editor_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_project RECORD;
BEGIN
  -- Buscar projeto
  SELECT * INTO v_project
  FROM projects
  WHERE id = p_project_id 
    AND rehire_editor_id = p_editor_id
    AND status = 'pending_acceptance';
  
  IF v_project IS NULL THEN
    RAISE EXCEPTION 'Proposta não encontrada ou já respondida';
  END IF;
  
  -- Atualizar projeto
  UPDATE projects
  SET 
    status = 'open', -- vai para open, aguardando pagamento
    assigned_editor_id = p_editor_id,
    rehire_responded_at = NOW(),
    updated_at = NOW()
  WHERE id = p_project_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Editor recusa proposta de recontratação
CREATE OR REPLACE FUNCTION reject_rehire_proposal(
  p_project_id UUID,
  p_editor_id UUID,
  p_reason TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
  UPDATE projects
  SET 
    status = 'draft', -- volta para draft, creator pode abrir para candidaturas
    rehire_editor_id = NULL,
    rehire_responded_at = NOW(),
    rehire_rejection_reason = p_reason,
    is_rehire = FALSE,
    updated_at = NOW()
  WHERE id = p_project_id 
    AND rehire_editor_id = p_editor_id
    AND status = 'pending_acceptance';
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Buscar propostas pendentes do editor
CREATE OR REPLACE FUNCTION get_editor_rehire_proposals(p_editor_id UUID)
RETURNS TABLE (
  project_id UUID,
  project_title TEXT,
  project_description TEXT,
  video_type TEXT,
  editing_style TEXT,
  duration_category TEXT,
  base_price DECIMAL,
  deadline_days INTEGER,
  creator_id UUID,
  creator_name TEXT,
  creator_photo TEXT,
  rehire_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  projects_with_creator BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as project_id,
    p.title as project_title,
    p.description as project_description,
    p.video_type,
    p.editing_style,
    p.duration_category,
    p.base_price,
    p.deadline_days,
    p.creator_id,
    COALESCE(pr.full_name, pr.username, 'Creator') as creator_name,
    pr.profile_photo_url as creator_photo,
    p.rehire_message,
    p.rehire_sent_at as sent_at,
    (
      SELECT COUNT(*) FROM projects p2 
      WHERE p2.creator_id = p.creator_id 
      AND p2.assigned_editor_id = p_editor_id 
      AND p2.status = 'completed'
    ) as projects_with_creator
  FROM projects p
  JOIN users pr ON pr.id = p.creator_id
  WHERE p.rehire_editor_id = p_editor_id
    AND p.status = 'pending_acceptance'
  ORDER BY p.rehire_sent_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Contar propostas pendentes
CREATE OR REPLACE FUNCTION get_pending_proposals_count(p_editor_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM projects
    WHERE rehire_editor_id = p_editor_id
      AND status = 'pending_acceptance'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- 5. TRIGGERS PARA NOTIFICAÇÕES
-- ================================================

-- Notificar editor quando receber proposta
CREATE OR REPLACE FUNCTION notify_rehire_proposal()
RETURNS TRIGGER AS $$
DECLARE
  v_creator_name TEXT;
BEGIN
  -- Só notificar em INSERT de projeto de recontratação
  IF NEW.is_rehire = TRUE AND NEW.status = 'pending_acceptance' THEN
    -- Buscar nome do creator
    SELECT COALESCE(full_name, username, 'Um creator')
    INTO v_creator_name
    FROM users
    WHERE id = NEW.creator_id;
    
    -- Criar notificação
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      priority,
      data,
      action_url
    ) VALUES (
      NEW.rehire_editor_id,
      'new_project',
      '🔄 Proposta de Recontratação!',
      v_creator_name || ' quer trabalhar com você novamente no projeto "' || NEW.title || '"',
      'high',
      jsonb_build_object(
        'project_id', NEW.id,
        'creator_id', NEW.creator_id,
        'is_rehire', true
      ),
      '/editor/proposals'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_rehire_proposal_created
  AFTER INSERT ON projects
  FOR EACH ROW
  WHEN (NEW.is_rehire = TRUE AND NEW.status = 'pending_acceptance')
  EXECUTE FUNCTION notify_rehire_proposal();

-- Notificar creator quando editor responder
CREATE OR REPLACE FUNCTION notify_rehire_response()
RETURNS TRIGGER AS $$
DECLARE
  v_editor_name TEXT;
  v_notification_title TEXT;
  v_notification_message TEXT;
BEGIN
  -- Só notificar se mudou de pending_acceptance
  IF OLD.status = 'pending_acceptance' AND OLD.is_rehire = TRUE THEN
    -- Buscar nome do editor
    SELECT COALESCE(full_name, username, 'O editor')
    INTO v_editor_name
    FROM users
    WHERE id = OLD.rehire_editor_id;
    
    IF NEW.status = 'open' AND NEW.assigned_editor_id IS NOT NULL THEN
      -- Aceitou
      v_notification_title := '🎉 Proposta Aceita!';
      v_notification_message := v_editor_name || ' aceitou trabalhar no projeto "' || NEW.title || '"! Finalize o pagamento para iniciar.';
    ELSIF NEW.status = 'draft' THEN
      -- Recusou
      v_notification_title := 'Proposta Recusada';
      v_notification_message := v_editor_name || ' não pode aceitar o projeto "' || NEW.title || '" no momento. Você pode abrir para candidaturas.';
    ELSE
      RETURN NEW;
    END IF;
    
    -- Criar notificação
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      priority,
      data,
      action_url
    ) VALUES (
      NEW.creator_id,
      CASE WHEN NEW.status = 'open' THEN 'application_accepted' ELSE 'application_rejected' END,
      v_notification_title,
      v_notification_message,
      CASE WHEN NEW.status = 'open' THEN 'high' ELSE 'medium' END,
      jsonb_build_object(
        'project_id', NEW.id,
        'editor_id', OLD.rehire_editor_id,
        'accepted', NEW.status = 'open'
      ),
      '/creator/project/' || NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_rehire_response
  AFTER UPDATE ON projects
  FOR EACH ROW
  WHEN (OLD.status = 'pending_acceptance')
  EXECUTE FUNCTION notify_rehire_response();

-- ================================================
-- 6. POLICIES RLS
-- ================================================

-- Editors podem ver projetos onde são o rehire_editor_id
CREATE POLICY "Editors can view rehire proposals"
  ON projects FOR SELECT
  TO authenticated
  USING (
    rehire_editor_id = auth.uid() 
    AND status = 'pending_acceptance'
  );

-- ================================================
-- 7. GRANTS
-- ================================================

GRANT EXECUTE ON FUNCTION can_rehire_editor TO authenticated;
GRANT EXECUTE ON FUNCTION get_rehire_editors TO authenticated;
GRANT EXECUTE ON FUNCTION create_rehire_project TO authenticated;
GRANT EXECUTE ON FUNCTION accept_rehire_proposal TO authenticated;
GRANT EXECUTE ON FUNCTION reject_rehire_proposal TO authenticated;
GRANT EXECUTE ON FUNCTION get_editor_rehire_proposals TO authenticated;
GRANT EXECUTE ON FUNCTION get_pending_proposals_count TO authenticated;
GRANT SELECT ON creator_worked_editors TO authenticated;
