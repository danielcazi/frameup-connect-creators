// GUIA RÁPIDO: Como usar os tipos Admin no FRAMEUP

// ============================================
// 1. IMPORTANDO OS TIPOS
// ============================================

import { 
  AdminUser, 
  AdminRole, 
  Permission,
  hasPermission,
  canManageAdmin,
  DEFAULT_PERMISSIONS 
} from '@/types/admin';

// ============================================
// 2. VERIFICANDO PERMISSÕES
// ============================================

// Exemplo: Verificar se admin pode banir usuários
function canBanUser(admin: AdminUser): boolean {
  return hasPermission(admin, 'ban_users');
}

// Exemplo: Verificar múltiplas permissões
function canManageFinances(admin: AdminUser): boolean {
  return hasPermission(admin, 'view_financial_data') &&
         hasPermission(admin, 'modify_pricing_table');
}

// ============================================
// 3. CRIANDO UM NOVO ADMIN
// ============================================

async function createNewAdmin(userId: string, role: AdminRole) {
  const newAdmin: Partial<AdminUser> = {
    user_id: userId,
    role: role,
    permissions: DEFAULT_PERMISSIONS[role], // Usa permissões padrão
    is_active: true,
    department: 'Operations',
    notes: 'Created via admin panel'
  };
  
  // Inserir no Supabase
  const { data, error } = await supabase
    .from('admin_users')
    .insert(newAdmin)
    .select()
    .single();
    
  return data;
}

// ============================================
// 4. VERIFICANDO HIERARQUIA
// ============================================

function canModifyAdmin(currentAdmin: AdminUser, targetAdmin: AdminUser): boolean {
  // Apenas super_admin pode gerenciar outros admins
  if (!canManageAdmin(currentAdmin, targetAdmin)) {
    console.error('Sem permissão para gerenciar admins');
    return false;
  }
  
  return true;
}

// ============================================
// 5. REGISTRANDO AÇÕES (AUDIT LOG)
// ============================================

async function logAdminAction(
  adminId: string,
  actionType: string,
  targetType: string,
  targetId: string,
  details: Record<string, any>,
  reason?: string
) {
  const log: Partial<AdminActionLog> = {
    admin_id: adminId,
    action_type: actionType,
    target_type: targetType,
    target_id: targetId,
    action_details: details,
    reason: reason || null,
    ip_address: await getClientIP(),
    user_agent: navigator.userAgent
  };
  
  await supabase.from('admin_action_logs').insert(log);
}

// Exemplo de uso
async function banUser(admin: AdminUser, userId: string, reason: string) {
  if (!hasPermission(admin, 'ban_users')) {
    throw new Error('Sem permissão para banir usuários');
  }
  
  // Banir o usuário
  await supabase
    .from('user_metadata_extension')
    .update({
      is_banned: true,
      ban_reason: reason,
      banned_by: admin.id,
      banned_at: new Date().toISOString()
    })
    .eq('user_id', userId);
  
  // Registrar ação
  await logAdminAction(
    admin.id,
    'ban_user',
    'user',
    userId,
    { reason },
    reason
  );
}

// ============================================
// 6. COMPONENTE REACT COM VERIFICAÇÃO
// ============================================

import { useAdmin } from '@/hooks/useAdmin'; // Será criado na próxima fase

function AdminButton() {
  const { admin, loading } = useAdmin();
  
  if (loading) return <div>Carregando...</div>;
  
  if (!admin || !hasPermission(admin, 'ban_users')) {
    return null; // Não mostra o botão
  }
  
  return (
    <button onClick={() => handleBan()}>
      Banir Usuário
    </button>
  );
}

// ============================================
// 7. MIDDLEWARE DE ROTA (EXEMPLO)
// ============================================

async function requirePermission(permission: Permission) {
  const { data: admin } = await supabase
    .from('admin_users')
    .select('*')
    .eq('user_id', currentUserId)
    .eq('is_active', true)
    .single();
  
  if (!admin || !hasPermission(admin, permission)) {
    throw new Error('Acesso negado');
  }
  
  return admin;
}

// ============================================
// 8. PERMISSÕES POR ROLE
// ============================================

// Super Admin - Todas as permissões (27)
const superAdminPerms = DEFAULT_PERMISSIONS.super_admin;

// Admin - 15 permissões principais
const adminPerms = DEFAULT_PERMISSIONS.admin;

// Financial - 7 permissões financeiras
const financialPerms = DEFAULT_PERMISSIONS.financial;

// Support - 7 permissões de suporte
const supportPerms = DEFAULT_PERMISSIONS.support;

// ============================================
// 9. APROVAÇÃO DE EDITORES
// ============================================

async function approveEditor(
  admin: AdminUser,
  editorUserId: string,
  notes?: string
) {
  if (!hasPermission(admin, 'approve_editors')) {
    throw new Error('Sem permissão para aprovar editores');
  }
  
  // Atualizar status de aprovação
  await supabase
    .from('user_metadata_extension')
    .upsert({
      user_id: editorUserId,
      approval_status: 'approved',
      approval_notes: notes || null,
      approved_by: admin.id,
      approved_at: new Date().toISOString()
    });
  
  // Registrar ação
  await logAdminAction(
    admin.id,
    'approve_editor',
    'user',
    editorUserId,
    { notes },
    'Editor aprovado'
  );
}

// ============================================
// 10. TIPOS DE AÇÕES COMUNS
// ============================================

type AdminActionType = 
  | 'ban_user'
  | 'unban_user'
  | 'approve_editor'
  | 'reject_editor'
  | 'modify_price'
  | 'apply_discount'
  | 'cancel_project'
  | 'resolve_dispute'
  | 'issue_refund'
  | 'create_admin'
  | 'deactivate_admin';

type TargetType = 
  | 'user'
  | 'project'
  | 'dispute'
  | 'admin'
  | 'payment';
