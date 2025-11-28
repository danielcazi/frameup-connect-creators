-- ================================================
-- FUNCTIONS PARA MENSAGENS
-- FrameUp - Sistema de Chat
-- ================================================

-- Função para contar mensagens não lidas
CREATE OR REPLACE FUNCTION get_unread_messages_count(p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM messages
    WHERE receiver_id = p_user_id
      AND is_read = false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para buscar conversas com mensagens não lidas
CREATE OR REPLACE FUNCTION get_unread_conversations(p_user_id UUID)
RETURNS TABLE (
  project_id UUID,
  project_title TEXT,
  other_user_id UUID,
  other_user_name TEXT,
  other_user_avatar TEXT,
  unread_count BIGINT,
  last_message TEXT,
  last_message_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  WITH unread_msgs AS (
    SELECT 
      m.project_id,
      m.sender_id,
      m.message_text,
      m.created_at,
      ROW_NUMBER() OVER (PARTITION BY m.project_id ORDER BY m.created_at DESC) as rn
    FROM messages m
    WHERE m.receiver_id = p_user_id
      AND m.is_read = false
  ),
  conversation_stats AS (
    SELECT 
      um.project_id,
      um.sender_id,
      um.message_text as last_msg,
      um.created_at as last_at,
      COUNT(*) OVER (PARTITION BY um.project_id) as msg_count
    FROM unread_msgs um
    WHERE um.rn = 1
  )
  SELECT 
    cs.project_id,
    p.title as project_title,
    cs.sender_id as other_user_id,
    u.full_name as other_user_name,
    u.profile_photo_url as other_user_avatar,
    cs.msg_count as unread_count,
    cs.last_msg as last_message,
    cs.last_at as last_message_at
  FROM conversation_stats cs
  JOIN projects p ON p.id = cs.project_id
  JOIN users u ON u.id = cs.sender_id
  ORDER BY cs.last_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para marcar todas mensagens de um projeto como lidas
CREATE OR REPLACE FUNCTION mark_project_messages_read(
  p_user_id UUID,
  p_project_id UUID
) RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE messages
  SET is_read = true, read_at = NOW()
  WHERE receiver_id = p_user_id
    AND project_id = p_project_id
    AND is_read = false;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentários
COMMENT ON FUNCTION get_unread_messages_count IS 'Retorna quantidade de mensagens não lidas do usuário';
COMMENT ON FUNCTION get_unread_conversations IS 'Retorna conversas com mensagens não lidas agrupadas por projeto';
COMMENT ON FUNCTION mark_project_messages_read IS 'Marca todas mensagens de um projeto como lidas';
