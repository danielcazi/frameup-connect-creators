-- Migration: Adicionar campos de status e controle para batch_videos
-- Data: 2024-12-12
-- Descrição: Suporte completo para controle de status individual de vídeos em lote

-- Verificar e adicionar coluna status se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'batch_videos' AND column_name = 'status'
  ) THEN
    ALTER TABLE batch_videos ADD COLUMN status TEXT DEFAULT 'pending';
  END IF;
END $$;

-- Verificar e adicionar coluna progress_percent se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'batch_videos' AND column_name = 'progress_percent'
  ) THEN
    ALTER TABLE batch_videos ADD COLUMN progress_percent INTEGER DEFAULT 0;
  END IF;
END $$;

-- Verificar e adicionar coluna approved_at se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'batch_videos' AND column_name = 'approved_at'
  ) THEN
    ALTER TABLE batch_videos ADD COLUMN approved_at TIMESTAMPTZ;
  END IF;
END $$;

-- Verificar e adicionar coluna released_at se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'batch_videos' AND column_name = 'released_at'
  ) THEN
    ALTER TABLE batch_videos ADD COLUMN released_at TIMESTAMPTZ;
  END IF;
END $$;

-- Verificar e adicionar coluna delivery_url se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'batch_videos' AND column_name = 'delivery_url'
  ) THEN
    ALTER TABLE batch_videos ADD COLUMN delivery_url TEXT;
  END IF;
END $$;

-- Criar índice para melhorar performance de queries por projeto
CREATE INDEX IF NOT EXISTS idx_batch_videos_project_status 
ON batch_videos(project_id, status);

-- Criar índice para ordenação por sequence_order
CREATE INDEX IF NOT EXISTS idx_batch_videos_sequence 
ON batch_videos(project_id, sequence_order);

-- Adicionar constraint para valores válidos de status
-- NOTE: Usando 'delivered' e 'revision' para manter consistência com o código da aplicação
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage 
    WHERE constraint_name = 'batch_videos_status_check'
  ) THEN
    ALTER TABLE batch_videos 
    ADD CONSTRAINT batch_videos_status_check 
    CHECK (status IN ('pending', 'in_progress', 'delivered', 'revision', 'approved'));
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Atualizar registros existentes que não têm status definido
UPDATE batch_videos 
SET status = 'pending' 
WHERE status IS NULL;

-- Comentários para documentação
COMMENT ON COLUMN batch_videos.status IS 'Status individual do vídeo: pending, in_progress, delivered, revision, approved';
COMMENT ON COLUMN batch_videos.progress_percent IS 'Percentual de progresso da edição (0-100)';
COMMENT ON COLUMN batch_videos.approved_at IS 'Data/hora em que o vídeo foi aprovado pelo creator';
COMMENT ON COLUMN batch_videos.released_at IS 'Data/hora em que o vídeo foi liberado para edição (modo sequencial)';
COMMENT ON COLUMN batch_videos.delivery_url IS 'URL do vídeo final entregue pelo editor';

-- Enable realtime para batch_videos (se não estiver habilitado)
-- ALTER PUBLICATION supabase_realtime ADD TABLE batch_videos;
-- Note: Check if publication exists first to avoid error, or rely on Supabase dashboard. 
-- Executing blindly might fail if table is already in publication. 
-- For creating the file, we keep the user instruction but uncommenting it is usually safer to run manually or conditionally.
-- User prompt had it uncommented. I will uncomment it but wrap in a DO block if possible? No, ALTER PUBLICATION cannot be in DO block easily.
-- I'll leave it as is per user request but corrected for syntax if needed.
-- Actually user request code had: ALTER PUBLICATION supabase_realtime ADD TABLE batch_videos;
-- Minimizing risk: I will comment it out with a note to run manually if needed, or just include it if I am sure. 
-- I will include it as requested.
ALTER PUBLICATION supabase_realtime ADD TABLE batch_videos;
