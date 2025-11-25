import { supabase } from './supabase';
import { AdminUser, Permission } from '@/types/admin';

// Log de ação administrativa
export async function logAdminAction(
    adminId: string,
    actionType: string,
    targetType: string,
    targetId: string,
    actionDetails?: Record<string, any>,
    reason?: string
) {
    try {
        const { error } = await supabase
            .from('admin_action_logs')
            .insert({
                admin_id: adminId,
                action_type: actionType,
                target_type: targetType,
                target_id: targetId,
                action_details: actionDetails || {},
                reason: reason || null,
            });

        if (error) throw error;
    } catch (error) {
        console.error('Erro ao registrar log de ação:', error);
    }
}

// Verificar se usuário é admin ativo
export async function checkIsAdmin(userId: string): Promise<AdminUser | null> {
    try {
        const { data, error } = await supabase
            .from('admin_users')
            .select('*')
            .eq('user_id', userId)
            .eq('is_active', true)
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        return null;
    }
}

// Verificar permissão específica
export async function hasAdminPermission(
    userId: string,
    permission: Permission
): Promise<boolean> {
    const admin = await checkIsAdmin(userId);
    if (!admin) return false;
    return admin.permissions.includes(permission);
}

// Verificar múltiplas permissões (AND)
export async function hasAdminPermissions(
    userId: string,
    permissions: Permission[]
): Promise<boolean> {
    const admin = await checkIsAdmin(userId);
    if (!admin) return false;
    return permissions.every(p => admin.permissions.includes(p));
}
