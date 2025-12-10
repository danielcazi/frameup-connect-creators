import { supabase } from '@/lib/supabase';

export interface AdminUserListItem {
    id: string;
    name: string;
    email: string;
    phone: string;
    user_type: 'creator' | 'editor' | 'admin';
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
    recent_signup?: boolean;
    payment_status?: 'paid' | 'pending' | 'all';
    sort_by?: 'full_name' | 'created_at' | 'updated_at';
    sort_order?: 'asc' | 'desc';
}

// ================================================
// TIPOS PARA DETALHES COMPLETOS DO USUÁRIO
// ================================================

export interface UserProject {
    id: string;
    title: string;
    status: string;
    payment_status: string;
    base_price: number;
    created_at: string;
    updated_at: string;
    role: 'creator' | 'editor';
    other_party?: {
        id: string;
        name: string;
        email: string;
    };
}

export interface UserTransaction {
    id: string;
    type: string;
    status: string;
    amount: number;
    platform_fee: number;
    net_amount: number;
    description?: string;
    project_id?: string;
    project_title?: string;
    created_at: string;
}

export interface UserDispute {
    id: string;
    title: string;
    category: string;
    status: string;
    priority: string;
    role: 'opener' | 'disputed';
    other_party?: {
        id: string;
        name: string;
        email: string;
    };
    project?: {
        id: string;
        title: string;
    };
    created_at: string;
    resolved_at?: string;
}

export interface UserWarning {
    id: string;
    warning_type: string;
    severity: 'low' | 'medium' | 'high';
    reason: string;
    issued_by_name?: string;
    issued_at: string;
    expires_at?: string;
    is_active: boolean;
}

export interface UserReview {
    id: string;
    project_id: string;
    project_title?: string;
    reviewer_name?: string;
    rating_overall: number;
    rating_communication: number;
    rating_quality: number;
    rating_deadline: number;
    rating_professionalism: number;
    comment?: string;
    created_at: string;
}

export interface UserFullDetails {
    profile: {
        id: string;
        email: string;
        user_type: 'creator' | 'editor';
        full_name: string;
        username: string;
        phone?: string;
        profile_photo_url?: string;
        created_at: string;
        updated_at: string;
    };

    metadata: {
        approval_status: 'pending' | 'approved' | 'rejected';
        approval_notes?: string;
        approved_by?: string;
        approved_at?: string;
        is_banned: boolean;
        ban_reason?: string;
        banned_by?: string;
        banned_at?: string;
        total_warnings: number;
    } | null;

    editor_profile?: {
        bio?: string;
        city?: string;
        state?: string;
        specialties: string[];
        software_skills: string[];
        rating_average: number;
        total_projects: number;
        total_reviews: number;
    };

    subscription?: {
        id: string;
        plan_name: string;
        status: string;
        current_period_start: string;
        current_period_end: string;
    } | null;

    stats: {
        total_projects: number;
        active_projects: number;
        completed_projects: number;
        cancelled_projects: number;
        total_spent: number;
        total_earned: number;
        payment_held: number;
        total_disputes: number;
        open_disputes: number;
        average_rating: number;
        total_reviews: number;
    };

    projects: UserProject[];
    transactions: UserTransaction[];
    disputes: UserDispute[];
    warnings: UserWarning[];
    reviews: UserReview[];
}

// ================================================
// FUNÇÃO PRINCIPAL: BUSCAR DETALHES COMPLETOS
// ================================================

export async function getUserFullDetails(userId: string): Promise<UserFullDetails | null> {
    try {
        // ====== QUERIES PARALELAS - Buscar tudo ao mesmo tempo ======
        const [
            userResult,
            metadataResult,
            editorProfileResult,
            subscriptionResult,
            projectsAsCreatorResult,
            projectsAsEditorResult,
            transactionsResult,
            disputesOpenedResult,
            disputesAgainstResult,
            warningsResult,
            reviewsResult
        ] = await Promise.all([
            // 1. Perfil básico
            supabase
                .from('users')
                .select('id, email, user_type, full_name, username, phone, profile_photo_url, created_at, updated_at')
                .eq('id', userId)
                .single(),

            // 2. Metadata extension
            supabase
                .from('user_metadata_extension')
                .select('*')
                .eq('user_id', userId)
                .maybeSingle(),

            // 3. Perfil de editor
            supabase
                .from('editor_profiles')
                .select('bio, city, state, specialties, software_skills, rating_average, total_projects, total_reviews')
                .eq('user_id', userId)
                .maybeSingle(),

            // 4. Assinatura
            supabase
                .from('editor_subscriptions')
                .select('id, status, current_period_start, current_period_end, subscription_plans (name)')
                .eq('editor_id', userId)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle(),

            // 5. Projetos como creator
            supabase
                .from('projects')
                .select('id, title, status, payment_status, base_price, created_at, updated_at, assigned_editor_id')
                .eq('creator_id', userId)
                .order('created_at', { ascending: false }),

            // 6. Projetos como editor
            supabase
                .from('projects')
                .select('id, title, status, payment_status, base_price, created_at, updated_at, creator_id')
                .eq('assigned_editor_id', userId)
                .order('created_at', { ascending: false }),

            // 7. Transações
            supabase
                .from('transactions')
                .select('id, type, status, amount, platform_fee, net_amount, description, created_at, project_id')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(50),

            // 8. Disputas abertas pelo usuário
            supabase
                .from('disputes')
                .select('id, title, category, status, priority, created_at, resolved_at, project_id, disputed_user_id')
                .eq('opened_by', userId)
                .order('created_at', { ascending: false }),

            // 9. Disputas contra o usuário
            supabase
                .from('disputes')
                .select('id, title, category, status, priority, created_at, resolved_at, project_id, opened_by')
                .eq('disputed_user_id', userId)
                .order('created_at', { ascending: false }),

            // 10. Warnings
            supabase
                .from('user_warnings')
                .select('id, warning_type, severity, reason, issued_at, expires_at, is_active, issued_by')
                .eq('user_id', userId)
                .order('issued_at', { ascending: false }),

            // 11. Reviews
            supabase
                .from('reviews')
                .select('id, project_id, rating_overall, rating_communication, rating_quality, rating_deadline, rating_professionalism, comment, created_at, reviewer_id')
                .eq('reviewee_id', userId)
                .order('created_at', { ascending: false })
        ]);

        // Verificar se usuário existe
        if (userResult.error || !userResult.data) {
            console.error('Erro ao buscar usuário:', userResult.error);
            return null;
        }

        const user = userResult.data;
        const metadata = metadataResult.data;
        const editorProfile = user.user_type === 'editor' ? editorProfileResult.data : null;

        // Processar assinatura
        let subscription = null;
        if (user.user_type === 'editor' && subscriptionResult.data) {
            const sub = subscriptionResult.data;
            subscription = {
                id: sub.id,
                plan_name: (sub.subscription_plans as any)?.name || 'N/A',
                status: sub.status,
                current_period_start: sub.current_period_start,
                current_period_end: sub.current_period_end,
            };
        }

        // ====== BUSCAR DADOS RELACIONADOS EM BATCH ======

        const projectsAsCreator = projectsAsCreatorResult.data || [];
        const projectsAsEditor = projectsAsEditorResult.data || [];

        // Coletar IDs para buscar dados relacionados
        const editorIds = projectsAsCreator.map(p => p.assigned_editor_id).filter(Boolean);
        const creatorIds = projectsAsEditor.map(p => p.creator_id).filter(Boolean);
        const allRelatedUserIds = [...new Set([...editorIds, ...creatorIds])];

        const transactionsData = transactionsResult.data || [];
        const txProjectIds = transactionsData.map(t => t.project_id).filter(Boolean);

        const disputesOpened = disputesOpenedResult.data || [];
        const disputesAgainst = disputesAgainstResult.data || [];
        const disputeUserIds = [
            ...disputesOpened.map(d => d.disputed_user_id),
            ...disputesAgainst.map(d => d.opened_by),
        ].filter(Boolean);
        const disputeProjectIds = [
            ...disputesOpened.map(d => d.project_id),
            ...disputesAgainst.map(d => d.project_id),
        ].filter(Boolean);

        const reviewsData = reviewsResult.data || [];
        const reviewerIds = reviewsData.map(r => r.reviewer_id).filter(Boolean);
        const reviewProjectIds = reviewsData.map(r => r.project_id).filter(Boolean);

        // Buscar todos os dados relacionados em paralelo
        const allProjectIds = [...new Set([...txProjectIds, ...disputeProjectIds, ...reviewProjectIds])];
        const allUserIdsToFetch = [...new Set([...allRelatedUserIds, ...disputeUserIds, ...reviewerIds])];

        const [relatedUsersResult, relatedProjectsResult] = await Promise.all([
            allUserIdsToFetch.length > 0
                ? supabase.from('users').select('id, full_name, email').in('id', allUserIdsToFetch)
                : { data: [] },
            allProjectIds.length > 0
                ? supabase.from('projects').select('id, title').in('id', allProjectIds)
                : { data: [] }
        ]);

        // Criar mapas para acesso rápido
        const usersMap: Record<string, any> = {};
        (relatedUsersResult.data || []).forEach(u => { usersMap[u.id] = u; });

        const projectsMap: Record<string, any> = {};
        (relatedProjectsResult.data || []).forEach(p => { projectsMap[p.id] = p; });

        // ====== MONTAR DADOS FINAIS ======

        const projects: UserProject[] = [
            ...projectsAsCreator.map((p: any) => ({
                id: p.id,
                title: p.title,
                status: p.status,
                payment_status: p.payment_status,
                base_price: p.base_price,
                created_at: p.created_at,
                updated_at: p.updated_at,
                role: 'creator' as const,
                other_party: p.assigned_editor_id && usersMap[p.assigned_editor_id] ? {
                    id: usersMap[p.assigned_editor_id].id,
                    name: usersMap[p.assigned_editor_id].full_name,
                    email: usersMap[p.assigned_editor_id].email,
                } : undefined,
            })),
            ...projectsAsEditor.map((p: any) => ({
                id: p.id,
                title: p.title,
                status: p.status,
                payment_status: p.payment_status,
                base_price: p.base_price,
                created_at: p.created_at,
                updated_at: p.updated_at,
                role: 'editor' as const,
                other_party: p.creator_id && usersMap[p.creator_id] ? {
                    id: usersMap[p.creator_id].id,
                    name: usersMap[p.creator_id].full_name,
                    email: usersMap[p.creator_id].email,
                } : undefined,
            })),
        ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        const transactions: UserTransaction[] = transactionsData.map((t: any) => ({
            id: t.id,
            type: t.type,
            status: t.status,
            amount: t.amount || 0,
            platform_fee: t.platform_fee || 0,
            net_amount: t.net_amount || 0,
            description: t.description,
            project_id: t.project_id,
            project_title: t.project_id && projectsMap[t.project_id] ? projectsMap[t.project_id].title : undefined,
            created_at: t.created_at,
        }));

        const disputes: UserDispute[] = [
            ...disputesOpened.map((d: any) => ({
                id: d.id,
                title: d.title,
                category: d.category,
                status: d.status,
                priority: d.priority,
                role: 'opener' as const,
                other_party: d.disputed_user_id && usersMap[d.disputed_user_id] ? {
                    id: usersMap[d.disputed_user_id].id,
                    name: usersMap[d.disputed_user_id].full_name,
                    email: usersMap[d.disputed_user_id].email,
                } : undefined,
                project: d.project_id && projectsMap[d.project_id] ? {
                    id: projectsMap[d.project_id].id,
                    title: projectsMap[d.project_id].title,
                } : undefined,
                created_at: d.created_at,
                resolved_at: d.resolved_at,
            })),
            ...disputesAgainst.map((d: any) => ({
                id: d.id,
                title: d.title,
                category: d.category,
                status: d.status,
                priority: d.priority,
                role: 'disputed' as const,
                other_party: d.opened_by && usersMap[d.opened_by] ? {
                    id: usersMap[d.opened_by].id,
                    name: usersMap[d.opened_by].full_name,
                    email: usersMap[d.opened_by].email,
                } : undefined,
                project: d.project_id && projectsMap[d.project_id] ? {
                    id: projectsMap[d.project_id].id,
                    title: projectsMap[d.project_id].title,
                } : undefined,
                created_at: d.created_at,
                resolved_at: d.resolved_at,
            })),
        ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        const warnings: UserWarning[] = (warningsResult.data || []).map((w: any) => ({
            id: w.id,
            warning_type: w.warning_type,
            severity: w.severity,
            reason: w.reason,
            issued_by_name: undefined,
            issued_at: w.issued_at,
            expires_at: w.expires_at,
            is_active: w.is_active,
        }));

        const reviews: UserReview[] = reviewsData.map((r: any) => ({
            id: r.id,
            project_id: r.project_id,
            project_title: r.project_id && projectsMap[r.project_id] ? projectsMap[r.project_id].title : undefined,
            reviewer_name: r.reviewer_id && usersMap[r.reviewer_id] ? usersMap[r.reviewer_id].full_name : undefined,
            rating_overall: r.rating_overall,
            rating_communication: r.rating_communication,
            rating_quality: r.rating_quality,
            rating_deadline: r.rating_deadline,
            rating_professionalism: r.rating_professionalism,
            comment: r.comment,
            created_at: r.created_at,
        }));

        // Calcular estatísticas
        const completedProjects = projects.filter(p => p.status === 'completed').length;
        const cancelledProjects = projects.filter(p => p.status === 'cancelled').length;
        const activeProjects = projects.filter(p => ['open', 'in_progress', 'in_review'].includes(p.status)).length;

        const totalSpent = user.user_type === 'creator'
            ? transactions.filter(t => t.type === 'project_payment' && t.status === 'completed').reduce((sum, t) => sum + t.amount, 0)
            : 0;

        const totalEarned = user.user_type === 'editor'
            ? transactions.filter(t => t.type === 'editor_payout' && t.status === 'completed').reduce((sum, t) => sum + t.amount, 0)
            : 0;

        const paymentHeld = projects
            .filter(p => p.payment_status === 'held' || p.payment_status === 'paid')
            .filter(p => ['in_progress', 'in_review'].includes(p.status))
            .reduce((sum, p) => sum + p.base_price, 0);

        const openDisputes = disputes.filter(d => !['resolved', 'closed'].includes(d.status)).length;

        const avgRating = reviews.length > 0
            ? reviews.reduce((sum, r) => sum + r.rating_overall, 0) / reviews.length
            : 0;

        return {
            profile: {
                id: user.id,
                email: user.email,
                user_type: user.user_type as 'creator' | 'editor',
                full_name: user.full_name || 'Sem nome',
                username: user.username || '',
                phone: user.phone,
                profile_photo_url: user.profile_photo_url,
                created_at: user.created_at,
                updated_at: user.updated_at,
            },
            metadata: metadata ? {
                approval_status: metadata.approval_status || 'approved',
                approval_notes: metadata.approval_notes,
                approved_by: metadata.approved_by,
                approved_at: metadata.approved_at,
                is_banned: metadata.is_banned || false,
                ban_reason: metadata.ban_reason,
                banned_by: metadata.banned_by,
                banned_at: metadata.banned_at,
                total_warnings: metadata.total_warnings || 0,
            } : null,
            editor_profile: editorProfile || undefined,
            subscription,
            stats: {
                total_projects: projects.length,
                active_projects: activeProjects,
                completed_projects: completedProjects,
                cancelled_projects: cancelledProjects,
                total_spent: totalSpent,
                total_earned: totalEarned,
                payment_held: paymentHeld,
                total_disputes: disputes.length,
                open_disputes: openDisputes,
                average_rating: avgRating,
                total_reviews: reviews.length,
            },
            projects,
            transactions,
            disputes,
            warnings,
            reviews,
        };
    } catch (error) {
        console.error('Erro ao buscar detalhes completos do usuário:', error);
        return null;
    }
}

// ================================================
// AÇÕES ADMINISTRATIVAS
// ================================================

export async function banUser(
    userId: string,
    adminId: string,
    reason: string
): Promise<{ success: boolean; error?: string }> {
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
        await supabase.from('admin_action_logs').insert({
            admin_id: adminId,
            action_type: 'ban_user',
            target_type: 'user',
            target_id: userId,
            reason: reason,
        });

        return { success: true };
    } catch (error: any) {
        console.error('Erro ao banir usuário:', error);
        return { success: false, error: error.message };
    }
}

export async function unbanUser(
    userId: string,
    adminId: string
): Promise<{ success: boolean; error?: string }> {
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
        await supabase.from('admin_action_logs').insert({
            admin_id: adminId,
            action_type: 'unban_user',
            target_type: 'user',
            target_id: userId,
        });

        return { success: true };
    } catch (error: any) {
        console.error('Erro ao desbanir usuário:', error);
        return { success: false, error: error.message };
    }
}

export async function issueWarning(
    userId: string,
    adminId: string,
    warningType: string,
    severity: 'low' | 'medium' | 'high',
    reason: string,
    expiresAt?: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const { error } = await supabase
            .from('user_warnings')
            .insert({
                user_id: userId,
                warning_type: warningType,
                severity: severity,
                reason: reason,
                issued_by: adminId,
                issued_at: new Date().toISOString(),
                expires_at: expiresAt,
                is_active: true,
            });

        if (error) throw error;

        // Tentar incrementar contador de warnings (ignorar erro se função não existir)
        try {
            await supabase.rpc('increment_user_warnings', { p_user_id: userId });
        } catch (rpcError) {
            console.warn('Função increment_user_warnings não encontrada:', rpcError);
        }

        // Log da ação
        await supabase.from('admin_action_logs').insert({
            admin_id: adminId,
            action_type: 'issue_warning',
            target_type: 'user',
            target_id: userId,
            reason: reason,
            action_details: { warning_type: warningType, severity },
        });

        return { success: true };
    } catch (error: any) {
        console.error('Erro ao emitir warning:', error);
        return { success: false, error: error.message };
    }
}

// ================================================
// FUNÇÕES EXISTENTES
// ================================================

// Buscar todos usuários com filtros - OTIMIZADO COM BATCH QUERIES
export async function getAdminUsersList(filters: UserFilters = {}): Promise<AdminUserListItem[]> {
    try {
        // Query base - busca da tabela users
        let query = supabase
            .from('users')
            .select('id, email, user_type, full_name, username, phone, created_at, updated_at');

        // Filtrar apenas creators e editors (não admins)
        if (filters.user_type && filters.user_type !== 'all') {
            query = query.eq('user_type', filters.user_type);
        } else {
            query = query.in('user_type', ['creator', 'editor']);
        }

        // Filtro por cadastro recente (últimos 30 dias)
        if (filters.recent_signup) {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            query = query.gte('created_at', thirtyDaysAgo.toISOString());
        }

        // Busca por nome/email
        if (filters.search) {
            query = query.or(`full_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,username.ilike.%${filters.search}%`);
        }

        // Ordenação
        const sortBy = filters.sort_by || 'created_at';
        const sortOrder = filters.sort_order || 'desc';
        query = query.order(sortBy, { ascending: sortOrder === 'asc' });

        const { data: users, error } = await query;

        if (error) throw error;

        if (!users || users.length === 0) {
            return [];
        }

        const userIds = users.map(u => u.id);

        // ====== BATCH QUERIES - Buscar tudo de uma vez ======

        // 1. Buscar metadados de todos os usuários
        const { data: metadataList } = await supabase
            .from('user_metadata_extension')
            .select('user_id, approval_status, is_banned')
            .in('user_id', userIds);

        // 2. Buscar TODOS os projetos relacionados aos usuários de uma vez
        const { data: allProjects } = await supabase
            .from('projects')
            .select('id, creator_id, assigned_editor_id, base_price, payment_status, status');

        // 3. Buscar TODAS as assinaturas ativas de uma vez
        const { data: allSubscriptions } = await supabase
            .from('editor_subscriptions')
            .select('editor_id, status')
            .eq('status', 'active');

        // ====== CRIAR MAPAS PARA ACESSO RÁPIDO ======

        const metadataMap = new Map(
            (metadataList || []).map(m => [m.user_id, m])
        );

        const subscriptionMap = new Map(
            (allSubscriptions || []).map(s => [s.editor_id, s.status])
        );

        // Processar projetos por usuário
        const userProjectsMap = new Map<string, { active: any[], total: number, paymentHeld: number }>();

        userIds.forEach(userId => {
            const userProjects = (allProjects || []).filter(
                p => p.creator_id === userId || p.assigned_editor_id === userId
            );

            const activeProjects = userProjects.filter(
                p => ['open', 'in_progress', 'in_review'].includes(p.status)
            );

            const paymentHeld = activeProjects
                .filter(p => p.payment_status === 'paid' || p.payment_status === 'held')
                .reduce((sum, p) => sum + (Number(p.base_price) || 0), 0);

            userProjectsMap.set(userId, {
                active: activeProjects,
                total: userProjects.length,
                paymentHeld
            });
        });

        // ====== MONTAR RESULTADO FINAL ======

        const enrichedUsers = users.map((user) => {
            const metadata = metadataMap.get(user.id) as any;
            const projectData = userProjectsMap.get(user.id) || { active: [], total: 0, paymentHeld: 0 };
            const subscriptionStatus = user.user_type === 'editor'
                ? (subscriptionMap.get(user.id) || 'expired')
                : null;

            return {
                id: user.id,
                name: user.full_name || user.username || 'Sem nome',
                email: user.email || '',
                phone: user.phone || '',
                user_type: user.user_type,
                created_at: user.created_at,
                last_active_at: user.updated_at || user.created_at,
                is_active: true,
                payment_held_amount: projectData.paymentHeld,
                has_pending_payment: projectData.paymentHeld > 0,
                active_projects_count: projectData.active.length,
                total_projects: projectData.total,
                approval_status: metadata?.approval_status,
                is_banned: metadata?.is_banned || false,
                subscription_status: subscriptionStatus,
            } as AdminUserListItem;
        });

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

// Obter estatísticas gerais
export async function getUsersStats() {
    try {
        // Total de usuários (creators + editors)
        const { count: totalUsers } = await supabase
            .from('users')
            .select('id', { count: 'exact', head: true })
            .in('user_type', ['creator', 'editor']);

        // Creators
        const { count: totalCreators } = await supabase
            .from('users')
            .select('id', { count: 'exact', head: true })
            .eq('user_type', 'creator');

        // Editors
        const { count: totalEditors } = await supabase
            .from('users')
            .select('id', { count: 'exact', head: true })
            .eq('user_type', 'editor');

        // Novos usuários (últimos 30 dias)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { count: newUsers } = await supabase
            .from('users')
            .select('id', { count: 'exact', head: true })
            .gte('created_at', thirtyDaysAgo.toISOString())
            .in('user_type', ['creator', 'editor']);

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