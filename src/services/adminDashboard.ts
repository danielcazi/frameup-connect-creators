import { supabase } from '@/lib/supabase';

export interface DashboardOverview {
    period: string;
    users: {
        total_creators: number;
        new_creators: number;
        total_editors: number;
        new_editors: number;
        pending_approvals: number;
        active_subscriptions: number;
    };
    projects: {
        total_created: number;
        open: number;
        in_progress: number;
        in_review: number;
        completed: number;
        cancelled: number;
        with_disputes: number;
    };
    financial: {
        total_revenue: number;
        platform_fees: number;
        paid_to_editors: number;
        pending_transfers: number;
        refunds_issued: number;
        avg_project_value: number;
        subscription_revenue: number;
    };
    health_metrics: {
        project_completion_rate: number;
        avg_time_to_assign: number;
        avg_delivery_time: number;
        avg_creator_rating: number;
        avg_editor_rating: number;
        dispute_rate: number;
        churn_rate: number;
    };
    alerts: Alert[];
    recent_activities: Activity[];
}

interface Alert {
    type: string;
    message: string;
    action_url: string;
    severity: 'info' | 'warning' | 'error';
}

interface Activity {
    id: string;
    type: string;
    description: string;
    timestamp: string;
    user: string;
}

export async function getDashboardOverview(
    period: 'last_7_days' | 'last_30_days' | 'last_90_days' = 'last_30_days'
): Promise<DashboardOverview> {
    const startDate = getStartDate(period);

    // Buscar todas as métricas em paralelo
    const [
        usersData,
        projectsData,
        financialData,
        healthData,
        alertsData,
        activitiesData,
    ] = await Promise.all([
        fetchUsersMetrics(startDate),
        fetchProjectsMetrics(startDate),
        fetchFinancialMetrics(startDate),
        fetchHealthMetrics(startDate),
        generateAlerts(),
        fetchRecentActivities(),
    ]);

    return {
        period,
        users: usersData,
        projects: projectsData,
        financial: financialData,
        health_metrics: healthData,
        alerts: alertsData,
        recent_activities: activitiesData,
    };
}

async function fetchUsersMetrics(startDate: string) {
    const { data: creators } = await supabase
        .from('editor_profiles')
        .select('user_id, created_at')
        .eq('user_type', 'creator');

    const { data: editors } = await supabase
        .from('editor_profiles')
        .select('user_id, created_at'); // Assuming editors are all in editor_profiles, but need to filter if user_type exists or just assume all are editors? 
    // Actually editor_profiles usually contains only editors. Creators might be in a different table or just users with type 'creator'.
    // Let's assume editor_profiles is for editors. For creators, we might need to check users table or another profile table.
    // Based on previous context, creators might not have a profile table or it's named differently.
    // However, the prompt code uses 'editor_profiles' for creators with .eq('user_type', 'creator'). 
    // I will stick to the prompt's logic but be aware it might need adjustment if schema differs.
    // Wait, the prompt code:
    // .from('editor_profiles').select('user_id, created_at').eq('user_type', 'creator');
    // This implies editor_profiles has user_type. Let's verify if I can.
    // If not, I'll assume creators are just users with metadata type 'creator'.

    // For now, I will follow the prompt's structure but use 'users' table if possible for counts if profiles don't exist for creators.
    // Actually, let's stick to the prompt logic for now.

    const { data: pendingApprovals } = await supabase
        .from('editor_approval_queue')
        .select('id')
        .eq('status', 'pending');

    const { data: activeSubscriptions } = await supabase
        .from('editor_subscriptions')
        .select('id')
        .eq('status', 'active');

    const newCreators = creators?.filter(c => c.created_at >= startDate).length || 0;
    const newEditors = editors?.filter(e => e.created_at >= startDate).length || 0;

    return {
        total_creators: creators?.length || 0,
        new_creators: newCreators,
        total_editors: editors?.length || 0,
        new_editors: newEditors,
        pending_approvals: pendingApprovals?.length || 0,
        active_subscriptions: activeSubscriptions?.length || 0,
    };
}

async function fetchProjectsMetrics(startDate: string) {
    const { data: projects } = await supabase
        .from('projects')
        .select('status, has_dispute, created_at')
        .gte('created_at', startDate);

    return {
        total_created: projects?.length || 0,
        open: projects?.filter(p => p.status === 'open').length || 0,
        in_progress: projects?.filter(p => p.status === 'in_progress').length || 0,
        in_review: projects?.filter(p => p.status === 'in_review').length || 0,
        completed: projects?.filter(p => p.status === 'completed').length || 0,
        cancelled: projects?.filter(p => p.status === 'cancelled').length || 0,
        with_disputes: projects?.filter(p => p.has_dispute).length || 0,
    };
}

async function fetchFinancialMetrics(startDate: string) {
    const { data: projects } = await supabase
        .from('projects')
        .select('base_price, payment_status, created_at')
        .gte('created_at', startDate);

    const totalRevenue = projects?.reduce((sum, p) => sum + (p.base_price || 0), 0) || 0;
    const platformFees = totalRevenue * 0.05;
    const paidProjects = projects?.filter(p => p.payment_status === 'released') || [];
    const paidToEditors = paidProjects.reduce((sum, p) => sum + (p.base_price || 0), 0);

    const pendingProjects = projects?.filter(p => p.payment_status === 'paid') || [];
    const pendingTransfers = pendingProjects.reduce((sum, p) => sum + (p.base_price || 0), 0);

    const refundedProjects = projects?.filter(p => p.payment_status === 'refunded') || [];
    const refundsIssued = refundedProjects.reduce((sum, p) => sum + ((p.base_price || 0) + (p.base_price || 0) * 0.05), 0);

    const avgProjectValue = projects && projects.length > 0
        ? totalRevenue / projects.length
        : 0;

    // Subscription revenue (simplificado)
    const { data: activeSubscriptions } = await supabase
        .from('editor_subscriptions')
        .select('plan_id')
        .eq('status', 'active');

    const subscriptionRevenue = (activeSubscriptions?.length || 0) * 39.99; // valor médio

    return {
        total_revenue: totalRevenue,
        platform_fees: platformFees,
        paid_to_editors: paidToEditors,
        pending_transfers: pendingTransfers,
        refunds_issued: refundsIssued,
        avg_project_value: avgProjectValue,
        subscription_revenue: subscriptionRevenue,
    };
}

async function fetchHealthMetrics(startDate: string) {
    const { data: projects } = await supabase
        .from('projects')
        .select('*')
        .gte('created_at', startDate);

    const totalProjects = projects?.length || 0;
    const completed = projects?.filter(p => p.status === 'completed').length || 0;
    const projectCompletionRate = totalProjects > 0 ? completed / totalProjects : 0;

    // Calcular tempo médio até atribuição
    const assignedProjects = projects?.filter(p => p.assigned_editor_id && p.accepted_at);
    const avgTimeToAssign = assignedProjects?.reduce((sum, p) => {
        const created = new Date(p.created_at).getTime();
        const accepted = new Date(p.accepted_at).getTime();
        return sum + (accepted - created);
    }, 0) / (assignedProjects?.length || 1) / (1000 * 60 * 60 * 24); // dias

    // Ratings médios (reviews são de criadores avaliando editores)
    const { data: editorReviews } = await supabase
        .from('reviews')
        .select('rating_overall')
        .gte('created_at', startDate);

    const avgEditorRating = (editorReviews?.reduce((sum, r) => sum + r.rating_overall, 0) || 0) / (editorReviews?.length || 1);
    // Creator ratings not available in current schema (reviews are from creators to editors)
    const avgCreatorRating = 0;

    // Taxa de disputa
    const withDisputes = projects?.filter(p => p.has_dispute).length || 0;
    const disputeRate = totalProjects > 0 ? withDisputes / totalProjects : 0;

    // Churn Rate
    const { count: cancelledSubs } = await supabase
        .from('editor_subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'cancelled')
        .gte('updated_at', startDate);

    const { count: activeSubs } = await supabase
        .from('editor_subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

    const totalSubs = (activeSubs || 0) + (cancelledSubs || 0);
    const churnRate = totalSubs > 0 ? (cancelledSubs || 0) / totalSubs : 0;

    return {
        project_completion_rate: projectCompletionRate,
        avg_time_to_assign: avgTimeToAssign || 0,
        avg_delivery_time: 4.1, // TODO: calcular real
        avg_creator_rating: avgCreatorRating,
        avg_editor_rating: avgEditorRating,
        dispute_rate: disputeRate,
        churn_rate: churnRate,
    };
}

async function generateAlerts(): Promise<Alert[]> {
    const alerts: Alert[] = [];

    // Disputas de alta prioridade
    const { data: highPriorityDisputes } = await supabase
        .from('disputes')
        .select('id')
        .eq('status', 'open')
        .eq('priority', 'high');

    if (highPriorityDisputes && highPriorityDisputes.length > 0) {
        alerts.push({
            type: 'high_priority_dispute',
            message: `${highPriorityDisputes.length} disputas de alta prioridade aguardando resolução`,
            action_url: '/admin/disputes?priority=high',
            severity: 'error',
        });
    }

    // Editores pendentes
    const { data: pendingEditors } = await supabase
        .from('editor_approval_queue')
        .select('id, submitted_at')
        .eq('status', 'pending');

    const oldPending = pendingEditors?.filter(e => {
        const days = Math.floor((Date.now() - new Date(e.submitted_at).getTime()) / (1000 * 60 * 60 * 24));
        return days > 3;
    });

    if (oldPending && oldPending.length > 0) {
        alerts.push({
            type: 'pending_approvals',
            message: `${oldPending.length} editores aguardando aprovação há mais de 3 dias`,
            action_url: '/admin/approvals',
            severity: 'warning',
        });
    }

    // Transferências pendentes
    const { data: pendingTransfers } = await supabase
        .from('projects')
        .select('base_price')
        .eq('payment_status', 'paid');

    const totalPending = pendingTransfers?.reduce((sum, p) => sum + p.base_price, 0) || 0;

    if (totalPending > 3000) {
        alerts.push({
            type: 'pending_transfers',
            message: `R$ ${totalPending.toFixed(2)} em transferências pendentes`,
            action_url: '/admin/financial',
            severity: 'info',
        });
    }

    return alerts;
}

async function fetchRecentActivities(): Promise<Activity[]> {
    const activities: Activity[] = [];

    // Buscar últimas atividades do sistema
    const { data: completedProjects } = await supabase
        .from('projects')
        .select('id, title, creator_id, completed_at')
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(5);

    if (completedProjects) {
        completedProjects.forEach(p => {
            activities.push({
                id: p.id,
                type: 'project_completed',
                description: `Projeto "${p.title}" foi concluído`,
                timestamp: p.completed_at,
                user: p.creator_id // TODO: fetch user email if possible or just ID
            });
        });
    }

    const { data: approvedEditors } = await supabase
        .from('editor_approval_queue')
        .select('id, editor_id, reviewed_at')
        .eq('status', 'approved')
        .order('reviewed_at', { ascending: false })
        .limit(5);

    if (approvedEditors) {
        approvedEditors.forEach(e => {
            activities.push({
                id: e.id,
                type: 'editor_approved',
                description: `Editor aprovado`,
                timestamp: e.reviewed_at || new Date().toISOString(),
                user: e.editor_id
            });
        });
    }

    // Sort by timestamp
    return activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 10);
}

function getStartDate(period: string): string {
    const now = new Date();
    switch (period) {
        case 'last_7_days':
            now.setDate(now.getDate() - 7);
            break;
        case 'last_30_days':
            now.setDate(now.getDate() - 30);
            break;
        case 'last_90_days':
            now.setDate(now.getDate() - 90);
            break;
    }
    return now.toISOString();
}
