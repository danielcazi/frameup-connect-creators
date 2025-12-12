CREATE OR REPLACE FUNCTION public.create_review(
    p_project_id uuid,
    p_reviewer_id uuid,
    p_rating_communication integer,
    p_rating_quality integer,
    p_rating_deadline integer,
    p_rating_professionalism integer,
    p_comment text DEFAULT NULL::text
)
RETURNS TABLE(success boolean, error_code text, error_message text, review_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_can_review BOOLEAN;
  v_error_code TEXT;
  v_error_message TEXT;
  v_reviewee_id UUID;
  v_creator_id UUID;
  v_editor_id UUID;
  v_new_review_id UUID;
BEGIN
  -- 1. Verificar se pode avaliar
  -- FIX: Aliased to cr to avoid ambiguity with output parameter error_code
  SELECT cr.can_review, cr.error_code, cr.error_message
  INTO v_can_review, v_error_code, v_error_message
  FROM can_review_project(p_project_id, p_reviewer_id) AS cr;
  
  IF NOT v_can_review THEN
    RETURN QUERY SELECT FALSE, v_error_code, v_error_message, NULL::UUID;
    RETURN;
  END IF;
  
  -- 2. Validar ratings (1-5)
  IF p_rating_communication NOT BETWEEN 1 AND 5 THEN
    RETURN QUERY SELECT FALSE, 'INVALID_RATING', 'Rating de comunicação deve ser entre 1 e 5', NULL::UUID;
    RETURN;
  END IF;
  
  IF p_rating_quality NOT BETWEEN 1 AND 5 THEN
    RETURN QUERY SELECT FALSE, 'INVALID_RATING', 'Rating de qualidade deve ser entre 1 e 5', NULL::UUID;
    RETURN;
  END IF;
  
  IF p_rating_deadline NOT BETWEEN 1 AND 5 THEN
    RETURN QUERY SELECT FALSE, 'INVALID_RATING', 'Rating de prazo deve ser entre 1 e 5', NULL::UUID;
    RETURN;
  END IF;
  
  IF p_rating_professionalism NOT BETWEEN 1 AND 5 THEN
    RETURN QUERY SELECT FALSE, 'INVALID_RATING', 'Rating de profissionalismo deve ser entre 1 e 5', NULL::UUID;
    RETURN;
  END IF;
  
  -- 3. Validar comentário (se houver) - FIX: Reduced to 5 chars
  IF p_comment IS NOT NULL AND LENGTH(TRIM(p_comment)) > 0 THEN
    IF LENGTH(TRIM(p_comment)) < 5 THEN
      RETURN QUERY SELECT FALSE, 'COMMENT_TOO_SHORT', 'Comentário deve ter pelo menos 5 caracteres', NULL::UUID;
      RETURN;
    END IF;
    
    IF LENGTH(p_comment) > 500 THEN
      RETURN QUERY SELECT FALSE, 'COMMENT_TOO_LONG', 'Comentário não pode ter mais de 500 caracteres', NULL::UUID;
      RETURN;
    END IF;
  END IF;
  
  -- 4. Determinar quem está sendo avaliado
  SELECT creator_id, assigned_editor_id
  INTO v_creator_id, v_editor_id
  FROM projects
  WHERE id = p_project_id;
  
  IF p_reviewer_id = v_creator_id THEN
    v_reviewee_id := v_editor_id; -- Creator avalia Editor
  ELSE
    v_reviewee_id := v_creator_id; -- Editor avalia Creator
  END IF;
  
  -- 5. Criar avaliação
  INSERT INTO reviews (
    project_id,
    reviewer_id,
    reviewee_id,
    rating_communication,
    rating_quality,
    rating_deadline,
    rating_professionalism,
    comment
  )
  VALUES (
    p_project_id,
    p_reviewer_id,
    v_reviewee_id,
    p_rating_communication,
    p_rating_quality,
    p_rating_deadline,
    p_rating_professionalism,
    CASE WHEN p_comment IS NOT NULL THEN TRIM(p_comment) ELSE NULL END
  )
  RETURNING id INTO v_new_review_id;
  
  -- 6. Criar notificação para quem foi avaliado
  INSERT INTO notifications (user_id, type, title, message, reference_id)
  VALUES (
    v_reviewee_id,
    'new_review',
    'Nova Avaliação Recebida! ⭐',
    'Você recebeu uma nova avaliação. Confira seu perfil!',
    p_project_id
  );
  
  -- 7. Retornar sucesso
  RETURN QUERY SELECT TRUE, NULL::TEXT, NULL::TEXT, v_new_review_id;
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN QUERY SELECT FALSE, 'DATABASE_ERROR', SQLERRM, NULL::UUID;
END;
$function$;
