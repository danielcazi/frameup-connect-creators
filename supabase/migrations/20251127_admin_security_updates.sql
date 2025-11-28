-- ================================================
-- ATUALIZAÇÃO DE SEGURANÇA - ADMIN
-- FrameUp - Fase 23.6
-- ================================================

-- ================================================
-- 1. ATUALIZAR create_admin_user COM VERIFICAÇÃO
-- ================================================

CREATE OR REPLACE FUNCTION create_admin_user(
  p_user_id UUID,
  p_role TEXT,
  p_permissions TEXT[],
  p_department TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_created_by UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_admin_id UUID;
  v_email TEXT;
  v_created_by_admin_id UUID;
  v_creator_role admin_role_enum;
BEGIN
  -- Verificar se criador é super_admin
  IF p_created_by IS NOT NULL THEN
    SELECT role, id INTO v_creator_role, v_created_by_admin_id
    FROM admin_users 
    WHERE user_id = p_created_by AND is_active = true;
    
    IF v_creator_role IS NULL OR v_creator_role != 'super_admin' THEN
      RAISE EXCEPTION 'Apenas Super Admins podem criar novos administradores';
    END IF;
  END IF;

  -- Buscar email do usuário
  SELECT email INTO v_email FROM auth.users WHERE id = p_user_id;
  
  -- Verificar se usuário já é admin
  IF EXISTS (SELECT 1 FROM admin_users WHERE user_id = p_user_id) THEN
    RAISE EXCEPTION 'Usuário já é um administrador';
  END IF;
  
  -- Inserir admin
  INSERT INTO admin_users (
    user_id,
    email,
    role,
    permissions,
    department,
    notes,
    created_by,
    is_active
  ) VALUES (
    p_user_id,
    v_email,
    p_role::admin_role_enum,
    p_permissions::permission_enum[],
    p_department,
    p_notes,
    v_created_by_admin_id,
    true
  ) RETURNING id INTO v_admin_id;
  
  RETURN v_admin_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- 2. ATUALIZAR update_admin_user COM VERIFICAÇÃO
-- ================================================

CREATE OR REPLACE FUNCTION update_admin_user(
  p_admin_id UUID,
  p_role TEXT DEFAULT NULL,
  p_permissions TEXT[] DEFAULT NULL,
  p_department TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_is_active BOOLEAN DEFAULT NULL,
  p_updated_by UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_updater_role admin_role_enum;
BEGIN
  -- Verificar se quem está atualizando é super_admin
  IF p_updated_by IS NOT NULL THEN
    SELECT role INTO v_updater_role 
    FROM admin_users 
    WHERE user_id = p_updated_by AND is_active = true;
    
    IF v_updater_role IS NULL OR v_updater_role != 'super_admin' THEN
      RAISE EXCEPTION 'Apenas Super Admins podem atualizar administradores';
    END IF;
  END IF;

  UPDATE admin_users
  SET
    role = COALESCE(p_role::admin_role_enum, role),
    permissions = COALESCE(p_permissions::permission_enum[], permissions),
    department = COALESCE(p_department, department),
    notes = COALESCE(p_notes, notes),
    is_active = COALESCE(p_is_active, is_active),
    updated_at = NOW()
  WHERE id = p_admin_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- 3. ATUALIZAR remove_admin_user COM VERIFICAÇÃO
-- ================================================

CREATE OR REPLACE FUNCTION remove_admin_user(
  p_admin_id UUID,
  p_removed_by UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_role admin_role_enum;
  v_super_admin_count INTEGER;
  v_remover_role admin_role_enum;
  v_remover_admin_id UUID;
BEGIN
  -- Verificar se quem está removendo é super_admin
  IF p_removed_by IS NOT NULL THEN
    SELECT role, id INTO v_remover_role, v_remover_admin_id
    FROM admin_users 
    WHERE user_id = p_removed_by AND is_active = true;
    
    IF v_remover_role IS NULL OR v_remover_role != 'super_admin' THEN
      RAISE EXCEPTION 'Apenas Super Admins podem remover administradores';
    END IF;
    
    -- Verificar se está tentando remover a si mesmo
    IF v_remover_admin_id = p_admin_id THEN
      RAISE EXCEPTION 'Você não pode remover a si mesmo';
    END IF;
  END IF;

  -- Verificar role do admin a ser removido
  SELECT role INTO v_role FROM admin_users WHERE id = p_admin_id;
  
  -- Se for super_admin, verificar se há outros
  IF v_role = 'super_admin' THEN
    SELECT COUNT(*) INTO v_super_admin_count 
    FROM admin_users 
    WHERE role = 'super_admin' AND is_active = true AND id != p_admin_id;
    
    IF v_super_admin_count = 0 THEN
      RAISE EXCEPTION 'Não é possível remover o último Super Admin';
    END IF;
  END IF;
  
  -- Desativar ao invés de deletar (soft delete)
  UPDATE admin_users 
  SET is_active = false, updated_at = NOW()
  WHERE id = p_admin_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
