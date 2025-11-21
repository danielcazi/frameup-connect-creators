-- ============================================
-- STORED PROCEDURE: VALIDATE AND CREATE APPLICATION
-- ============================================
-- Execute this SQL in your Supabase Dashboard > SQL Editor
-- 
-- This function validates all business rules before creating a project application:
-- ✅ Project exists and is open
-- ✅ Payment confirmed
-- ✅ Editor has active subscription
-- ✅ Editor hasn't reached simultaneous project limit
-- ✅ Editor hasn't already applied
-- ✅ Project hasn't reached 5 applications limit
-- ✅ Message is valid (20-500 characters)

CREATE OR REPLACE FUNCTION validate_and_create_application(
  p_project_id UUID,
  p_editor_id UUID,
  p_message TEXT
)
RETURNS TABLE (
  success BOOLEAN,
  error_code TEXT,
  error_message TEXT,
  application_id UUID
) AS $$
DECLARE
  v_project_status project_status_enum;
  v_payment_status payment_status_enum;
  v_editor_subscription_status subscription_status_enum;
  v_current_projects_count INTEGER;
  v_max_simultaneous_projects INTEGER;
  v_application_count INTEGER;
  v_existing_application UUID;
  v_new_application_id UUID;
BEGIN
  -- 1. Verificar se projeto existe e está open
  SELECT status, payment_status
  INTO v_project_status, v_payment_status
  FROM projects
  WHERE id = p_project_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'PROJECT_NOT_FOUND', 'Projeto não encontrado', NULL::UUID;
    RETURN;
  END IF;

  IF v_project_status != 'open' THEN
    RETURN QUERY SELECT FALSE, 'PROJECT_NOT_OPEN', 'Projeto não está mais aberto', NULL::UUID;
    RETURN;
  END IF;

  IF v_payment_status != 'paid' THEN
    RETURN QUERY SELECT FALSE, 'PAYMENT_NOT_CONFIRMED', 'Pagamento do projeto não confirmado', NULL::UUID;
    RETURN;
  END IF;

  -- 2. Verificar se editor tem assinatura ativa
  SELECT status, sp.max_simultaneous_projects
  INTO v_editor_subscription_status, v_max_simultaneous_projects
  FROM editor_subscriptions es
  JOIN subscription_plans sp ON es.plan_id = sp.id
  WHERE es.editor_id = p_editor_id
  ORDER BY es.created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'NO_SUBSCRIPTION', 'Editor não possui assinatura', NULL::UUID;
    RETURN;
  END IF;

  IF v_editor_subscription_status != 'active' THEN
    RETURN QUERY SELECT FALSE, 'SUBSCRIPTION_NOT_ACTIVE', 'Assinatura do editor não está ativa', NULL::UUID;
    RETURN;
  END IF;

  -- 3. Verificar limite de projetos simultâneos
  SELECT COUNT(*)
  INTO v_current_projects_count
  FROM projects
  WHERE assigned_editor_id = p_editor_id
    AND status = 'in_progress';

  IF v_current_projects_count >= v_max_simultaneous_projects THEN
    RETURN QUERY SELECT FALSE, 'PROJECT_LIMIT_REACHED', 'Limite de projetos simultâneos atingido', NULL::UUID;
    RETURN;
  END IF;

  -- 4. Verificar se já se candidatou
  SELECT id
  INTO v_existing_application
  FROM project_applications
  WHERE project_id = p_project_id
    AND editor_id = p_editor_id;

  IF FOUND THEN
    RETURN QUERY SELECT FALSE, 'ALREADY_APPLIED', 'Você já se candidatou a este projeto', NULL::UUID;
    RETURN;
  END IF;

  -- 5. Verificar se projeto já tem 5 candidaturas
  SELECT COUNT(*)
  INTO v_application_count
  FROM project_applications
  WHERE project_id = p_project_id;

  IF v_application_count >= 5 THEN
    RETURN QUERY SELECT FALSE, 'APPLICATION_LIMIT_REACHED', 'Projeto já atingiu o limite de candidaturas', NULL::UUID;
    RETURN;
  END IF;

  -- 6. Validar mensagem
  IF p_message IS NULL OR LENGTH(TRIM(p_message)) < 20 THEN
    RETURN QUERY SELECT FALSE, 'INVALID_MESSAGE', 'Mensagem deve ter pelo menos 20 caracteres', NULL::UUID;
    RETURN;
  END IF;

  IF LENGTH(p_message) > 500 THEN
    RETURN QUERY SELECT FALSE, 'MESSAGE_TOO_LONG', 'Mensagem não pode ter mais de 500 caracteres', NULL::UUID;
    RETURN;
  END IF;

  -- 7. Criar candidatura
  INSERT INTO project_applications (project_id, editor_id, message, status)
  VALUES (p_project_id, p_editor_id, p_message, 'pending')
  RETURNING id INTO v_new_application_id;

  -- 8. Retornar sucesso
  RETURN QUERY SELECT TRUE, NULL::TEXT, NULL::TEXT, v_new_application_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentário
COMMENT ON FUNCTION validate_and_create_application IS 'Valida todas regras de negócio e cria candidatura se válida';
