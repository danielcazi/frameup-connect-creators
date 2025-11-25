-- ============================================
-- FRAMEUP - SCHEMA DO BANCO DE DADOS ADMIN
-- Execute este script no Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. CRIAR ENUMS
-- ============================================

-- Role dos admins
CREATE TYPE admin_role_enum AS ENUM (
  'super_admin',
  'admin', 
  'financial',
  'support'
);

-- Permissões granulares
CREATE TYPE permission_enum AS ENUM (
  -- Gestão de usuários
  'view_users',
  'ban_users',
  'unban_users',
  'approve_editors',
  'reject_editors',
  'manage_admin_users',
  
  -- Gestão de projetos
  'view_all_projects',
  'modify_project_prices',
  'apply_discounts',
  'cancel_projects',
  'force_complete_projects',
  
  -- Gestão de disputas
  'view_disputes',
  'resolve_disputes',
  'issue_refunds',
  
  -- Gestão financeira
  'view_financial_data',
  'modify_pricing_table',
  'generate_financial_reports',
  'process_manual_payments',
  
  -- Comunicação
  'view_all_messages',
  'send_platform_messages',
  'moderate_messages',
  
  -- Analytics
  'view_analytics',
  'export_data'
);

-- ============================================
-- 2. CRIAR TABELA ADMIN_USERS
-- ============================================

CREATE TABLE admin_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  role admin_role_enum NOT NULL,
  permissions permission_enum[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  department TEXT,
  notes TEXT,
  created_by UUID REFERENCES admin_users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_admin_users_role ON admin_users(role);
CREATE INDEX idx_admin_users_active ON admin_users(is_active) WHERE is_active = TRUE;

COMMENT ON TABLE admin_users IS 'Usuários administrativos com permissões especiais';

-- ============================================
-- 3. CRIAR TABELA ADMIN_ACTION_LOGS
-- ============================================

CREATE TABLE admin_action_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID REFERENCES admin_users(id) NOT NULL,
  
  -- Ação realizada
  action_type TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID NOT NULL,
  
  -- Detalhes
  action_details JSONB DEFAULT '{}'::jsonb,
  reason TEXT,
  
  -- Contexto
  ip_address INET,
  user_agent TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_admin_logs_admin ON admin_action_logs(admin_id, created_at DESC);
CREATE INDEX idx_admin_logs_target ON admin_action_logs(target_type, target_id);
CREATE INDEX idx_admin_logs_action ON admin_action_logs(action_type);

COMMENT ON TABLE admin_action_logs IS 'Auditoria completa de ações administrativas';

-- ============================================
-- 4. CRIAR TABELA USER_METADATA_EXTENSION
-- ============================================

CREATE TABLE user_metadata_extension (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Status de aprovação (para editores)
  approval_status TEXT CHECK (approval_status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  approval_notes TEXT,
  approved_by UUID REFERENCES admin_users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  
  -- Status de banimento
  is_banned BOOLEAN DEFAULT FALSE,
  ban_reason TEXT,
  banned_by UUID REFERENCES admin_users(id),
  banned_at TIMESTAMP WITH TIME ZONE,
  
  -- Score de comportamento
  bias_score DECIMAL(5,2) DEFAULT 0 CHECK (bias_score >= 0 AND bias_score <= 100),
  total_warnings INTEGER DEFAULT 0,
  
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_user_meta_approval ON user_metadata_extension(approval_status);
CREATE INDEX idx_user_meta_banned ON user_metadata_extension(is_banned) WHERE is_banned = TRUE;

COMMENT ON TABLE user_metadata_extension IS 'Metadados estendidos de usuários para controle administrativo';

-- ============================================
-- 5. CRIAR FUNÇÃO HELPER
-- ============================================

CREATE OR REPLACE FUNCTION has_admin_permission(
  admin_uuid UUID,
  required_permission permission_enum
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users
    WHERE user_id = admin_uuid 
    AND is_active = TRUE
    AND required_permission = ANY(permissions)
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION has_admin_permission IS 'Verifica se admin tem permissão específica';

-- ============================================
-- 6. CONFIGURAR RLS (Row Level Security)
-- ============================================

-- Habilitar RLS
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_action_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_metadata_extension ENABLE ROW LEVEL SECURITY;

-- Políticas para admin_users
-- Apenas super_admin pode ver e gerenciar admins
CREATE POLICY "Super admins can view all admins"
  ON admin_users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid()
      AND role = 'super_admin'
      AND is_active = TRUE
    )
  );

CREATE POLICY "Super admins can insert admins"
  ON admin_users FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid()
      AND role = 'super_admin'
      AND is_active = TRUE
    )
  );

CREATE POLICY "Super admins can update admins"
  ON admin_users FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid()
      AND role = 'super_admin'
      AND is_active = TRUE
    )
  );

-- Políticas para admin_action_logs
-- Admins podem ver seus próprios logs
CREATE POLICY "Admins can view their own logs"
  ON admin_action_logs FOR SELECT
  USING (
    admin_id IN (
      SELECT id FROM admin_users WHERE user_id = auth.uid()
    )
  );

-- Super admins podem ver todos os logs
CREATE POLICY "Super admins can view all logs"
  ON admin_action_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid()
      AND role = 'super_admin'
      AND is_active = TRUE
    )
  );

-- Admins podem inserir logs
CREATE POLICY "Admins can insert logs"
  ON admin_action_logs FOR INSERT
  WITH CHECK (
    admin_id IN (
      SELECT id FROM admin_users WHERE user_id = auth.uid()
    )
  );

-- Políticas para user_metadata_extension
-- Admins com permissão podem ver metadados
CREATE POLICY "Admins can view user metadata"
  ON user_metadata_extension FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid()
      AND is_active = TRUE
      AND 'view_users' = ANY(permissions)
    )
  );

-- Admins com permissão podem atualizar metadados
CREATE POLICY "Admins can update user metadata"
  ON user_metadata_extension FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid()
      AND is_active = TRUE
    )
  );

-- Admins podem inserir metadados
CREATE POLICY "Admins can insert user metadata"
  ON user_metadata_extension FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid()
      AND is_active = TRUE
    )
  );

-- ============================================
-- 7. CRIAR PRIMEIRO SUPER ADMIN
-- ============================================

-- IMPORTANTE: Substitua 'SEU_USER_ID_AQUI' pelo UUID do seu usuário no Supabase Auth
-- Para encontrar seu user_id:
-- 1. Vá em Authentication > Users no Supabase Dashboard
-- 2. Copie o UUID do usuário que será super admin

/*
INSERT INTO admin_users (
  user_id,
  role,
  permissions,
  is_active,
  department,
  notes
) VALUES (
  'SEU_USER_ID_AQUI', -- Substitua pelo UUID real
  'super_admin',
  ARRAY[
    'view_users', 'ban_users', 'unban_users', 'approve_editors', 'reject_editors', 'manage_admin_users',
    'view_all_projects', 'modify_project_prices', 'apply_discounts', 'cancel_projects', 'force_complete_projects',
    'view_disputes', 'resolve_disputes', 'issue_refunds',
    'view_financial_data', 'modify_pricing_table', 'generate_financial_reports', 'process_manual_payments',
    'view_all_messages', 'send_platform_messages', 'moderate_messages',
    'view_analytics', 'export_data'
  ]::permission_enum[],
  true,
  'Administração',
  'Super administrador inicial do sistema'
);
*/

-- ============================================
-- 8. VERIFICAR INSTALAÇÃO
-- ============================================

-- Verificar se as tabelas foram criadas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('admin_users', 'admin_action_logs', 'user_metadata_extension');

-- Verificar se os enums foram criados
SELECT typname 
FROM pg_type 
WHERE typname IN ('admin_role_enum', 'permission_enum');

-- Verificar se a função foi criada
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name = 'has_admin_permission';

-- ============================================
-- SCRIPT CONCLUÍDO
-- ============================================

-- Próximos passos:
-- 1. Execute todo este script no Supabase SQL Editor
-- 2. Descomente e execute o INSERT do super admin com seu user_id
-- 3. Teste o login em /admin/login
-- 4. Verifique se o dashboard carrega corretamente
