-- Migration to update create_delivery function logic
-- Sets project status to 'pending_approval' for subsequent versions (v > 1) instead of always 'in_review'

CREATE OR REPLACE FUNCTION public.create_delivery(
    p_project_id uuid,
    p_video_url text,
    p_video_type text,
    p_title text DEFAULT NULL::text,
    p_description text DEFAULT NULL::text,
    p_batch_video_id uuid DEFAULT NULL::uuid
)
RETURNS uuid
LANGUAGE plpgsql
AS $function$
DECLARE
    v_editor_id UUID;
    v_current_version INTEGER;
    v_delivery_id UUID;
    v_is_batch BOOLEAN;
    v_new_status project_status_enum;
BEGIN
    -- 1. Verificar se o usuário é o editor atribuído e se é lote
    SELECT assigned_editor_id, is_batch INTO v_editor_id, v_is_batch
    FROM public.projects
    WHERE id = p_project_id;
    
    IF v_editor_id != auth.uid() THEN
        RAISE EXCEPTION 'Apenas o editor atribuído pode criar entregas';
    END IF;

    -- Validação: Se for projeto em lote, batch_video_id deveria ser fornecido
    IF v_is_batch AND p_batch_video_id IS NULL THEN
        -- Opcional: Warning ou erro
    END IF;
    
    -- 2. Obter próxima versão global do projeto
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
        batch_video_id
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
            status = 'delivered',
            delivery_id = v_delivery_id,
            updated_at = NOW()
        WHERE id = p_batch_video_id;
    ELSE
        -- TIPO 2: Projeto Único
        -- Define status based on version
        IF v_current_version = 1 THEN
            v_new_status := 'in_review';
        ELSE
            v_new_status := 'pending_approval';
        END IF;

        UPDATE public.projects
        SET 
            status = v_new_status,
            current_revision = v_current_version,
            updated_at = NOW()
        WHERE id = p_project_id;
    END IF;
    
    RETURN v_delivery_id;
END;
$function$;
