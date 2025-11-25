import { supabase } from '@/lib/supabase';

// ================================================
// TIPOS
// ================================================

export interface AnalyticsOverview {
    totalUsers: number;
    totalProjects: number;
    totalRevenue: number;
    activeEditors: number;
    growthRate: number;
    completionRate: number;
}

export interface GrowthMetrics {
    date: string;
    newCreators: number;
    newEditors: number;
    totalSignups: number;
}

export interface ProjectFunnelMetrics {
    stage: string;
    count: number;
    avgTime: number;
    dropoffRate: number;
}

export interface EditorRanking {
    editorId: string;
    editorName: string;
    totalProjects: number;
    avgRating: number;
    totalRevenue: number;
    overallRank: number;
}

export interface CohortData {
    cohortMonth: string;
    userCount: number;
    retention: { [key: string]: number };
}

export interface RevenueByVideoType {
    videoType: string;
    revenue: number;
    count: number;
    avgTicket: number;
}

// ================================================
// OVERVIEW
// ================================================

export async function getAnalyticsOverview(startDate: string, endDate: string) {
    try {
        // Total de usuários
        const { count: totalUsers } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true });

        // Total de projetos
        const { count: totalProjects } = await supabase
            .from('projects')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', startDate)
            .lte('created_at', endDate);

        // Receita total
        const { data: revenueData } = await supabase
            .from('projects')
            .select('base_price')
            .eq('payment_status', 'paid')
            .gte('created_at', startDate)
            .lte('created_at', endDate);

        const totalRevenue = revenueData?.reduce((sum, p) => sum + (p.base_price || 0), 0) || 0;

        // Editores ativos (com pelo menos 1 projeto no período)
        const { data: activeEditorsData } = await supabase
            .from('projects')
            .select('assigned_editor_id')
            .not('assigned_editor_id', 'is', null)
            .gte('created_at', startDate)
            .lte('created_at', endDate);

        const activeEditors = new Set(activeEditorsData?.map(p => p.assigned_editor_id)).size;

        // Taxa de crescimento (comparar com período anterior)
        const periodDays = Math.ceil(
            (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)
        );
        const previousStart = new Date(new Date(startDate).getTime() - periodDays * 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0];
        const previousEnd = new Date(new Date(endDate).getTime() - periodDays * 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0];

        const { count: previousUsers } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', previousStart)
            .lte('created_at', previousEnd);

        const { count: currentUsers } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', startDate)
            .lte('created_at', endDate);

        const growthRate = previousUsers
            ? ((currentUsers! - previousUsers) / previousUsers) * 100
            : 0;

        // Taxa de conclusão
        const { count: completedProjects } = await supabase
            .from('projects')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'completed')
            .gte('created_at', startDate)
            .lte('created_at', endDate);

        const completionRate = totalProjects ? (completedProjects! / totalProjects) * 100 : 0;

        return {
            totalUsers: totalUsers || 0,
            totalProjects: totalProjects || 0,
            totalRevenue,
            activeEditors,
            growthRate,
            completionRate,
        };
    } catch (error) {
        console.error('Erro ao buscar overview:', error);
        throw error;
    }
}

// ================================================
// CRESCIMENTO
// ================================================

export async function getGrowthMetrics(startDate: string, endDate: string): Promise<GrowthMetrics[]> {
    try {
        const { data, error } = await supabase
            .from('analytics_daily_metrics')
            .select('metric_date, new_creators, new_editors, total_signups')
            .gte('metric_date', startDate)
            .lte('metric_date', endDate)
            .order('metric_date', { ascending: true });

        if (error) throw error;

        return (data || []).map((d) => ({
            date: d.metric_date,
            newCreators: d.new_creators,
            newEditors: d.new_editors,
            totalSignups: d.total_signups,
        }));
    } catch (error) {
        console.error('Erro ao buscar métricas de crescimento:', error);
        throw error;
    }
}

// ================================================
// FUNIL DE PROJETOS
// ================================================

export async function getProjectFunnelMetrics(
    startDate: string,
    endDate: string
): Promise<ProjectFunnelMetrics[]> {
    try {
        const { data, error } = await supabase
            .from('analytics_project_funnel')
            .select('*')
            .gte('created_at', startDate)
            .lte('created_at', endDate);

        if (error) throw error;

        const funnel = data || [];

        // Calcular métricas por estágio
        const stages = [
            { name: 'Criado', count: funnel.length },
            {
                name: 'Primeira Candidatura',
                count: funnel.filter((p) => p.first_application_at).length,
            },
            { name: 'Atribuído', count: funnel.filter((p) => p.assigned_at).length },
            { name: 'Primeira Entrega', count: funnel.filter((p) => p.first_delivery_at).length },
            { name: 'Aprovado', count: funnel.filter((p) => p.approved_at).length },
            { name: 'Concluído', count: funnel.filter((p) => p.completed_at).length },
        ];

        return stages.map((stage, index) => {
            const avgTime =
                index > 0
                    ? funnel
                        .filter((p) => {
                            if (stage.name === 'Primeira Candidatura') return p.time_to_first_application;
                            if (stage.name === 'Atribuído') return p.time_to_assignment;
                            if (stage.name === 'Primeira Entrega') return p.time_to_first_delivery;
                            if (stage.name === 'Aprovado') return p.time_to_approval;
                            if (stage.name === 'Concluído') return p.total_time_to_completion;
                            return false;
                        })
                        .reduce((sum, p) => {
                            if (stage.name === 'Primeira Candidatura')
                                return sum + (p.time_to_first_application || 0);
                            if (stage.name === 'Atribuído') return sum + (p.time_to_assignment || 0);
                            if (stage.name === 'Primeira Entrega') return sum + (p.time_to_first_delivery || 0);
                            if (stage.name === 'Aprovado') return sum + (p.time_to_approval || 0);
                            if (stage.name === 'Concluído') return sum + (p.total_time_to_completion || 0);
                            return sum;
                        }, 0) / stage.count
                    : 0;

            const dropoffRate =
                index > 0 ? ((stages[index - 1].count - stage.count) / stages[index - 1].count) * 100 : 0;

            return {
                stage: stage.name,
                count: stage.count,
                avgTime,
                dropoffRate,
            };
        });
    } catch (error) {
        console.error('Erro ao buscar funil de projetos:', error);
        throw error;
    }
}

// ================================================
// RANKING DE EDITORES
// ================================================

export async function getEditorRankings(limit: number = 10): Promise<EditorRanking[]> {
    try {
        const { data, error } = await supabase
            .from('analytics_editor_rankings')
            .select(`
        editor_id,
        total_projects_completed,
        avg_rating,
        total_revenue_generated,
        overall_rank
      `)
            .order('overall_rank', { ascending: true })
            .limit(limit);

        if (error) throw error;

        // Buscar nomes dos editores
        const editorIds = (data || []).map((r) => r.editor_id);
        const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, name')
            .in('user_id', editorIds);

        const profilesMap = new Map(profiles?.map((p) => [p.user_id, p.name]));

        return (data || []).map((r) => ({
            editorId: r.editor_id,
            editorName: profilesMap.get(r.editor_id) || 'Editor',
            totalProjects: r.total_projects_completed,
            avgRating: r.avg_rating,
            totalRevenue: r.total_revenue_generated,
            overallRank: r.overall_rank,
        }));
    } catch (error) {
        console.error('Erro ao buscar ranking de editores:', error);
        throw error;
    }
}

// ================================================
// COHORT ANALYSIS
// ================================================

export async function getCohortAnalysis(): Promise<CohortData[]> {
    try {
        const { data, error } = await supabase
            .from('analytics_user_cohorts')
            .select('cohort_month, monthly_activity')
            .order('cohort_month', { ascending: false })
            .limit(12);

        if (error) throw error;

        // Agrupar por cohort_month
        const cohortMap = new Map<string, any[]>();
        (data || []).forEach((row) => {
            const month = row.cohort_month;
            if (!cohortMap.has(month)) {
                cohortMap.set(month, []);
            }
            cohortMap.get(month)!.push(row);
        });

        return Array.from(cohortMap.entries()).map(([month, users]) => {
            const userCount = users.length;
            const retention: { [key: string]: number } = {};

            // Calcular retenção para cada mês
            for (let i = 0; i <= 12; i++) {
                const activeUsers = users.filter((u) => u.monthly_activity[i.toString()] === true).length;
                retention[i.toString()] = userCount > 0 ? (activeUsers / userCount) * 100 : 0;
            }

            return {
                cohortMonth: month,
                userCount,
                retention,
            };
        });
    } catch (error) {
        console.error('Erro ao buscar análise de cohort:', error);
        throw error;
    }
}

// ================================================
// RECEITA POR TIPO DE VÍDEO
// ================================================

export async function getRevenueByVideoType(
    startDate: string,
    endDate: string
): Promise<RevenueByVideoType[]> {
    try {
        const { data, error } = await supabase
            .from('projects')
            .select('video_type, base_price')
            .eq('payment_status', 'paid')
            .gte('created_at', startDate)
            .lte('created_at', endDate);

        if (error) throw error;

        // Agrupar por tipo de vídeo
        const videoTypeMap = new Map<string, { revenue: number; count: number }>();

        (data || []).forEach((project) => {
            const type = project.video_type || 'Outros';
            if (!videoTypeMap.has(type)) {
                videoTypeMap.set(type, { revenue: 0, count: 0 });
            }
            const current = videoTypeMap.get(type)!;
            current.revenue += project.base_price || 0;
            current.count += 1;
        });

        return Array.from(videoTypeMap.entries()).map(([videoType, data]) => ({
            videoType,
            revenue: data.revenue,
            count: data.count,
            avgTicket: data.count > 0 ? data.revenue / data.count : 0,
        }));
    } catch (error) {
        console.error('Erro ao buscar receita por tipo de vídeo:', error);
        throw error;
    }
}

// ================================================
// TRACK EVENT (para uso futuro)
// ================================================

export async function trackEvent(
    userId: string,
    eventName: string,
    eventCategory: string,
    properties: any = {},
    userType?: string
) {
    try {
        const { data, error } = await supabase.rpc('track_event', {
            p_user_id: userId,
            p_event_name: eventName,
            p_event_category: eventCategory,
            p_properties: properties,
            p_user_type: userType,
        });

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Erro ao registrar evento:', error);
        throw error;
    }
}

// ================================================
// ATUALIZAR MÉTRICAS DIÁRIAS
// ================================================

export async function updateDailyMetrics(targetDate?: string) {
    try {
        const { error } = await supabase.rpc('update_daily_metrics', {
            target_date: targetDate || new Date().toISOString().split('T')[0],
        });

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Erro ao atualizar métricas diárias:', error);
        throw error;
    }
}
