import { supabase } from '@/lib/supabase';

// ================================================
// TIPOS
// ================================================

export type AdminRole = 'super_admin' | 'financial' | 'support' | 'gestor';

export interface AdminUser {
    id: string;
    user_id: string;
    email: string;
    full_name: string;
    role: AdminRole;
    permissions: string[];
    is_active: boolean;
    department?: string;
    notes?: string;
    created_at: string;
    last_login_at?: string;
    created_by_name?: string;
}

export interface RoleTemplate {
    id: string;
    role_name: string;
    display_name: string;
    description: string;
    permissions: string[];
    is_system: boolean;
}

export interface EligibleUser {
    user_id: string;
    email: string;
    full_name: string;
    user_type: string;
    created_at: string;
}

export interface CreateAdminData {
    user_id: string;
    role: AdminRole;
    permissions: string[];
    department?: string;
    notes?: string;
}

export interface UpdateAdminData {
    role?: AdminRole;
    permissions?: string[];
    department?: string;
    notes?: string;
    is_active?: boolean;
}

// ================================================
// PERMISSÕES DISPONÍVEIS (para UI)
// ================================================

export const ALL_PERMISSIONS = [
    // Gestão de usuários
    { key: 'view_users', label: 'Visualizar usuários', category: 'Usuários' },
    { key: 'ban_users', label: 'Banir usuários', category: 'Usuários' },
    { key: 'unban_users', label: 'Desbanir usuários', category: 'Usuários' },
    { key: 'approve_editors', label: 'Aprovar editores', category: 'Usuários' },
    { key: 'reject_editors', label: 'Rejeitar editores', category: 'Usuários' },
    { key: 'manage_admin_users', label: 'Gerenciar administradores', category: 'Usuários' },

    // Gestão de projetos
    { key: 'view_all_projects', label: 'Visualizar todos projetos', category: 'Projetos' },
    { key: 'modify_project_prices', label: 'Modificar preços', category: 'Projetos' },
    { key: 'apply_discounts', label: 'Aplicar descontos', category: 'Projetos' },
    { key: 'cancel_projects', label: 'Cancelar projetos', category: 'Projetos' },
    { key: 'force_complete_projects', label: 'Forçar conclusão', category: 'Projetos' },

    // Disputas
    { key: 'view_disputes', label: 'Visualizar disputas', category: 'Disputas' },
    { key: 'resolve_disputes', label: 'Resolver disputas', category: 'Disputas' },
    { key: 'issue_refunds', label: 'Emitir reembolsos', category: 'Disputas' },

    // Financeiro
    { key: 'view_financial_data', label: 'Visualizar dados financeiros', category: 'Financeiro' },
    { key: 'modify_pricing_table', label: 'Modificar tabela de preços', category: 'Financeiro' },
    { key: 'generate_financial_reports', label: 'Gerar relatórios', category: 'Financeiro' },
    { key: 'process_manual_payments', label: 'Processar pagamentos manuais', category: 'Financeiro' },

    // Comunicação
    { key: 'view_all_messages', label: 'Visualizar todas mensagens', category: 'Comunicação' },
    { key: 'send_platform_messages', label: 'Enviar mensagens da plataforma', category: 'Comunicação' },
    { key: 'moderate_messages', label: 'Moderar mensagens', category: 'Comunicação' },

    // Analytics
    { key: 'view_analytics', label: 'Visualizar analytics', category: 'Analytics' },
    { key: 'export_data', label: 'Exportar dados', category: 'Analytics' },
];

export const PERMISSION_CATEGORIES = [
    'Usuários',
    'Projetos',
    'Disputas',
    'Financeiro',
    'Comunicação',
    'Analytics',
];

// ================================================
// FUNÇÕES
// ================================================

/**
 * Buscar todos os administradores
 */
export async function getAdminUsers(): Promise<AdminUser[]> {
    try {
        const { data, error } = await supabase.rpc('get_admin_users_with_details');

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Erro ao buscar admins:', error);
        throw error;
    }
}

/**
 * Buscar templates de roles
 */
export async function getRoleTemplates(): Promise<RoleTemplate[]> {
    try {
        const { data, error } = await supabase
            .from('admin_role_templates')
            .select('*')
            .order('role_name');

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Erro ao buscar templates:', error);
        throw error;
    }
}

/**
 * Buscar usuários elegíveis para serem admins
 */
export async function getEligibleUsers(search?: string): Promise<EligibleUser[]> {
    try {
        const { data, error } = await supabase.rpc('get_eligible_admin_users', {
            p_search: search || null,
        });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Erro ao buscar usuários elegíveis:', error);
        throw error;
    }
}

/**
 * Criar novo administrador
 */
export async function createAdmin(
    data: CreateAdminData,
    createdBy: string
): Promise<string> {
    try {
        const { data: adminId, error } = await supabase.rpc('create_admin_user', {
            p_user_id: data.user_id,
            p_role: data.role,
            p_permissions: data.permissions,
            p_department: data.department || null,
            p_notes: data.notes || null,
            p_created_by: createdBy,
        });

        if (error) throw error;

        // Registrar log
        await logAdminAction(createdBy, 'create_admin', 'admin_user', adminId, {
            new_role: data.role,
            new_permissions: data.permissions,
        });

        return adminId;
    } catch (error) {
        console.error('Erro ao criar admin:', error);
        throw error;
    }
}

/**
 * Atualizar administrador
 */
export async function updateAdmin(
    adminId: string,
    data: UpdateAdminData,
    updatedBy: string
): Promise<boolean> {
    try {
        const { data: success, error } = await supabase.rpc('update_admin_user', {
            p_admin_id: adminId,
            p_role: data.role || null,
            p_permissions: data.permissions || null,
            p_department: data.department || null,
            p_notes: data.notes || null,
            p_is_active: data.is_active ?? null,
            p_updated_by: updatedBy,
        });

        if (error) throw error;

        // Registrar log
        await logAdminAction(updatedBy, 'update_admin', 'admin_user', adminId, {
            updates: data,
        });

        return success;
    } catch (error) {
        console.error('Erro ao atualizar admin:', error);
        throw error;
    }
}

/**
 * Remover (desativar) administrador
 */
export async function removeAdmin(
    adminId: string,
    removedBy: string,
    reason?: string
): Promise<boolean> {
    try {
        const { data: success, error } = await supabase.rpc('remove_admin_user', {
            p_admin_id: adminId,
            p_removed_by: removedBy,
        });

        if (error) throw error;

        // Registrar log
        await logAdminAction(removedBy, 'remove_admin', 'admin_user', adminId, {
            reason,
        });

        return success;
    } catch (error) {
        console.error('Erro ao remover admin:', error);
        throw error;
    }
}

/**
 * Reativar administrador
 */
export async function reactivateAdmin(
    adminId: string,
    reactivatedBy: string
): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('admin_users')
            .update({ is_active: true, updated_at: new Date().toISOString() })
            .eq('id', adminId);

        if (error) throw error;

        // Registrar log
        await logAdminAction(reactivatedBy, 'reactivate_admin', 'admin_user', adminId, {});

        return true;
    } catch (error) {
        console.error('Erro ao reativar admin:', error);
        throw error;
    }
}

/**
 * Buscar detalhes de um admin específico
 */
export async function getAdminById(adminId: string): Promise<AdminUser | null> {
    try {
        const admins = await getAdminUsers();
        return admins.find((a) => a.id === adminId) || null;
    } catch (error) {
        console.error('Erro ao buscar admin:', error);
        throw error;
    }
}

/**
 * Verificar se usuário atual é super admin
 */
export async function checkIsSuperAdmin(userId: string): Promise<boolean> {
    try {
        const { data, error } = await supabase
            .from('admin_users')
            .select('role')
            .eq('user_id', userId)
            .eq('is_active', true)
            .single();

        if (error) return false;
        return data?.role === 'super_admin';
    } catch {
        return false;
    }
}

/**
 * Registrar log de ação administrativa
 */
async function logAdminAction(
    adminUserId: string,
    actionType: string,
    targetType: string,
    targetId: string,
    details: Record<string, any>
): Promise<void> {
    try {
        // Buscar admin_id a partir do user_id
        const { data: admin } = await supabase
            .from('admin_users')
            .select('id')
            .eq('user_id', adminUserId)
            .single();

        if (!admin) return;

        await supabase.from('admin_action_logs').insert({
            admin_id: admin.id,
            action_type: actionType,
            target_type: targetType,
            target_id: targetId,
            action_details: details,
        });
    } catch (error) {
        console.error('Erro ao registrar log:', error);
        // Não lançar erro para não interromper a ação principal
    }
}

// ================================================
// HELPERS
// ================================================

export function getRoleDisplayName(role: AdminRole): string {
    const names: Record<AdminRole, string> = {
        super_admin: 'Super Admin',
        financial: 'Financeiro',
        support: 'Suporte',
        gestor: 'Gestor',
    };
    return names[role] || role;
}

export function getRoleColor(role: AdminRole): string {
    const colors: Record<AdminRole, string> = {
        super_admin: 'bg-purple-100 text-purple-800 border-purple-200',
        financial: 'bg-green-100 text-green-800 border-green-200',
        support: 'bg-blue-100 text-blue-800 border-blue-200',
        gestor: 'bg-orange-100 text-orange-800 border-orange-200',
    };
    return colors[role] || 'bg-gray-100 text-gray-800 border-gray-200';
}

export function getRoleIcon(role: AdminRole): string {
    const icons: Record<AdminRole, string> = {
        super_admin: '👑',
        financial: '💰',
        support: '🎧',
        gestor: '📋',
    };
    return icons[role] || '👤';
}
