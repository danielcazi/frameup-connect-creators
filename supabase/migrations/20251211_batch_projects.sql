-- =====================================================
-- MIGRATION: Sistema de Projetos em Lote
-- Data: 2024-12-11
-- Descrição: Adiciona suporte a projetos com múltiplos vídeos
-- =====================================================

-- 1. Atualizar tabela projects (adicionar campos de lote)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS is_batch BOOLEAN DEFAULT false;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS batch_quantity INTEGER;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS batch_delivery_mode VARCHAR(20); -- 'sequential' ou 'simultaneous'
ALTER TABLE projects ADD COLUMN IF NOT EXISTS batch_discount_percent DECIMAL(5,2);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS editor_earnings_per_video DECIMAL(10,2);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS editor_earnings_released DECIMAL(10,2) DEFAULT 0;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS videos_approved INTEGER DEFAULT 0;

-- Novos campos de briefing aprimorado
ALTER TABLE projects ADD COLUMN IF NOT EXISTS brand_identity_url TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS fonts_url TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS raw_footage_url TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS raw_footage_duration VARCHAR(20); -- '0-30min', '30min-1h', '1-3h', '3h+'
ALTER TABLE projects ADD COLUMN IF NOT EXISTS music_sfx_url TEXT;

-- 2. Nova tabela batch_videos
CREATE TABLE IF NOT EXISTS batch_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  sequence_order INTEGER NOT NULL, -- 1, 2, 3, 4, 5...
  title TEXT NOT NULL,
  specific_instructions TEXT,
  editor_can_choose_timing BOOLEAN DEFAULT false,
  selected_timestamp_start INTEGER, -- Em segundos
  selected_timestamp_end INTEGER,   -- Em segundos
  status VARCHAR(20) DEFAULT 'pending', -- pending, in_progress, delivered, revision, approved
  delivery_id UUID REFERENCES project_deliveries(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  payment_released_at TIMESTAMP WITH TIME ZONE,
  payment_amount DECIMAL(10,2),
  revision_count INTEGER DEFAULT 0,
  paid_extra_revisions BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT valid_sequence CHECK (sequence_order > 0),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'in_progress', 'delivered', 'revision', 'approved'))
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_batch_videos_project ON batch_videos(project_id);
CREATE INDEX IF NOT EXISTS idx_batch_videos_status ON batch_videos(status);

-- 3. Atualizar project_deliveries para suportar lote
ALTER TABLE project_deliveries ADD COLUMN IF NOT EXISTS batch_video_id UUID REFERENCES batch_videos(id);

-- 4. RLS Policies para batch_videos
ALTER TABLE batch_videos ENABLE ROW LEVEL SECURITY;

-- Policy: SELECT - Criador do projeto ou Editor atribuído podem ver
CREATE POLICY "batch_videos_select_policy"
ON public.batch_videos
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id = batch_videos.project_id
        AND (p.creator_id = auth.uid() OR p.assigned_editor_id = auth.uid())
    )
);

-- Policy: INSERT - Apenas o criador do projeto pode inserir
CREATE POLICY "batch_videos_insert_policy"
ON public.batch_videos
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id = project_id
        AND p.creator_id = auth.uid()
    )
);

-- Policy: UPDATE - Criador ou Editor atribuído podem atualizar
CREATE POLICY "batch_videos_update_policy"
ON public.batch_videos
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id = batch_videos.project_id
        AND (p.creator_id = auth.uid() OR p.assigned_editor_id = auth.uid())
    )
);

-- 5. Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_batch_videos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_batch_videos_updated_at
    BEFORE UPDATE ON batch_videos
    FOR EACH ROW
    EXECUTE FUNCTION update_batch_videos_updated_at();

-- 6. Comentários para documentação
COMMENT ON TABLE batch_videos IS 'Vídeos individuais de um projeto em lote';
COMMENT ON COLUMN batch_videos.sequence_order IS 'Ordem de entrega do vídeo (1, 2, 3...)';
COMMENT ON COLUMN batch_videos.editor_can_choose_timing IS 'Se o editor pode escolher a minutagem do material bruto';
COMMENT ON COLUMN batch_videos.selected_timestamp_start IS 'Início do trecho em segundos (ex: 180 = 3min)';
COMMENT ON COLUMN batch_videos.selected_timestamp_end IS 'Fim do trecho em segundos';
COMMENT ON COLUMN projects.batch_delivery_mode IS 'sequential = entrega um por vez, simultaneous = todos juntos';
