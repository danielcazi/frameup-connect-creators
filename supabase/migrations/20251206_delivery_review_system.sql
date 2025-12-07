-- ============================================
-- FRAMEUP - SISTEMA DE REVISÃO DE VÍDEOS
-- Migration: Entregas e Comentários com Timestamp
-- ============================================

-- ============================================
-- 1. TABELA DE ENTREGAS (DELIVERIES)
-- ============================================

CREATE TABLE IF NOT EXISTS public.project_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    editor_id UUID NOT NULL REFERENCES auth.users(id),
    
    -- Informações do vídeo
    video_url TEXT NOT NULL,
    video_type TEXT NOT NULL CHECK (video_type IN ('youtube', 'gdrive')),
    title TEXT,
    description TEXT,
    
    -- Controle de versão
    version INTEGER NOT NULL DEFAULT 1,
    
    -- Status da entrega
    status TEXT NOT NULL DEFAULT 'pending_review' CHECK (status IN (
        'pending_review',      -- Aguardando revisão do Creator
        'approved',            -- Aprovado pelo Creator
        'revision_requested',  -- Correções solicitadas
        'cancelled'            -- Cancelado
    )),
    
    -- Feedback do Creator (quando aprovado ou com correções)
    creator_feedback TEXT,
    
    -- Controle de revisões
    is_paid_revision BOOLEAN DEFAULT FALSE,
    revision_price DECIMAL(10,2),
    
    -- Timestamps
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_deliveries_project ON public.project_deliveries(project_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_editor ON public.project_deliveries(editor_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_status ON public.project_deliveries(status);
CREATE INDEX IF NOT EXISTS idx_deliveries_version ON public.project_deliveries(project_id, version);

COMMENT ON TABLE public.project_deliveries IS 'Entregas de vídeo dos editores para revisão';

-- ============================================
-- 2. TABELA DE COMENTÁRIOS COM TIMESTAMP
-- ============================================

CREATE TABLE IF NOT EXISTS public.delivery_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    delivery_id UUID NOT NULL REFERENCES public.project_deliveries(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES auth.users(id),
    author_type TEXT NOT NULL CHECK (author_type IN ('creator', 'editor', 'admin')),
    
    -- Comentário
    content TEXT NOT NULL,
    timestamp_seconds DECIMAL(10, 2) NOT NULL DEFAULT 0,
    
    -- Tags para categorização
    tag TEXT CHECK (tag IN ('correction', 'suggestion', 'approved', 'question', 'praise')),
    
    -- Status do comentário
    is_resolved BOOLEAN DEFAULT FALSE,
    resolved_by UUID REFERENCES auth.users(id),
    resolved_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_comments_delivery ON public.delivery_comments(delivery_id);
CREATE INDEX IF NOT EXISTS idx_comments_author ON public.delivery_comments(author_id);
CREATE INDEX IF NOT EXISTS idx_comments_timestamp ON public.delivery_comments(timestamp_seconds);
CREATE INDEX IF NOT EXISTS idx_comments_resolved ON public.delivery_comments(is_resolved);

COMMENT ON TABLE public.delivery_comments IS 'Comentários com timestamp nas entregas de vídeo';

-- ============================================
-- 3. TABELA DE RESPOSTAS AOS COMENTÁRIOS
-- ============================================

CREATE TABLE IF NOT EXISTS public.delivery_comment_replies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id UUID NOT NULL REFERENCES public.delivery_comments(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES auth.users(id),
    author_type TEXT NOT NULL CHECK (author_type IN ('creator', 'editor', 'admin')),
    
    content TEXT NOT NULL,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_replies_comment ON public.delivery_comment_replies(comment_id);
CREATE INDEX IF NOT EXISTS idx_replies_author ON public.delivery_comment_replies(author_id);

COMMENT ON TABLE public.delivery_comment_replies IS 'Respostas aos comentários de revisão';

-- ============================================
-- 4. ADICIONAR CAMPOS AO PROJETO
-- ============================================

-- Adicionar campo para controle de revisões no projeto
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS current_revision INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_free_revisions INTEGER DEFAULT 2,
ADD COLUMN IF NOT EXISTS revision_fee_percentage DECIMAL(5,2) DEFAULT 35.00;

-- ============================================
-- 5. RLS POLICIES
-- ============================================

ALTER TABLE public.project_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_comment_replies ENABLE ROW LEVEL SECURITY;

-- Policies para deliveries
CREATE POLICY "Editor pode criar entregas em seus projetos"
ON public.project_deliveries FOR INSERT
WITH CHECK (
    auth.uid() = editor_id AND
    EXISTS (
        SELECT 1 FROM public.projects 
        WHERE id = project_id 
        AND assigned_editor_id = auth.uid()
    )
);

CREATE POLICY "Envolvidos podem ver entregas"
ON public.project_deliveries FOR SELECT
USING (
    editor_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM public.projects 
        WHERE id = project_id 
        AND (creator_id = auth.uid() OR assigned_editor_id = auth.uid())
    ) OR
    EXISTS (
        SELECT 1 FROM public.admin_users 
        WHERE user_id = auth.uid() AND is_active = TRUE
    )
);

CREATE POLICY "Creator pode atualizar status da entrega"
ON public.project_deliveries FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.projects 
        WHERE id = project_id 
        AND creator_id = auth.uid()
    )
);

-- Policies para comments
CREATE POLICY "Envolvidos podem ver comentários"
ON public.delivery_comments FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.project_deliveries d
        JOIN public.projects p ON d.project_id = p.id
        WHERE d.id = delivery_id
        AND (p.creator_id = auth.uid() OR p.assigned_editor_id = auth.uid())
    ) OR
    EXISTS (
        SELECT 1 FROM public.admin_users 
        WHERE user_id = auth.uid() AND is_active = TRUE
    )
);

CREATE POLICY "Envolvidos podem criar comentários"
ON public.delivery_comments FOR INSERT
WITH CHECK (
    auth.uid() = author_id AND
    EXISTS (
        SELECT 1 FROM public.project_deliveries d
        JOIN public.projects p ON d.project_id = p.id
        WHERE d.id = delivery_id
        AND (p.creator_id = auth.uid() OR p.assigned_editor_id = auth.uid())
    )
);

CREATE POLICY "Autor pode deletar seu comentário"
ON public.delivery_comments FOR DELETE
USING (author_id = auth.uid());

CREATE POLICY "Envolvidos podem atualizar comentários"
ON public.delivery_comments FOR UPDATE
USING (
    author_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM public.project_deliveries d
        JOIN public.projects p ON d.project_id = p.id
        WHERE d.id = delivery_id
        AND (p.creator_id = auth.uid() OR p.assigned_editor_id = auth.uid())
    )
);

-- Policies para replies
CREATE POLICY "Envolvidos podem ver respostas"
ON public.delivery_comment_replies FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.delivery_comments c
        JOIN public.project_deliveries d ON c.delivery_id = d.id
        JOIN public.projects p ON d.project_id = p.id
        WHERE c.id = comment_id
        AND (p.creator_id = auth.uid() OR p.assigned_editor_id = auth.uid())
    ) OR
    EXISTS (
        SELECT 1 FROM public.admin_users 
        WHERE user_id = auth.uid() AND is_active = TRUE
    )
);

CREATE POLICY "Envolvidos podem criar respostas"
ON public.delivery_comment_replies FOR INSERT
WITH CHECK (
    auth.uid() = author_id AND
    EXISTS (
        SELECT 1 FROM public.delivery_comments c
        JOIN public.project_deliveries d ON c.delivery_id = d.id
        JOIN public.projects p ON d.project_id = p.id
        WHERE c.id = comment_id
        AND (p.creator_id = auth.uid() OR p.assigned_editor_id = auth.uid())
    )
);

CREATE POLICY "Autor pode deletar sua resposta"
ON public.delivery_comment_replies FOR DELETE
USING (author_id = auth.uid());

-- ============================================
-- 6. REALTIME
-- ============================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.project_deliveries;
ALTER PUBLICATION supabase_realtime ADD TABLE public.delivery_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.delivery_comment_replies;

-- ============================================
-- 7. TRIGGERS PARA UPDATED_AT
-- ============================================

CREATE TRIGGER update_deliveries_updated_at
    BEFORE UPDATE ON public.project_deliveries
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_comments_updated_at
    BEFORE UPDATE ON public.delivery_comments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 8. FUNÇÃO PARA CRIAR ENTREGA
-- ============================================

CREATE OR REPLACE FUNCTION public.create_delivery(
    p_project_id UUID,
    p_video_url TEXT,
    p_video_type TEXT,
    p_title TEXT DEFAULT NULL,
    p_description TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_editor_id UUID;
    v_current_version INTEGER;
    v_delivery_id UUID;
BEGIN
    -- Verificar se o usuário é o editor atribuído
    SELECT assigned_editor_id INTO v_editor_id
    FROM public.projects
    WHERE id = p_project_id;
    
    IF v_editor_id != auth.uid() THEN
        RAISE EXCEPTION 'Apenas o editor atribuído pode criar entregas';
    END IF;
    
    -- Obter próxima versão
    SELECT COALESCE(MAX(version), 0) + 1 INTO v_current_version
    FROM public.project_deliveries
    WHERE project_id = p_project_id;
    
    -- Criar entrega
    INSERT INTO public.project_deliveries (
        project_id,
        editor_id,
        video_url,
        video_type,
        title,
        description,
        version
    ) VALUES (
        p_project_id,
        auth.uid(),
        p_video_url,
        p_video_type,
        p_title,
        p_description,
        v_current_version
    ) RETURNING id INTO v_delivery_id;
    
    -- Atualizar status do projeto
    UPDATE public.projects
    SET 
        status = 'in_review',
        current_revision = v_current_version,
        updated_at = NOW()
    WHERE id = p_project_id;
    
    RETURN v_delivery_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 9. FUNÇÃO PARA APROVAR ENTREGA
-- ============================================

CREATE OR REPLACE FUNCTION public.approve_delivery(
    p_delivery_id UUID,
    p_feedback TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_project_id UUID;
    v_creator_id UUID;
BEGIN
    -- Buscar projeto e verificar se é o creator
    SELECT d.project_id, p.creator_id INTO v_project_id, v_creator_id
    FROM public.project_deliveries d
    JOIN public.projects p ON d.project_id = p.id
    WHERE d.id = p_delivery_id;
    
    IF v_creator_id != auth.uid() THEN
        RAISE EXCEPTION 'Apenas o creator pode aprovar entregas';
    END IF;
    
    -- Atualizar entrega
    UPDATE public.project_deliveries
    SET 
        status = 'approved',
        creator_feedback = p_feedback,
        reviewed_at = NOW(),
        updated_at = NOW()
    WHERE id = p_delivery_id;
    
    -- Atualizar projeto para concluído
    UPDATE public.projects
    SET 
        status = 'completed',
        completed_at = NOW(),
        updated_at = NOW()
    WHERE id = v_project_id;
    
    -- TODO: Trigger para liberar pagamento ao editor
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 10. FUNÇÃO PARA SOLICITAR CORREÇÕES
-- ============================================

CREATE OR REPLACE FUNCTION public.request_revision(
    p_delivery_id UUID,
    p_feedback TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    v_project_id UUID;
    v_creator_id UUID;
    v_current_revision INTEGER;
    v_max_free INTEGER;
BEGIN
    -- Buscar projeto e verificar se é o creator
    SELECT d.project_id, p.creator_id, p.current_revision, p.max_free_revisions
    INTO v_project_id, v_creator_id, v_current_revision, v_max_free
    FROM public.project_deliveries d
    JOIN public.projects p ON d.project_id = p.id
    WHERE d.id = p_delivery_id;
    
    IF v_creator_id != auth.uid() THEN
        RAISE EXCEPTION 'Apenas o creator pode solicitar correções';
    END IF;
    
    -- Atualizar entrega
    UPDATE public.project_deliveries
    SET 
        status = 'revision_requested',
        creator_feedback = p_feedback,
        reviewed_at = NOW(),
        updated_at = NOW()
    WHERE id = p_delivery_id;
    
    -- Atualizar projeto
    UPDATE public.projects
    SET 
        status = 'in_progress',
        updated_at = NOW()
    WHERE id = v_project_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
