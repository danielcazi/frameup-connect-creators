-- ================================================
-- TRIGGERS PARA NOTIFICAÇÕES AUTOMÁTICAS
-- FrameUp - Sistema de Notificações
-- ================================================

-- ================================================
-- 1. NOVA CANDIDATURA (notifica creator)
-- ================================================
CREATE OR REPLACE FUNCTION notify_new_application()
RETURNS TRIGGER AS $$
DECLARE
  v_project RECORD;
  v_editor RECORD;
BEGIN
  -- Buscar dados do projeto
  SELECT id, title, creator_id INTO v_project
  FROM projects WHERE id = NEW.project_id;
  
  -- Buscar dados do editor
  SELECT full_name INTO v_editor
  FROM users WHERE id = NEW.editor_id;
  
  -- Criar notificação para o creator
  PERFORM create_notification(
    v_project.creator_id,
    'new_application'::notification_type,
    'Nova candidatura recebida',
    format('%s se candidatou ao projeto "%s"', v_editor.full_name, v_project.title),
    jsonb_build_object(
      'project_id', v_project.id,
      'project_title', v_project.title,
      'editor_id', NEW.editor_id,
      'editor_name', v_editor.full_name,
      'application_id', NEW.id
    ),
    'medium'::notification_priority,
    format('/creator/project/%s/applications', v_project.id)
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_new_application ON project_applications;
CREATE TRIGGER on_new_application
  AFTER INSERT ON project_applications
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_application();

-- ================================================
-- 2. CANDIDATURA ACEITA/REJEITADA (notifica editor)
-- ================================================
CREATE OR REPLACE FUNCTION notify_application_status()
RETURNS TRIGGER AS $$
DECLARE
  v_project RECORD;
  v_notification_type notification_type;
  v_title TEXT;
  v_message TEXT;
BEGIN
  -- Só notificar se status mudou
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;
  
  -- Buscar dados do projeto
  SELECT id, title, creator_id INTO v_project
  FROM projects WHERE id = NEW.project_id;
  
  -- Definir tipo e mensagem
  IF NEW.status = 'accepted' THEN
    v_notification_type := 'application_accepted';
    v_title := 'Candidatura aceita! 🎉';
    v_message := format('Sua candidatura para "%s" foi aceita. Bom trabalho!', v_project.title);
  ELSIF NEW.status = 'rejected' THEN
    v_notification_type := 'application_rejected';
    v_title := 'Candidatura não selecionada';
    v_message := format('Sua candidatura para "%s" não foi selecionada desta vez.', v_project.title);
  ELSE
    RETURN NEW;
  END IF;
  
  -- Criar notificação para o editor
  PERFORM create_notification(
    NEW.editor_id,
    v_notification_type,
    v_title,
    v_message,
    jsonb_build_object(
      'project_id', v_project.id,
      'project_title', v_project.title,
      'application_id', NEW.id
    ),
    CASE WHEN NEW.status = 'accepted' THEN 'high' ELSE 'medium' END::notification_priority,
    CASE WHEN NEW.status = 'accepted' 
      THEN format('/editor/project/%s', v_project.id)
      ELSE '/editor/dashboard'
    END
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_application_status_change ON project_applications;
CREATE TRIGGER on_application_status_change
  AFTER UPDATE ON project_applications
  FOR EACH ROW
  EXECUTE FUNCTION notify_application_status();

-- ================================================
-- 3. VÍDEO ENTREGUE (notifica creator)
-- ================================================
CREATE OR REPLACE FUNCTION notify_video_delivered()
RETURNS TRIGGER AS $$
DECLARE
  v_project RECORD;
  v_editor RECORD;
BEGIN
  -- Buscar dados do projeto
  SELECT p.id, p.title, p.creator_id, p.assigned_editor_id, u.full_name as editor_name
  INTO v_project
  FROM projects p
  JOIN users u ON u.id = p.assigned_editor_id
  WHERE p.id = NEW.project_id;
  
  -- Criar notificação para o creator
  PERFORM create_notification(
    v_project.creator_id,
    'video_delivered'::notification_type,
    'Vídeo entregue! 🎬',
    format('%s entregou o vídeo do projeto "%s". Confira e aprove!', v_project.editor_name, v_project.title),
    jsonb_build_object(
      'project_id', v_project.id,
      'project_title', v_project.title,
      'delivery_id', NEW.id
    ),
    'high'::notification_priority,
    format('/creator/project/%s/review', v_project.id)
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_video_delivered ON project_deliveries;
CREATE TRIGGER on_video_delivered
  AFTER INSERT ON project_deliveries
  FOR EACH ROW
  EXECUTE FUNCTION notify_video_delivered();

-- ================================================
-- 4. VÍDEO APROVADO / REVISÃO SOLICITADA (notifica editor)
-- ================================================
CREATE OR REPLACE FUNCTION notify_delivery_status()
RETURNS TRIGGER AS $$
DECLARE
  v_project RECORD;
  v_notification_type notification_type;
  v_title TEXT;
  v_message TEXT;
  v_priority notification_priority;
BEGIN
  -- Só notificar se status mudou
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;
  
  -- Buscar dados do projeto
  SELECT p.id, p.title, p.assigned_editor_id, u.full_name as creator_name
  INTO v_project
  FROM projects p
  JOIN users u ON u.id = p.creator_id
  WHERE p.id = NEW.project_id;
  
  -- Definir tipo e mensagem
  IF NEW.status = 'approved' THEN
    v_notification_type := 'video_approved';
    v_title := 'Vídeo aprovado! 🎉';
    v_message := format('Seu vídeo para "%s" foi aprovado por %s!', v_project.title, v_project.creator_name);
    v_priority := 'high';
  ELSIF NEW.status = 'revision_requested' THEN
    v_notification_type := 'revision_requested';
    v_title := 'Revisão solicitada';
    v_message := format('%s solicitou revisão no projeto "%s". Verifique o feedback.', v_project.creator_name, v_project.title);
    v_priority := 'high';
  ELSE
    RETURN NEW;
  END IF;
  
  -- Criar notificação para o editor
  PERFORM create_notification(
    v_project.assigned_editor_id,
    v_notification_type,
    v_title,
    v_message,
    jsonb_build_object(
      'project_id', v_project.id,
      'project_title', v_project.title,
      'delivery_id', NEW.id
    ),
    v_priority,
    format('/editor/project/%s', v_project.id)
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_delivery_status_change ON project_deliveries;
CREATE TRIGGER on_delivery_status_change
  AFTER UPDATE ON project_deliveries
  FOR EACH ROW
  EXECUTE FUNCTION notify_delivery_status();

-- ================================================
-- 5. NOVA AVALIAÇÃO (notifica avaliado)
-- ================================================
CREATE OR REPLACE FUNCTION notify_new_review()
RETURNS TRIGGER AS $$
DECLARE
  v_project RECORD;
  v_reviewer RECORD;
BEGIN
  -- Buscar dados do projeto
  SELECT id, title INTO v_project
  FROM projects WHERE id = NEW.project_id;
  
  -- Buscar dados do reviewer
  SELECT full_name INTO v_reviewer
  FROM users WHERE id = NEW.reviewer_id;
  
  -- Criar notificação para o avaliado
  PERFORM create_notification(
    NEW.reviewed_id,
    'new_review'::notification_type,
    'Nova avaliação recebida ⭐',
    format('%s avaliou você no projeto "%s" com %s estrelas!', v_reviewer.full_name, v_project.title, NEW.rating),
    jsonb_build_object(
      'project_id', v_project.id,
      'project_title', v_project.title,
      'review_id', NEW.id,
      'rating', NEW.rating,
      'reviewer_name', v_reviewer.full_name
    ),
    'medium'::notification_priority,
    NULL -- Ou link para página de avaliações
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_new_review ON reviews;
CREATE TRIGGER on_new_review
  AFTER INSERT ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_review();

-- ================================================
-- 6. NOVA MENSAGEM (notifica receptor)
-- ================================================
CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS TRIGGER AS $$
DECLARE
  v_sender RECORD;
  v_project RECORD;
BEGIN
  -- Buscar dados do sender
  SELECT full_name INTO v_sender
  FROM users WHERE id = NEW.sender_id;
  
  -- Buscar dados do projeto
  SELECT id, title INTO v_project
  FROM projects WHERE id = NEW.project_id;
  
  -- Criar notificação para o receptor
  PERFORM create_notification(
    NEW.receiver_id,
    'new_message'::notification_type,
    format('Nova mensagem de %s', v_sender.full_name),
    LEFT(NEW.message_text, 100) || CASE WHEN LENGTH(NEW.message_text) > 100 THEN '...' ELSE '' END,
    jsonb_build_object(
      'project_id', v_project.id,
      'project_title', v_project.title,
      'sender_id', NEW.sender_id,
      'sender_name', v_sender.full_name
    ),
    'low'::notification_priority, -- Mensagens são low priority
    format('/project/%s/chat', v_project.id), -- Ajustar URL conforme userType
    NOW() + INTERVAL '24 hours' -- Expira em 24h (mensagens são efêmeras)
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- NOTA: Descomentear se quiser notificações de mensagem
-- DROP TRIGGER IF EXISTS on_new_message ON messages;
-- CREATE TRIGGER on_new_message
--   AFTER INSERT ON messages
--   FOR EACH ROW
--   EXECUTE FUNCTION notify_new_message();

-- ================================================
-- 7. EDITOR APROVADO/REJEITADO (notifica editor)
-- ================================================
CREATE OR REPLACE FUNCTION notify_editor_approval_status()
RETURNS TRIGGER AS $$
DECLARE
  v_notification_type notification_type;
  v_title TEXT;
  v_message TEXT;
  v_action_url TEXT;
BEGIN
  -- Só notificar se status mudou
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;
  
  IF NEW.status = 'approved' THEN
    v_notification_type := 'editor_approved';
    v_title := 'Bem-vindo ao FrameUp! 🎊';
    v_message := 'Seu cadastro foi aprovado! Agora você pode se candidatar a projetos.';
    v_action_url := '/editor/subscription/plans';
  ELSIF NEW.status = 'rejected' THEN
    v_notification_type := 'editor_rejected';
    v_title := 'Cadastro não aprovado';
    v_message := COALESCE(NEW.rejection_reason, 'Seu cadastro não foi aprovado. Entre em contato para mais informações.');
    v_action_url := NULL;
  ELSE
    RETURN NEW;
  END IF;
  
  PERFORM create_notification(
    NEW.editor_id,
    v_notification_type,
    v_title,
    v_message,
    jsonb_build_object('approval_id', NEW.id),
    'high'::notification_priority,
    v_action_url
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_editor_approval_status ON editor_approval_queue;
CREATE TRIGGER on_editor_approval_status
  AFTER UPDATE ON editor_approval_queue
  FOR EACH ROW
  EXECUTE FUNCTION notify_editor_approval_status();

-- ================================================
-- COMENTÁRIOS
-- ================================================
COMMENT ON FUNCTION notify_new_application() IS 'Notifica creator quando recebe nova candidatura';
COMMENT ON FUNCTION notify_application_status() IS 'Notifica editor quando candidatura é aceita/rejeitada';
COMMENT ON FUNCTION notify_video_delivered() IS 'Notifica creator quando editor entrega vídeo';
COMMENT ON FUNCTION notify_delivery_status() IS 'Notifica editor quando vídeo é aprovado ou revisão solicitada';
COMMENT ON FUNCTION notify_new_review() IS 'Notifica usuário quando recebe avaliação';
COMMENT ON FUNCTION notify_new_message() IS 'Notifica usuário quando recebe mensagem (desativado por padrão)';
COMMENT ON FUNCTION notify_editor_approval_status() IS 'Notifica editor sobre status do cadastro';
