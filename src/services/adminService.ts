import { supabase } from '@/lib/supabase';
import { logAdminAction } from '@/lib/adminAuth';
import { AdminUser, AdminRole, DEFAULT_PERMISSIONS } from '@/types/admin';

/**
 * Serviço para operações administrativas
 */
export const adminService = {
    /**
     * Criar um novo usuário administrativo
     */
    async createAdmin(
        currentAdminId: string,
        userId: string,
        role: AdminRole,
        department?: string,
        notes?: string
    ): Promise<AdminUser | null> {
        try {
            const { data, error } = await supabase
                .from('admin_users')
                .insert({
                    user_id: userId,
                    role: role,
                    permissions: DEFAULT_PERMISSIONS[role],
                    is_active: true,
                    department: department || null,
                    notes: notes || null,
                    created_by: currentAdminId,
                })
                .select()
                .single();

            if (error) throw error;

            // Log da ação
            await logAdminAction(
                currentAdminId,
                'create_admin',
                'admin',
                data.id,
                { role, department },
                'Novo admin criado'
            );

            return data;
        } catch (error) {
            console.error('Erro ao criar admin:', error);
            return null;
        }
    },

    /**
     * Desativar um admin
     */
    async deactivateAdmin(
        currentAdminId: string,
        targetAdminId: string,
        reason?: string
    ): Promise<boolean> {
        try {
            const { error } = await supabase
                .from('admin_users')
                .update({ is_active: false })
                .eq('id', targetAdminId);

            if (error) throw error;

            // Log da ação
            await logAdminAction(
                currentAdminId,
                'deactivate_admin',
                'admin',
                targetAdminId,
                {},
                reason || 'Admin desativado'
            );

            return true;
        } catch (error) {
            console.error('Erro ao desativar admin:', error);
            return false;
        }
    },

    /**
     * Reativar um admin
     */
    async reactivateAdmin(
        currentAdminId: string,
        targetAdminId: string
    ): Promise<boolean> {
        try {
            const { error } = await supabase
                .from('admin_users')
                .update({ is_active: true })
                .eq('id', targetAdminId);

            if (error) throw error;

            // Log da ação
            await logAdminAction(
                currentAdminId,
                'reactivate_admin',
                'admin',
                targetAdminId,
                {},
                'Admin reativado'
            );

            return true;
        } catch (error) {
            console.error('Erro ao reativar admin:', error);
            return false;
        }
    },

    /**
     * Banir um usuário
     */
    async banUser(
        adminId: string,
        userId: string,
        reason: string
    ): Promise<boolean> {
        try {
            const { error } = await supabase
                .from('user_metadata_extension')
                .upsert({
                    user_id: userId,
                    is_banned: true,
                    ban_reason: reason,
                    banned_by: adminId,
                    banned_at: new Date().toISOString(),
                });

            if (error) throw error;

            // Log da ação
            await logAdminAction(
                adminId,
                'ban_user',
                'user',
                userId,
                { reason },
                reason
            );

            return true;
        } catch (error) {
            console.error('Erro ao banir usuário:', error);
            return false;
        }
    },

    /**
     * Desbanir um usuário
     */
    async unbanUser(
        adminId: string,
        userId: string
    ): Promise<boolean> {
        try {
            const { error } = await supabase
                .from('user_metadata_extension')
                .update({
                    is_banned: false,
                    ban_reason: null,
                    banned_by: null,
                    banned_at: null,
                })
                .eq('user_id', userId);

            if (error) throw error;

            // Log da ação
            await logAdminAction(
                adminId,
                'unban_user',
                'user',
                userId,
                {},
                'Usuário desbanido'
            );

            return true;
        } catch (error) {
            console.error('Erro ao desbanir usuário:', error);
            return false;
        }
    },

    /**
     * Aprovar um editor
     */
    async approveEditor(
        adminId: string,
        editorUserId: string,
        notes?: string
    ): Promise<boolean> {
        try {
            const { error } = await supabase
                .from('user_metadata_extension')
                .upsert({
                    user_id: editorUserId,
                    approval_status: 'approved',
                    approval_notes: notes || null,
                    approved_by: adminId,
                    approved_at: new Date().toISOString(),
                });

            if (error) throw error;

            // Log da ação
            await logAdminAction(
                adminId,
                'approve_editor',
                'user',
                editorUserId,
                { notes },
                'Editor aprovado'
            );

            return true;
        } catch (error) {
            console.error('Erro ao aprovar editor:', error);
            return false;
        }
    },

    /**
     * Rejeitar um editor
     */
    async rejectEditor(
        adminId: string,
        editorUserId: string,
        notes?: string
    ): Promise<boolean> {
        try {
            const { error } = await supabase
                .from('user_metadata_extension')
                .upsert({
                    user_id: editorUserId,
                    approval_status: 'rejected',
                    approval_notes: notes || null,
                    approved_by: adminId,
                    approved_at: new Date().toISOString(),
                });

            if (error) throw error;

            // Log da ação
            await logAdminAction(
                adminId,
                'reject_editor',
                'user',
                editorUserId,
                { notes },
                'Editor rejeitado'
            );

            return true;
        } catch (error) {
            console.error('Erro ao rejeitar editor:', error);
            return false;
        }
    },

    /**
     * Buscar logs de ações de um admin
     */
    async getAdminLogs(adminId: string, limit = 50) {
        try {
            const { data, error } = await supabase
                .from('admin_action_logs')
                .select('*')
                .eq('admin_id', adminId)
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Erro ao buscar logs:', error);
            return [];
        }
    },

    /**
     * Buscar todos os admins
     */
    async getAllAdmins() {
        try {
            const { data, error } = await supabase
                .from('admin_users')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Erro ao buscar admins:', error);
            return [];
        }
    },

    /**
     * Buscar usuários pendentes de aprovação
     */
    async getPendingEditors() {
        try {
            const { data, error } = await supabase
                .from('user_metadata_extension')
                .select(`
          *,
          users:user_id (
            id,
            email,
            full_name,
            username
          )
        `)
                .eq('approval_status', 'pending')
                .order('updated_at', { ascending: false });

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Erro ao buscar editores pendentes:', error);
            return [];
        }
    },
};
