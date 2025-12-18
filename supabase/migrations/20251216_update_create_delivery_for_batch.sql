-- =====================================================
-- MIGRATION: Atualizar create_delivery para suportar Lotes
-- Data: 2024-12-16
-- Descrição: Atualiza a função create_delivery para aceitar batch_video_id
--            e atualizar o status do vídeo específico no lote.
-- =====================================================

CREATE OR REPLACE FUNCTION public.create_delivery(
    p_project_id UUID,
    p_video_url TEXT,
    p_video_type TEXT,
    p_title TEXT DEFAULT NULL,
    p_description TEXT DEFAULT NULL,
    p_batch_video_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_editor_id UUID;
    v_current_version INTEGER;
    v_delivery_id UUID;
    v_is_batch BOOLEAN;
BEGIN
    -- 1. Verificar se o usuário é o editor atribuído e se é lote
    SELECT assigned_editor_id, is_batch INTO v_editor_id, v_is_batch
    FROM public.projects
    WHERE id = p_project_id;
    
    IF v_editor_id != auth.uid() THEN
        RAISE EXCEPTION 'Apenas o editor atribuído pode criar entregas';
    END IF;

    -- Validação: Se for projeto em lote, batch_video_id deveria ser fornecido
    -- (Opcional: podemos ser lenientes, mas idealmente deve ser obrigatório para manter consistência)
    IF v_is_batch AND p_batch_video_id IS NULL THEN
        -- RAISE WARNING 'Projeto em lote requer batch_video_id para rastreamento correto.';
        -- Não vamos bloquear por enquanto para não quebrar compatibilidade reversa imediata, 
        -- mas a UI deve garantir o envio.
    END IF;
    
    -- 2. Obter próxima versão global do projeto (mantemos versionamento sequencial por projeto para simplicidade)
    --    Ou poderíamos versionar por vídeo? Por enquanto, versionamento global do projeto é OK.
    SELECT COALESCE(MAX(version), 0) + 1 INTO v_current_version
    FROM public.project_deliveries
    WHERE project_id = p_project_id;
    
    -- 3. Criar entrega
    INSERT INTO public.project_deliveries (
        project_id,
        editor_id,
        video_url,
        video_type,
        title,
        description,
        version,
        batch_video_id -- Novo campo
    ) VALUES (
        p_project_id,
        auth.uid(),
        p_video_url,
        p_video_type,
        p_title,
        p_description,
        v_current_version,
        p_batch_video_id
    ) RETURNING id INTO v_delivery_id;
    
    -- 4. Atualizar status
    IF p_batch_video_id IS NOT NULL THEN
        -- TIPO 1: Projeto em Lote (atualiza o vídeo específico)
        UPDATE public.batch_videos
        SET 
            status = 'delivered', -- equivale a awaiting_review
            delivery_id = v_delivery_id,
            updated_at = NOW()
        WHERE id = p_batch_video_id;

        -- Nota: O status global do projeto é calculado dinamicamente, 
        -- então não precisamos forçar 'in_review' no projeto se existirem outros vídeos pendentes.
    ELSE
        -- TIPO 2: Projeto Único (Legado ou Simples)
        UPDATE public.projects
        SET 
            status = 'in_review',
            current_revision = v_current_version,
            updated_at = NOW()
        WHERE id = p_project_id;
    END IF;
    
    RETURN v_delivery_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
