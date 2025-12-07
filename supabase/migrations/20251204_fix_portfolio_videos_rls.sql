-- ============================================
-- FRAMEUP - FIX PORTFOLIO VIDEOS RLS
-- Data: 04/12/2025
-- Fase: 26.10
-- ============================================

-- Verificar se a tabela existe
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'portfolio_videos') THEN
    RAISE EXCEPTION 'Tabela portfolio_videos não existe';
  END IF;
END $$;

-- Habilitar RLS se não estiver habilitado
ALTER TABLE portfolio_videos ENABLE ROW LEVEL SECURITY;

-- Remover policies antigas se existirem
DROP POLICY IF EXISTS "Users can view all portfolio videos" ON portfolio_videos;
DROP POLICY IF EXISTS "Editors can insert own portfolio videos" ON portfolio_videos;
DROP POLICY IF EXISTS "Editors can update own portfolio videos" ON portfolio_videos;
DROP POLICY IF EXISTS "Editors can delete own portfolio videos" ON portfolio_videos;

-- Policy para SELECT - Todos podem ver portfólios (são públicos)
CREATE POLICY "Users can view all portfolio videos"
ON portfolio_videos
FOR SELECT
TO authenticated
USING (true);

-- Policy para INSERT - Editor só pode inserir no próprio portfólio
CREATE POLICY "Editors can insert own portfolio videos"
ON portfolio_videos
FOR INSERT
TO authenticated
WITH CHECK (
  editor_id = auth.uid()
);

-- Policy para UPDATE - Editor só pode atualizar próprios vídeos
CREATE POLICY "Editors can update own portfolio videos"
ON portfolio_videos
FOR UPDATE
TO authenticated
USING (editor_id = auth.uid())
WITH CHECK (editor_id = auth.uid());

-- Policy para DELETE - Editor só pode deletar próprios vídeos
CREATE POLICY "Editors can delete own portfolio videos"
ON portfolio_videos
FOR DELETE
TO authenticated
USING (editor_id = auth.uid());

-- Índice para performance
CREATE INDEX IF NOT EXISTS idx_portfolio_videos_editor_id 
ON portfolio_videos(editor_id);

-- Comentário
COMMENT ON TABLE portfolio_videos IS 'Vídeos do portfólio dos editores - RLS corrigido em 04/12/2025';
