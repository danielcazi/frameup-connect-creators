-- Fix the notification trigger to match the actual notifications table structure
-- The table has columns: id, user_id, type(text), title, message, reference_id(uuid), is_read, created_at
-- It does NOT have: priority, data, action_url

CREATE OR REPLACE FUNCTION notify_editor_favorited()
RETURNS TRIGGER AS $$
DECLARE
  v_creator_name TEXT;
BEGIN
  -- Buscar nome do creator
  SELECT COALESCE(full_name, 'Um creator')
  INTO v_creator_name
  FROM users
  WHERE id = NEW.creator_id;
  
  -- Criar notificação (se a tabela existir)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      reference_id,
      is_read
    ) VALUES (
      NEW.editor_id,
      'new_favorite',
      'Novo favorito!',
      v_creator_name || ' adicionou você aos favoritos',
      NEW.creator_id, -- Usamos reference_id para guardar o ID do creator
      FALSE
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
