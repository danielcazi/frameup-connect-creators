-- ================================================
-- ATUALIZAÇÃO DO SISTEMA DE ADMIN
-- FrameUp - Fase 23
-- ================================================

-- ================================================
-- 1. ADICIONAR ROLE 'gestor' AO ENUM
-- ================================================

-- Verificar se o valor já existe antes de adicionar
DO $$
BEGIN
  -- Adicionar 'gestor' se não existir
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'gestor' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'admin_role_enum')
  ) THEN
    ALTER TYPE admin_role_enum ADD VALUE 'gestor';
  END IF;
END $$;

-- ================================================
-- 2. CRIAR TABELA DE PERFIS PRÉ-DEFINIDOS
-- ================================================

CREATE TABLE IF NOT EXISTS admin_role_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  permissions TEXT[] NOT NULL,
  is_system BOOLEAN DEFAULT false, -- Perfis do sistema não podem ser deletados
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserir perfis pré-definidos
INSERT INTO admin_role_templates (role_name, display_name, description, permissions, is_system)
VALUES 
  (
    'super_admin',
    'Super Admin',
    'Acesso total ao sistema. Pode gerenciar outros administradores.',
    ARRAY[
      'view_users', 'ban_users', 'unban_users', 'approve_editors', 'reject_editors', 'manage_admin_users',
      'view_all_projects', 'modify_project_prices', 'apply_discounts', 'cancel_projects', 'force_complete_projects',
      'view_disputes', 'resolve_disputes', 'issue_refunds',
      'view_financial_data', 'modify_pricing_table', 'generate_financial_reports', 'process_manual_payments',
      'view_all_messages', 'send_platform_messages', 'moderate_messages',
      'view_analytics', 'export_data'
    ],
    true
  ),
  (
    'financial',
    'Financeiro',
    'Dados financeiros, relatórios, pagamentos, reembolsos e descontos.',
    ARRAY[
      'view_financial_data',
      'generate_financial_reports',
      'process_manual_payments',
      'issue_refunds',
      'modify_pricing_table',
      'apply_discounts',
      'view_analytics',
      'export_data'
    ],
    true
  ),
  (
    'support',
    'Suporte',
    'Disputas, mensagens, moderação e aprovações de editores.',
    ARRAY[
      'view_disputes',
      'resolve_disputes',
      'view_all_messages',
      'send_platform_messages',
      'moderate_messages',
      'view_users',
      'approve_editors',
      'reject_editors'
    ],
    true
  ),
  (
    'gestor',
    'Gestor',
    'Gestão de usuários, aprovações, projetos, descontos e banimentos.',
    ARRAY[
      'view_users',
      'ban_users',
      'unban_users',
      'approve_editors',
      'reject_editors',
      'view_all_projects',
      'modify_project_prices',
      'apply_discounts',
      'view_analytics',
      'export_data'
    ],
    true
  )
ON CONFLICT (role_name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  permissions = EXCLUDED.permissions,
  updated_at = NOW();

-- ================================================
-- 3. ADICIONAR CAMPOS NA TABELA admin_users
-- ================================================

-- Adicionar campo de último login se não existir
ALTER TABLE admin_users 
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE;

-- Adicionar campo de email para facilitar buscas
ALTER TABLE admin_users 
ADD COLUMN IF NOT EXISTS email TEXT;

-- ================================================
-- 4. CRIAR FUNÇÃO PARA BUSCAR ADMINS COM DETALHES
-- ================================================

CREATE OR REPLACE FUNCTION get_admin_users_with_details()
RETURNS TABLE (
  id UUID,
  user_id UUID,
  email TEXT,
  full_name TEXT,
  role TEXT,
  permissions TEXT[],
  is_active BOOLEAN,
  department TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  last_login_at TIMESTAMP WITH TIME ZONE,
  created_by_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    au.id,
    au.user_id,
    COALESCE(au.email, p.email) as email,
    COALESCE(p.full_name, p.name, 'Sem nome') as full_name,
    au.role::TEXT,
    au.permissions::TEXT[],
    au.is_active,
    au.department,
    au.notes,
    au.created_at,
    au.last_login_at,
    (SELECT COALESCE(p2.full_name, p2.name) FROM profiles p2 
     JOIN admin_users au2 ON au2.user_id = p2.user_id 
     WHERE au2.id = au.created_by) as created_by_name
  FROM admin_users au
  LEFT JOIN profiles p ON p.user_id = au.user_id
  ORDER BY 
    CASE au.role 
      WHEN 'super_admin' THEN 1 
      WHEN 'gestor' THEN 2
      WHEN 'financial' THEN 3
      WHEN 'support' THEN 4
      ELSE 5 
    END,
    au.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- 5. CRIAR FUNÇÃO PARA CRIAR ADMIN
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
BEGIN
  -- Buscar email do usuário
  SELECT email INTO v_email FROM auth.users WHERE id = p_user_id;
  
  -- Buscar admin_id do criador
  IF p_created_by IS NOT NULL THEN
    SELECT id INTO v_created_by_admin_id FROM admin_users WHERE user_id = p_created_by;
  END IF;
  
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
-- 6. CRIAR FUNÇÃO PARA ATUALIZAR ADMIN
-- ================================================

CREATE OR REPLACE FUNCTION update_admin_user(
  p_admin_id UUID,
  p_role TEXT DEFAULT NULL,
  p_permissions TEXT[] DEFAULT NULL,
  p_department TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_is_active BOOLEAN DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
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
-- 7. CRIAR FUNÇÃO PARA REMOVER ADMIN
-- ================================================

CREATE OR REPLACE FUNCTION remove_admin_user(p_admin_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_role admin_role_enum;
  v_super_admin_count INTEGER;
BEGIN
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

-- ================================================
-- 8. CRIAR FUNÇÃO PARA BUSCAR USUÁRIOS ELEGÍVEIS
-- ================================================

CREATE OR REPLACE FUNCTION get_eligible_admin_users(p_search TEXT DEFAULT NULL)
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  full_name TEXT,
  user_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.user_id,
    p.email,
    COALESCE(p.full_name, p.name, 'Sem nome') as full_name,
    p.user_type,
    p.created_at
  FROM profiles p
  WHERE 
    -- Não é admin ainda
    NOT EXISTS (SELECT 1 FROM admin_users au WHERE au.user_id = p.user_id AND au.is_active = true)
    -- Filtro de busca
    AND (
      p_search IS NULL 
      OR p.email ILIKE '%' || p_search || '%'
      OR p.full_name ILIKE '%' || p_search || '%'
      OR p.name ILIKE '%' || p_search || '%'
    )
  ORDER BY p.created_at DESC
  LIMIT 20;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- 9. ATUALIZAR RLS POLICIES
-- ================================================

-- Permitir que super_admin e quem tem manage_admin_users vejam admins
DROP POLICY IF EXISTS "Super admins can view all admins" ON admin_users;
CREATE POLICY "Admins with permission can view admins"
  ON admin_users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid()
      AND is_active = TRUE
      AND (role = 'super_admin' OR 'manage_admin_users' = ANY(permissions))
    )
    OR user_id = auth.uid() -- Admin pode ver próprio registro
  );

-- Permitir que admin veja os templates de roles
ALTER TABLE admin_role_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view role templates"
  ON admin_role_templates FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid()
      AND is_active = TRUE
    )
  );

-- ================================================
-- 10. ATUALIZAR ÚLTIMO LOGIN
-- ================================================

CREATE OR REPLACE FUNCTION update_admin_last_login()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE admin_users 
  SET last_login_at = NOW()
  WHERE user_id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger no auth.users para atualizar último login
-- NOTA: Isso pode precisar ser configurado via Supabase Edge Function

-- ================================================
-- COMENTÁRIOS
-- ================================================

COMMENT ON TABLE admin_role_templates IS 'Perfis pré-definidos de administrador com permissões padrão';
COMMENT ON FUNCTION get_admin_users_with_details IS 'Retorna lista de admins com informações completas';
COMMENT ON FUNCTION create_admin_user IS 'Cria novo administrador com validações';
COMMENT ON FUNCTION update_admin_user IS 'Atualiza dados de administrador';
COMMENT ON FUNCTION remove_admin_user IS 'Remove (desativa) administrador com verificação de último super_admin';
COMMENT ON FUNCTION get_eligible_admin_users IS 'Busca usuários que podem ser promovidos a admin';
