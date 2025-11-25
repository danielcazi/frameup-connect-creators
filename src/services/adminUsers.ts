import { supabase } from '@/lib/supabase';

export interface AdminUserListItem {
    id: string;
    name: string;
    email: string;
    phone: string;
    user_type: 'creator' | 'editor';
    created_at: string;
    last_active_at: string;
    is_active: boolean;

    // Dados financeiros
    payment_held_amount: number;
    has_pending_payment: boolean;

    // Dados de projetos
    active_projects_count: number;
    total_projects: number;

    // Metadata adicional
    approval_status?: 'pending' | 'approved' | 'rejected';
    is_banned: boolean;
    subscription_status?: 'active' | 'past_due' | 'cancelled' | 'expired';
}

export interface UserFilters {
    search?: string;
    user_type?: 'creator' | 'editor' | 'all';
    recent_signup?: boolean; // últimos 30 dias
    payment_status?: 'paid' | 'pending' | 'all';
    sort_by?: 'name' | 'created_at' | 'last_active';
    sort_order?: 'asc' | 'desc';
}

// Buscar todos usuários com filtros
export async function getAdminUsersList(filters: UserFilters = {}) {
    try {
        // Query base - busca profiles
        let query = supabase
            .from('profiles')
            .select(`
        *,
        user_metadata_extension (
          approval_status,
          is_banned
        )
      `);

        // Filtro por tipo de usuário
        if (filters.user_type && filters.user_type !== 'all') {
            query = query.eq('user_type', filters.user_type);
        }

        // Filtro por cadastro recente (últimos 30 dias)
        if (filters.recent_signup) {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            query = query.gte('created_at', thirtyDaysAgo.toISOString());
        }

        // Busca por nome/email
        if (filters.search) {
            query = query.or(`name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
        }

        // Ordenação
        const sortBy = filters.sort_by || 'created_at';
        const sortOrder = filters.sort_order || 'desc';
        query = query.order(sortBy, { ascending: sortOrder === 'asc' });

        const { data: profiles, error } = await query;

        if (error) throw error;

        // Processar dados e buscar informações adicionais
        const enrichedUsers = await Promise.all(
            (profiles || []).map(async (profile) => {
                // Buscar projetos ativos
                const { data: projects } = await supabase
                    .from('projects')
                    .select('id, base_price, payment_status, status')
                    .or(`creator_id.eq.${profile.user_id},assigned_editor_id.eq.${profile.user_id}`)
                    .in('status', ['open', 'in_progress', 'in_review']);

                // Calcular pagamento retido (projetos com status paid ou held)
                const paymentHeld = projects
                    ?.filter((p) => p.payment_status === 'paid' || p.payment_status === 'held')
                    .reduce((sum, p) => sum + (p.base_price || 0), 0) || 0;

                // Buscar assinatura (se for editor)
                let subscriptionStatus = null;
                if (profile.user_type === 'editor') {
                    const { data: subscription } = await supabase
                        .from('editor_subscriptions')
                        .select('status')
                        .eq('editor_id', profile.user_id)
                        .eq('status', 'active')
                        .single();

                    subscriptionStatus = subscription?.status || 'expired';
                }

                // Buscar total de projetos
                const { count: totalProjects } = await supabase
                    .from('projects')
                    .select('id', { count: 'exact', head: true })
                    .or(`creator_id.eq.${profile.user_id},assigned_editor_id.eq.${profile.user_id}`);

                return {
                    id: profile.user_id,
                    name: profile.name || 'Sem nome',
                    email: profile.email || '',
                    phone: profile.phone || '',
                    user_type: profile.user_type,
                    created_at: profile.created_at,
                    last_active_at: profile.updated_at || profile.created_at,
                    is_active: true,
                    payment_held_amount: paymentHeld,
                    has_pending_payment: paymentHeld > 0,
                    active_projects_count: projects?.length || 0,
                    total_projects: totalProjects || 0,
                    approval_status: profile.user_metadata_extension?.approval_status,
                    is_banned: profile.user_metadata_extension?.is_banned || false,
                    subscription_status: subscriptionStatus,
                } as AdminUserListItem;
            })
        );

        // Aplicar filtro de status de pagamento
        if (filters.payment_status && filters.payment_status !== 'all') {
            return enrichedUsers.filter((user) => {
                if (filters.payment_status === 'pending') {
                    return user.has_pending_payment;
                } else if (filters.payment_status === 'paid') {
                    return !user.has_pending_payment;
                }
                return true;
            });
        }

        return enrichedUsers;
    } catch (error) {
        console.error('Erro ao buscar usuários:', error);
        throw error;
    }
}

// Buscar detalhes completos de um usuário
export async function getUserDetails(userId: string) {
    try {
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select(`
        *,
        user_metadata_extension (*)
      `)
            .eq('user_id', userId)
            .single();

        if (profileError) throw profileError;

        // Buscar projetos
        const { data: projects } = await supabase
            .from('projects')
            .select('*')
            .or(`creator_id.eq.${userId},assigned_editor_id.eq.${userId}`)
            .order('created_at', { ascending: false });

        // Buscar assinatura (se editor)
        let subscription = null;
        if (profile.user_type === 'editor') {
            const { data: sub } = await supabase
                .from('editor_subscriptions')
                .select(`
          *,
          plan:subscription_plans(*)
        `)
                .eq('editor_id', userId)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            subscription = sub;
        }

        // Buscar warnings
        const { data: warnings } = await supabase
            .from('user_warnings')
            .select('*')
            .eq('user_id', userId)
            .order('issued_at', { ascending: false });

        // Buscar avaliações
        const { data: reviews } = await supabase
            .from('reviews')
            .select('*')
            .eq('reviewee_id', userId)
            .order('created_at', { ascending: false });

        return {
            profile,
            projects: projects || [],
            subscription,
            warnings: warnings || [],
            reviews: reviews || [],
        };
    } catch (error) {
        console.error('Erro ao buscar detalhes do usuário:', error);
        throw error;
    }
}

// Atualizar status do usuário (banir/desbanir)
export async function updateUserStatus(
    userId: string,
    adminId: string,
    updates: {
        is_banned?: boolean;
        ban_reason?: string;
    }
) {
    try {
        const { error } = await supabase
            .from('user_metadata_extension')
            .upsert({
                user_id: userId,
                is_banned: updates.is_banned,
                ban_reason: updates.ban_reason,
                banned_by: updates.is_banned ? adminId : null,
                banned_at: updates.is_banned ? new Date().toISOString() : null,
            });

        if (error) throw error;

        // Log da ação
        await supabase.from('admin_action_logs').insert({
            admin_id: adminId,
            action_type: updates.is_banned ? 'ban_user' : 'unban_user',
            target_type: 'user',
            target_id: userId,
            reason: updates.ban_reason,
        });

        return { success: true };
    } catch (error) {
        console.error('Erro ao atualizar status do usuário:', error);
        throw error;
    }
}

// Obter estatísticas gerais
export async function getUsersStats() {
    try {
        // Total de usuários
        const { count: totalUsers } = await supabase
            .from('profiles')
            .select('id', { count: 'exact', head: true });

        // Creators
        const { count: totalCreators } = await supabase
            .from('profiles')
            .select('id', { count: 'exact', head: true })
            .eq('user_type', 'creator');

        // Editors
        const { count: totalEditors } = await supabase
            .from('profiles')
            .select('id', { count: 'exact', head: true })
            .eq('user_type', 'editor');

        // Novos usuários (últimos 30 dias)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { count: newUsers } = await supabase
            .from('profiles')
            .select('id', { count: 'exact', head: true })
            .gte('created_at', thirtyDaysAgo.toISOString());

        // Usuários banidos
        const { count: bannedUsers } = await supabase
            .from('user_metadata_extension')
            .select('user_id', { count: 'exact', head: true })
            .eq('is_banned', true);

        // Assinaturas ativas
        const { count: activeSubscriptions } = await supabase
            .from('editor_subscriptions')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'active');

        return {
            total_users: totalUsers || 0,
            total_creators: totalCreators || 0,
            total_editors: totalEditors || 0,
            new_users_30d: newUsers || 0,
            banned_users: bannedUsers || 0,
            active_subscriptions: activeSubscriptions || 0,
        };
    } catch (error) {
        console.error('Erro ao buscar estatísticas:', error);
        throw error;
    }
}
