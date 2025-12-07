-- ============================================
-- VERIFICAR/CRIAR TABELA PORTFOLIO_VIDEOS
-- ============================================

-- Verificar se tabela existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'portfolio_videos'
  ) THEN
    -- Criar tabela
    CREATE TABLE portfolio_videos (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      editor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      video_url TEXT NOT NULL,
      video_type TEXT NOT NULL DEFAULT 'simple', -- simple, dynamic, motion
      title TEXT NOT NULL,
      description TEXT,
      thumbnail_url TEXT,
      order_position INTEGER NOT NULL DEFAULT 1,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Índices
    CREATE INDEX idx_portfolio_videos_editor ON portfolio_videos(editor_id);
    CREATE INDEX idx_portfolio_videos_order ON portfolio_videos(editor_id, order_position);

    RAISE NOTICE 'Tabela portfolio_videos criada!';
  ELSE
    RAISE NOTICE 'Tabela portfolio_videos já existe.';
  END IF;
END $$;

-- ============================================
-- RLS PARA PORTFOLIO_VIDEOS
-- ============================================

-- Habilitar RLS
ALTER TABLE portfolio_videos ENABLE ROW LEVEL SECURITY;

-- Remover policies antigas
DROP POLICY IF EXISTS "Users can view all portfolio videos" ON portfolio_videos;
DROP POLICY IF EXISTS "Editors can insert own portfolio videos" ON portfolio_videos;
DROP POLICY IF EXISTS "Editors can update own portfolio videos" ON portfolio_videos;
DROP POLICY IF EXISTS "Editors can delete own portfolio videos" ON portfolio_videos;
DROP POLICY IF EXISTS "Anyone can view portfolio videos" ON portfolio_videos;
DROP POLICY IF EXISTS "Editors can manage own videos" ON portfolio_videos;
DROP POLICY IF EXISTS "Users can insert own portfolio videos" ON portfolio_videos;
DROP POLICY IF EXISTS "Users can update own portfolio videos" ON portfolio_videos;
DROP POLICY IF EXISTS "Users can delete own portfolio videos" ON portfolio_videos;


-- Policy SELECT - Todos podem ver (portfólios são públicos)
CREATE POLICY "Anyone can view portfolio videos"
ON portfolio_videos
FOR SELECT
USING (true);

-- Policy INSERT - Usuário só pode inserir para si mesmo
CREATE POLICY "Users can insert own portfolio videos"
ON portfolio_videos
FOR INSERT
TO authenticated
WITH CHECK (editor_id = auth.uid());

-- Policy UPDATE - Usuário só pode atualizar próprios vídeos
CREATE POLICY "Users can update own portfolio videos"
ON portfolio_videos
FOR UPDATE
TO authenticated
USING (editor_id = auth.uid())
WITH CHECK (editor_id = auth.uid());

-- Policy DELETE - Usuário só pode deletar próprios vídeos
CREATE POLICY "Users can delete own portfolio videos"
ON portfolio_videos
FOR DELETE
TO authenticated
USING (editor_id = auth.uid());
