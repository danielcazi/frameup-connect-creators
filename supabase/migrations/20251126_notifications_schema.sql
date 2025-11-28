-- ============================================
-- FRAMEUP - SCHEMA DO SISTEMA DE NOTIFICAÇÕES
-- Data: 26/11/2025
-- Fase: 20.1
-- ============================================

-- ============================================
-- 1. CRIAR ENUMS
-- ============================================

-- Tipos de notificação suportados pelo sistema
CREATE TYPE notification_type AS ENUM (
  'new_project',          -- Novo projeto disponível no marketplace
  'new_application',      -- Nova candidatura no seu projeto
  'application_accepted', -- Sua candidatura foi aceita
  'application_rejected', -- Sua candidatura foi rejeitada
  'new_message',          -- Nova mensagem no chat
  'video_delivered',      -- Editor entregou o vídeo
  'video_approved',       -- Vídeo foi aprovado
  'revision_requested',   -- Revisão solicitada
  'new_review',           -- Nova avaliação recebida
  'subscription_warning', -- Assinatura próxima do vencimento
  'subscription_expired', -- Assinatura expirou
  'editor_approved',      -- Cadastro de editor aprovado
  'editor_rejected',      -- Cadastro de editor rejeitado
  'system'                -- Notificação do sistema
);

-- Níveis de prioridade para ordenação e destaque visual
CREATE TYPE notification_priority AS ENUM (
  'low',
  'medium',
  'high',
  'urgent'
);

-- ============================================
-- 2. CRIAR TABELA DE NOTIFICAÇÕES
-- ============================================

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  priority notification_priority DEFAULT 'medium',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB, -- Dados estruturados extras (ex: { "project_id": "..." })
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,
  action_url TEXT, -- Link para redirecionamento ao clicar
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE -- Opcional: data para auto-remoção
);

-- Índices para performance de queries comuns
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX idx_notifications_type ON notifications(type);

COMMENT ON TABLE notifications IS 'Armazena todas as notificações do sistema para os usuários';

-- ============================================
-- 3. CRIAR TABELA DE PREFERÊNCIAS
-- ============================================

CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Preferências de Email
  email_new_project BOOLEAN DEFAULT TRUE,
  email_new_application BOOLEAN DEFAULT TRUE,
  email_application_status BOOLEAN DEFAULT TRUE,
  email_new_message BOOLEAN DEFAULT FALSE, -- Chat é muito frequente, default off
  email_video_delivered BOOLEAN DEFAULT TRUE,
  email_video_status BOOLEAN DEFAULT TRUE,
  email_new_review BOOLEAN DEFAULT TRUE,
  email_subscription BOOLEAN DEFAULT TRUE,
  
  -- Preferências Gerais
  push_enabled BOOLEAN DEFAULT FALSE, -- Preparado para futuro PWA/Mobile
  in_app_enabled BOOLEAN DEFAULT TRUE, -- Dropdown no site
  
  -- Controle de Horário (Não Perturbe)
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE notification_preferences IS 'Configurações de notificação por usuário';

-- ============================================
-- 4. FUNÇÕES DO SISTEMA
-- ============================================

-- Função para criar notificação respeitando preferências
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_type notification_type,
  p_title TEXT,
  p_message TEXT,
  p_data JSONB DEFAULT NULL,
  p_priority notification_priority DEFAULT 'medium',
  p_action_url TEXT DEFAULT NULL,
  p_expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
  v_prefs notification_preferences%ROWTYPE;
BEGIN
  -- Verificar preferências do usuário
  SELECT * INTO v_prefs FROM notification_preferences WHERE user_id = p_user_id;
  
  -- Se não existir preferência, assume defaults (mas idealmente o trigger cria)
  -- Se in_app desativado explicitamente, não criar
  IF v_prefs.in_app_enabled = false THEN
    RETURN NULL;
  END IF;
  
  -- Criar notificação
  INSERT INTO notifications (user_id, type, title, message, data, priority, action_url, expires_at)
  VALUES (p_user_id, p_type, p_title, p_message, p_data, p_priority, p_action_url, p_expires_at)
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para marcar uma notificação como lida
CREATE OR REPLACE FUNCTION mark_notification_read(p_notification_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE notifications 
  SET is_read = true, read_at = NOW()
  WHERE id = p_notification_id AND user_id = auth.uid();
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para marcar TODAS como lidas
CREATE OR REPLACE FUNCTION mark_all_notifications_read()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE notifications 
  SET is_read = true, read_at = NOW()
  WHERE user_id = auth.uid() AND is_read = false;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função eficiente para contar não lidas
CREATE OR REPLACE FUNCTION get_unread_notifications_count()
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER 
    FROM notifications 
    WHERE user_id = auth.uid() 
      AND is_read = false
      AND (expires_at IS NULL OR expires_at > NOW())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função de manutenção para limpar notificações antigas
CREATE OR REPLACE FUNCTION delete_old_notifications()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Deletar notificações lidas há mais de 30 dias
  DELETE FROM notifications 
  WHERE is_read = true 
    AND read_at < NOW() - INTERVAL '30 days';
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  
  -- Deletar notificações expiradas
  DELETE FROM notifications 
  WHERE expires_at IS NOT NULL AND expires_at < NOW();
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. RLS POLICIES (SEGURANÇA)
-- ============================================

-- Habilitar RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Notifications: usuários só veem suas próprias
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- System/Service Role pode inserir para qualquer usuário
CREATE POLICY "Service can insert notifications"
  ON notifications FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Preferences: usuários gerenciam suas próprias
CREATE POLICY "Users can manage own preferences"
  ON notification_preferences FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================
-- 6. TRIGGERS
-- ============================================

-- Função trigger para criar preferências padrão
CREATE OR REPLACE FUNCTION create_default_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger executado após criação de novo usuário
DROP TRIGGER IF EXISTS on_user_created_notification_prefs ON auth.users;
CREATE TRIGGER on_user_created_notification_prefs
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_default_notification_preferences();

-- ============================================
-- FIM DO SCRIPT
-- ============================================
