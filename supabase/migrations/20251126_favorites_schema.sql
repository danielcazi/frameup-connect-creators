-- ================================================
-- SISTEMA DE FAVORITOS
-- FrameUp - Fase 24
-- ================================================

-- ================================================
-- 1. CRIAR TABELA DE FAVORITOS
-- ================================================

CREATE TABLE IF NOT EXISTS creator_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relacionamentos
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  editor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Dados adicionais
  note TEXT, -- Nota pessoal do creator sobre o editor
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraint: um creator só pode favoritar um editor uma vez
  CONSTRAINT unique_favorite UNIQUE (creator_id, editor_id),
  
  -- Constraint: creator não pode favoritar a si mesmo
  CONSTRAINT no_self_favorite CHECK (creator_id != editor_id)
);

-- Índices para performance
CREATE INDEX idx_favorites_creator ON creator_favorites(creator_id);
CREATE INDEX idx_favorites_editor ON creator_favorites(editor_id);
CREATE INDEX idx_favorites_created ON creator_favorites(created_at DESC);

COMMENT ON TABLE creator_favorites IS 'Editores favoritos salvos por creators';
COMMENT ON COLUMN creator_favorites.note IS 'Nota pessoal do creator sobre o editor (ex: "Ótimo para vídeos de gaming")';

-- ================================================
-- 2. CRIAR VIEW PARA CONTAGEM DE FAVORITOS
-- ================================================

CREATE OR REPLACE VIEW v_editor_favorite_counts AS
SELECT 
  editor_id,
  COUNT(*) as favorite_count,
  MAX(created_at) as last_favorited_at
FROM creator_favorites
GROUP BY editor_id;

COMMENT ON VIEW v_editor_favorite_counts IS 'Contagem de vezes que cada editor foi favoritado';

-- ================================================
-- 3. FUNÇÕES AUXILIARES
-- ================================================

-- Função para adicionar favorito
CREATE OR REPLACE FUNCTION add_favorite(
  p_creator_id UUID,
  p_editor_id UUID,
  p_note TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_favorite_id UUID;
  v_editor_type TEXT;
BEGIN
  -- Verificar se o editor existe e é realmente um editor
  SELECT user_type::text INTO v_editor_type
  FROM users -- Usando tabela users ao invés de profiles para garantir user_type
  WHERE id = p_editor_id;
  
  IF v_editor_type IS NULL THEN
    RAISE EXCEPTION 'Editor não encontrado';
  END IF;
  
  IF v_editor_type != 'editor' THEN
    RAISE EXCEPTION 'Usuário não é um editor';
  END IF;
  
  -- Inserir favorito
  INSERT INTO creator_favorites (creator_id, editor_id, note)
  VALUES (p_creator_id, p_editor_id, p_note)
  ON CONFLICT (creator_id, editor_id) 
  DO UPDATE SET 
    note = COALESCE(EXCLUDED.note, creator_favorites.note),
    updated_at = NOW()
  RETURNING id INTO v_favorite_id;
  
  RETURN v_favorite_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para remover favorito
CREATE OR REPLACE FUNCTION remove_favorite(
  p_creator_id UUID,
  p_editor_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
  DELETE FROM creator_favorites
  WHERE creator_id = p_creator_id AND editor_id = p_editor_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para verificar se é favorito
CREATE OR REPLACE FUNCTION is_favorite(
  p_creator_id UUID,
  p_editor_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM creator_favorites
    WHERE creator_id = p_creator_id AND editor_id = p_editor_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para buscar favoritos do creator com detalhes do editor
CREATE OR REPLACE FUNCTION get_creator_favorites(
  p_creator_id UUID,
  p_search TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
) RETURNS TABLE (
  favorite_id UUID,
  editor_id UUID,
  editor_name TEXT,
  editor_email TEXT,
  editor_photo TEXT,
  editor_bio TEXT,
  editor_specialties TEXT[],
  editor_rating NUMERIC,
  editor_total_projects INTEGER,
  note TEXT,
  favorited_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cf.id as favorite_id,
    cf.editor_id,
    COALESCE(u.full_name, 'Editor') as editor_name,
    u.email as editor_email,
    u.profile_photo_url as editor_photo,
    ep.bio as editor_bio,
    ep.specialties as editor_specialties,
    COALESCE(
      (SELECT AVG(r.rating) FROM reviews r WHERE r.reviewee_id = cf.editor_id),
      0
    )::NUMERIC as editor_rating,
    COALESCE(
      (SELECT COUNT(*) FROM projects pr 
       WHERE pr.assigned_editor_id = cf.editor_id 
       AND pr.status = 'completed')::INTEGER,
      0
    ) as editor_total_projects,
    cf.note,
    cf.created_at as favorited_at
  FROM creator_favorites cf
  JOIN users u ON u.id = cf.editor_id
  LEFT JOIN editor_profiles ep ON ep.user_id = cf.editor_id
  WHERE cf.creator_id = p_creator_id
    AND (
      p_search IS NULL
      OR u.full_name ILIKE '%' || p_search || '%'
      OR u.email ILIKE '%' || p_search || '%'
      OR cf.note ILIKE '%' || p_search || '%'
    )
  ORDER BY cf.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para contar favoritos de um editor
CREATE OR REPLACE FUNCTION get_editor_favorite_count(p_editor_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM creator_favorites
    WHERE editor_id = p_editor_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- 4. TRIGGER PARA NOTIFICAÇÃO (OPCIONAL)
-- ================================================

-- Trigger para criar notificação quando favoritado
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
      priority,
      data,
      action_url
    ) VALUES (
      NEW.editor_id,
      'system',
      'Novo favorito!',
      v_creator_name || ' adicionou você aos favoritos',
      'low',
      jsonb_build_object('creator_id', NEW.creator_id, 'favorite_id', NEW.id),
      '/editor/dashboard'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_favorite_created ON creator_favorites;
CREATE TRIGGER on_favorite_created
  AFTER INSERT ON creator_favorites
  FOR EACH ROW
  EXECUTE FUNCTION notify_editor_favorited();

-- ================================================
-- 5. ROW LEVEL SECURITY
-- ================================================

ALTER TABLE creator_favorites ENABLE ROW LEVEL SECURITY;

-- Creators podem ver seus próprios favoritos
DROP POLICY IF EXISTS "Creators can view own favorites" ON creator_favorites;
CREATE POLICY "Creators can view own favorites"
  ON creator_favorites FOR SELECT
  TO authenticated
  USING (creator_id = auth.uid());

-- Creators podem adicionar favoritos
DROP POLICY IF EXISTS "Creators can add favorites" ON creator_favorites;
CREATE POLICY "Creators can add favorites"
  ON creator_favorites FOR INSERT
  TO authenticated
  WITH CHECK (creator_id = auth.uid());

-- Creators podem atualizar seus favoritos (nota)
DROP POLICY IF EXISTS "Creators can update own favorites" ON creator_favorites;
CREATE POLICY "Creators can update own favorites"
  ON creator_favorites FOR UPDATE
  TO authenticated
  USING (creator_id = auth.uid());

-- Creators podem remover favoritos
DROP POLICY IF EXISTS "Creators can delete own favorites" ON creator_favorites;
CREATE POLICY "Creators can delete own favorites"
  ON creator_favorites FOR DELETE
  TO authenticated
  USING (creator_id = auth.uid());

-- Editores podem ver quantas vezes foram favoritados (via view)
-- A view já é acessível pois usa SECURITY DEFINER nas funções

-- ================================================
-- 6. COMENTÁRIOS
-- ================================================

COMMENT ON FUNCTION add_favorite IS 'Adiciona editor aos favoritos do creator';
COMMENT ON FUNCTION remove_favorite IS 'Remove editor dos favoritos do creator';
COMMENT ON FUNCTION is_favorite IS 'Verifica se editor está nos favoritos do creator';
COMMENT ON FUNCTION get_creator_favorites IS 'Busca favoritos do creator com detalhes do editor';
COMMENT ON FUNCTION get_editor_favorite_count IS 'Retorna quantas vezes editor foi favoritado';
