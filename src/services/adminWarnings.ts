import { supabase } from '@/lib/supabase';
import { logAdminAction } from '@/lib/adminAuth';

export interface Warning {
    id: string;
    user_id: string;
    warning_type: string;
    severity: 'warning' | 'suspension' | 'ban';
    reason: string;
    suspension_until: string | null;
    is_permanent_ban: boolean;
    issued_by: string;
    issued_at: string;
    revoked: boolean;
}

// Listar usuários suspeitos
export async function getSuspiciousUsers() {
    try {
        const { data, error } = await supabase
            .from('user_metadata_extension')
            .select(`
        *,
        user:user_id (id, email)
      `)
            .gte('bias_score', 50)
            .order('bias_score', { ascending: false });

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Erro ao buscar usuários suspeitos:', error);
        throw error;
    }
}

// Buscar histórico de warnings de um usuário
export async function getUserWarnings(userId: string) {
    try {
        const { data, error } = await supabase
            .from('user_warnings')
            .select('*')
            .eq('user_id', userId)
            .order('issued_at', { ascending: false });

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Erro ao buscar warnings:', error);
        throw error;
    }
}

// Emitir warning
export async function issueWarning(
    userId: string,
    adminId: string,
    warningType: string,
    severity: 'warning' | 'suspension' | 'ban',
    reason: string,
    suspensionUntil?: string,
    relatedProjectId?: string,
    relatedDisputeId?: string
) {
    try {
        const { error } = await supabase.from('user_warnings').insert({
            user_id: userId,
            warning_type: warningType,
            severity,
            reason,
            suspension_until: suspensionUntil || null,
            is_permanent_ban: severity === 'ban',
            related_project_id: relatedProjectId || null,
            related_dispute_id: relatedDisputeId || null,
            issued_by: adminId,
        });

        if (error) throw error;

        // Log da ação
        await logAdminAction(adminId, 'issue_warning', 'user', userId, { severity }, reason);

        // Recalcular bias score
        await supabase.rpc('calculate_user_bias_score', { p_user_id: userId });

        return { success: true };
    } catch (error) {
        console.error('Erro ao emitir warning:', error);
        throw error;
    }
}

// Banir usuário
export async function banUser(
    userId: string,
    adminId: string,
    reason: string,
    isPermanent: boolean = true
) {
    try {
        await issueWarning(userId, adminId, 'other', 'ban', reason);

        // Se permanente, cancelar projetos ativos
        if (isPermanent) {
            await supabase
                .from('projects')
                .update({ status: 'cancelled' })
                .or(`creator_id.eq.${userId},assigned_editor_id.eq.${userId}`)
                .in('status', ['open', 'in_progress', 'in_review']);
        }

        return { success: true };
    } catch (error) {
        console.error('Erro ao banir usuário:', error);
        throw error;
    }
}

// Desbanir usuário
export async function unbanUser(userId: string, adminId: string, reason: string) {
    try {
        // Marcar ban como revogado
        await supabase
            .from('user_warnings')
            .update({
                revoked: true,
                revoked_by: adminId,
                revoked_at: new Date().toISOString(),
                revoke_reason: reason,
            })
            .eq('user_id', userId)
            .eq('severity', 'ban')
            .eq('revoked', false);

        // Atualizar metadata
        await supabase
            .from('user_metadata_extension')
            .update({
                is_banned: false,
                ban_reason: null,
            })
            .eq('user_id', userId);

        await logAdminAction(adminId, 'unban_user', 'user', userId, {}, reason);

        return { success: true };
    } catch (error) {
        console.error('Erro ao desbanir usuário:', error);
        throw error;
    }
}

// Calcular bias score
export async function calculateBiasScore(userId: string) {
    try {
        const { data, error } = await supabase.rpc('calculate_user_bias_score', {
            p_user_id: userId,
        });

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Erro ao calcular bias score:', error);
        throw error;
    }
}
