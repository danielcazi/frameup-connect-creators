-- ================================================
-- CORREÇÃO DE RLS - RECURSÃO INFINITA
-- FrameUp - Fase 23.6
-- ================================================

-- Criar funções helper SECURITY DEFINER para evitar recursão
CREATE OR REPLACE FUNCTION auth_has_admin_permission(perm permission_enum)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users
    WHERE user_id = auth.uid()
    AND is_active = true
    AND (role = 'super_admin' OR perm = ANY(permissions))
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atualizar policy da tabela admin_users
DROP POLICY IF EXISTS "Admins with permission can view admins" ON admin_users;
DROP POLICY IF EXISTS "Super admins can view all admins" ON admin_users; -- Limpar antigas

CREATE POLICY "Admins with permission can view admins"
  ON admin_users FOR SELECT
  USING (
    auth_has_admin_permission('manage_admin_users')
    OR user_id = auth.uid()
  );

-- Atualizar policy da tabela admin_role_templates
DROP POLICY IF EXISTS "Admins can view role templates" ON admin_role_templates;

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
-- Nota: A policy de templates também pode causar recursão se não usar security definer,
-- mas como ela consulta admin_users (que agora tem policy segura ou se usarmos a função), deve ficar ok.
-- Melhor usar a função também para garantir.

CREATE OR REPLACE FUNCTION auth_is_active_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users
    WHERE user_id = auth.uid()
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP POLICY IF EXISTS "Admins can view role templates" ON admin_role_templates;
CREATE POLICY "Admins can view role templates"
  ON admin_role_templates FOR SELECT
  TO authenticated
  USING (
    auth_is_active_admin()
  );
