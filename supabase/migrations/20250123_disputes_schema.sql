-- =====================================================
-- FASE 14: SISTEMA DE DISPUTAS
-- =====================================================
-- Criação do schema completo para gestão de disputas,
-- mediação de conflitos e resolução de problemas
-- =====================================================

-- TABELA PRINCIPAL DE DISPUTAS
CREATE TABLE IF NOT EXISTS disputes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) NOT NULL,
  
  -- Partes envolvidas
  opened_by UUID REFERENCES auth.users(id) NOT NULL,
  disputed_user_id UUID REFERENCES auth.users(id) NOT NULL,
  
  -- Categorização
  category TEXT CHECK (category IN (
    'delivery_delay',
    'quality_issue',
    'payment_issue',
    'communication_issue',
    'scope_change',
    'inappropriate_behavior',
    'other'
  )) NOT NULL,
  
  priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
  
  -- Conteúdo
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 10 AND 200),
  description TEXT NOT NULL CHECK (char_length(description) >= 50),
  evidence_urls TEXT[] DEFAULT '{}',
  
  -- Status e resolução
  status TEXT CHECK (status IN (
    'open',
    'investigating',
    'waiting_response',
    'resolved',
    'closed'
  )) DEFAULT 'open',
  
  resolution TEXT,
  resolution_type TEXT CHECK (resolution_type IN (
    'refund_full',
    'refund_partial',
    'payment_released',
    'warning_issued',
    'user_banned',
    'no_action',
    'other'
  )),
  
  -- Workflow
  assigned_to UUID REFERENCES admin_users(id),
  assigned_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES admin_users(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_disputes_status ON disputes(status);
CREATE INDEX idx_disputes_assigned ON disputes(assigned_to) WHERE status IN ('open', 'investigating');
CREATE INDEX idx_disputes_project ON disputes(project_id);
CREATE INDEX idx_disputes_priority ON disputes(priority, status);
CREATE INDEX idx_disputes_opened_by ON disputes(opened_by);

COMMENT ON TABLE disputes IS 'Sistema de reclamações e mediação de conflitos';

-- =====================================================
-- TABELA DE MENSAGENS DA DISPUTA
-- =====================================================

CREATE TABLE IF NOT EXISTS dispute_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dispute_id UUID REFERENCES disputes(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES auth.users(id) NOT NULL,
  message TEXT NOT NULL CHECK (char_length(message) <= 2000),
  is_internal BOOLEAN DEFAULT FALSE,
  attachments TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_dispute_messages_dispute ON dispute_messages(dispute_id, created_at);
CREATE INDEX idx_dispute_messages_sender ON dispute_messages(sender_id);

COMMENT ON TABLE dispute_messages IS 'Chat da disputa entre admin e partes';

-- =====================================================
-- ALTERAR TABELA PROJECTS
-- =====================================================

-- Adicionar flag de disputa
ALTER TABLE projects ADD COLUMN IF NOT EXISTS has_dispute BOOLEAN DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_projects_with_disputes ON projects(has_dispute) WHERE has_dispute = TRUE;

-- =====================================================
-- TRIGGER PARA MARCAR PROJETO COM DISPUTA
-- =====================================================

CREATE OR REPLACE FUNCTION mark_project_with_dispute()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE projects
  SET has_dispute = TRUE
  WHERE id = NEW.project_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_mark_project_dispute
AFTER INSERT ON disputes
FOR EACH ROW
EXECUTE FUNCTION mark_project_with_dispute();

-- =====================================================
-- TRIGGER PARA UPDATED_AT
-- =====================================================

CREATE TRIGGER update_disputes_updated_at
BEFORE UPDATE ON disputes
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- FUNÇÃO PARA RESOLVER DISPUTA
-- =====================================================

CREATE OR REPLACE FUNCTION resolve_dispute(
  p_dispute_id UUID,
  p_admin_id UUID,
  p_resolution TEXT,
  p_resolution_type TEXT,
  p_refund_amount DECIMAL DEFAULT NULL,
  p_transfer_amount DECIMAL DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_project_id UUID;
  v_opened_by UUID;
  v_disputed_user_id UUID;
BEGIN
  -- Buscar informações da disputa
  SELECT project_id, opened_by, disputed_user_id
  INTO v_project_id, v_opened_by, v_disputed_user_id
  FROM disputes
  WHERE id = p_dispute_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Disputa não encontrada';
  END IF;
  
  -- Atualizar disputa
  UPDATE disputes
  SET 
    status = 'resolved',
    resolution = p_resolution,
    resolution_type = p_resolution_type,
    resolved_by = p_admin_id,
    resolved_at = NOW(),
    updated_at = NOW()
  WHERE id = p_dispute_id;
  
  -- Processar ações financeiras se aplicável
  IF p_resolution_type = 'refund_full' OR p_resolution_type = 'refund_partial' THEN
    -- Atualizar status de pagamento do projeto
    UPDATE projects
    SET 
      payment_status = 'refunded',
      updated_at = NOW()
    WHERE id = v_project_id;
    
    -- TODO: Integração com Stripe para processar reembolso
    -- Valor do reembolso: p_refund_amount
  END IF;
  
  IF p_resolution_type = 'payment_released' THEN
    UPDATE projects
    SET 
      payment_status = 'released',
      updated_at = NOW()
    WHERE id = v_project_id;
    
    -- TODO: Integração com Stripe para transferir ao editor
    -- Valor da transferência: p_transfer_amount
  END IF;
  
  IF p_resolution_type = 'user_banned' THEN
    -- Banir usuário disputado
    UPDATE user_metadata_extension
    SET 
      is_banned = TRUE,
      ban_reason = 'Banido após resolução de disputa: ' || p_resolution,
      banned_by = p_admin_id,
      banned_at = NOW(),
      updated_at = NOW()
    WHERE user_id = v_disputed_user_id;
  END IF;
  
  IF p_resolution_type = 'warning_issued' THEN
    -- Incrementar warnings
    UPDATE user_metadata_extension
    SET 
      total_warnings = total_warnings + 1,
      updated_at = NOW()
    WHERE user_id = v_disputed_user_id;
  END IF;
  
  -- Log da ação
  INSERT INTO admin_action_logs (
    admin_id,
    action_type,
    target_type,
    target_id,
    reason,
    action_details
  )
  VALUES (
    p_admin_id,
    'resolve_dispute',
    'dispute',
    p_dispute_id,
    p_resolution,
    jsonb_build_object(
      'resolution_type', p_resolution_type,
      'project_id', v_project_id,
      'refund_amount', p_refund_amount,
      'transfer_amount', p_transfer_amount
    )
  );
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNÇÃO PARA FECHAR DISPUTA SEM RESOLUÇÃO
-- =====================================================

CREATE OR REPLACE FUNCTION close_dispute(
  p_dispute_id UUID,
  p_admin_id UUID,
  p_reason TEXT
)
RETURNS VOID AS $$
BEGIN
  UPDATE disputes
  SET 
    status = 'closed',
    resolution = p_reason,
    resolution_type = 'no_action',
    resolved_by = p_admin_id,
    resolved_at = NOW(),
    updated_at = NOW()
  WHERE id = p_dispute_id;
  
  -- Log da ação
  INSERT INTO admin_action_logs (
    admin_id,
    action_type,
    target_type,
    target_id,
    reason
  )
  VALUES (
    p_admin_id,
    'close_dispute',
    'dispute',
    p_dispute_id,
    p_reason
  );
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNÇÃO PARA ATRIBUIR DISPUTA A ADMIN
-- =====================================================

CREATE OR REPLACE FUNCTION assign_dispute(
  p_dispute_id UUID,
  p_admin_id UUID
)
RETURNS VOID AS $$
BEGIN
  UPDATE disputes
  SET 
    assigned_to = p_admin_id,
    assigned_at = NOW(),
    status = 'investigating',
    updated_at = NOW()
  WHERE id = p_dispute_id;
  
  -- Log da ação
  INSERT INTO admin_action_logs (
    admin_id,
    action_type,
    target_type,
    target_id
  )
  VALUES (
    p_admin_id,
    'assign_dispute',
    'dispute',
    p_dispute_id
  );
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNÇÃO PARA ADICIONAR MENSAGEM À DISPUTA
-- =====================================================

CREATE OR REPLACE FUNCTION add_dispute_message(
  p_dispute_id UUID,
  p_sender_id UUID,
  p_message TEXT,
  p_is_internal BOOLEAN DEFAULT FALSE,
  p_attachments TEXT[] DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  v_message_id UUID;
BEGIN
  -- Inserir mensagem
  INSERT INTO dispute_messages (
    dispute_id,
    sender_id,
    message,
    is_internal,
    attachments
  )
  VALUES (
    p_dispute_id,
    p_sender_id,
    p_message,
    p_is_internal,
    p_attachments
  )
  RETURNING id INTO v_message_id;
  
  -- Atualizar timestamp da disputa
  UPDATE disputes
  SET updated_at = NOW()
  WHERE id = p_dispute_id;
  
  RETURN v_message_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- VIEW PARA DISPUTAS COM INFORMAÇÕES COMPLETAS
-- =====================================================

CREATE OR REPLACE VIEW disputes_with_details AS
SELECT 
  d.*,
  
  -- Informações do projeto
  p.title AS project_title,
  p.status AS project_status,
  p.payment_status,
  p.total_price,
  
  -- Quem abriu a disputa
  u_opener.email AS opener_email,
  u_opener.full_name AS opener_name,
  
  -- Usuário disputado
  u_disputed.email AS disputed_email,
  u_disputed.full_name AS disputed_name,
  
  -- Admin atribuído
  a_assigned.role AS assigned_admin_role,
  
  -- Admin que resolveu
  a_resolved.role AS resolved_admin_role,
  
  -- Contagem de mensagens
  (SELECT COUNT(*) FROM dispute_messages WHERE dispute_id = d.id) AS message_count,
  (SELECT COUNT(*) FROM dispute_messages WHERE dispute_id = d.id AND is_internal = FALSE) AS public_message_count
  
FROM disputes d
LEFT JOIN projects p ON d.project_id = p.id
LEFT JOIN users u_opener ON d.opened_by = u_opener.user_id
LEFT JOIN users u_disputed ON d.disputed_user_id = u_disputed.user_id
LEFT JOIN admin_users a_assigned ON d.assigned_to = a_assigned.id
LEFT JOIN admin_users a_resolved ON d.resolved_by = a_resolved.id;

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Habilitar RLS
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispute_messages ENABLE ROW LEVEL SECURITY;

-- Políticas para disputes
CREATE POLICY "Usuários podem ver suas próprias disputas"
ON disputes FOR SELECT
USING (
  auth.uid() = opened_by OR 
  auth.uid() = disputed_user_id
);

CREATE POLICY "Usuários podem criar disputas"
ON disputes FOR INSERT
WITH CHECK (auth.uid() = opened_by);

CREATE POLICY "Admins podem ver todas as disputas"
ON disputes FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE user_id = auth.uid()
    AND is_active = TRUE
  )
);

CREATE POLICY "Admins podem atualizar disputas"
ON disputes FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE user_id = auth.uid()
    AND is_active = TRUE
  )
);

-- Políticas para dispute_messages
CREATE POLICY "Usuários podem ver mensagens de suas disputas"
ON dispute_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM disputes
    WHERE id = dispute_id
    AND (opened_by = auth.uid() OR disputed_user_id = auth.uid())
  )
  AND is_internal = FALSE
);

CREATE POLICY "Usuários podem enviar mensagens em suas disputas"
ON dispute_messages FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM disputes
    WHERE id = dispute_id
    AND (opened_by = auth.uid() OR disputed_user_id = auth.uid())
  )
  AND sender_id = auth.uid()
  AND is_internal = FALSE
);

CREATE POLICY "Admins podem ver todas as mensagens"
ON dispute_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE user_id = auth.uid()
    AND is_active = TRUE
  )
);

CREATE POLICY "Admins podem enviar mensagens"
ON dispute_messages FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE user_id = auth.uid()
    AND is_active = TRUE
  )
  AND sender_id = auth.uid()
);

-- =====================================================
-- COMENTÁRIOS E DOCUMENTAÇÃO
-- =====================================================

COMMENT ON COLUMN disputes.category IS 'Categoria da disputa: atraso, qualidade, pagamento, etc';
COMMENT ON COLUMN disputes.priority IS 'Prioridade: low, medium, high, urgent';
COMMENT ON COLUMN disputes.status IS 'Status: open, investigating, waiting_response, resolved, closed';
COMMENT ON COLUMN disputes.resolution_type IS 'Tipo de resolução: refund, payment_released, warning, ban, etc';
COMMENT ON COLUMN dispute_messages.is_internal IS 'Mensagens internas são visíveis apenas para admins';

COMMENT ON FUNCTION resolve_dispute IS 'Resolve uma disputa com ações automáticas baseadas no tipo de resolução';
COMMENT ON FUNCTION close_dispute IS 'Fecha uma disputa sem ação específica';
COMMENT ON FUNCTION assign_dispute IS 'Atribui uma disputa a um admin específico';
COMMENT ON FUNCTION add_dispute_message IS 'Adiciona uma mensagem ao chat da disputa';
