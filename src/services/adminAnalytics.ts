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

export interface QualityMetrics {
    avgRating: number;
    totalReviews: number;
    npsScore: number;
    npsBreakdown: {
        promoters: number;
        passives: number;
        detractors: number;
    };
    onTimeRate: number;
    projectsOnTime: number;
    projectsLate: number;
    avgRevisions: number;
    firstDeliveryApprovalRate: number;
    avgResponseTimeHours: number;
    repeatHireRate: number;
}

export interface QualityTrend {
    date: string;
    avgRating: number;
    npsScore: number;
    onTimeRate: number;
}

export interface EditorQualityRanking {
    editorId: string;
    editorName: string;
    avatarUrl?: string;
    avgRating: number;
    totalProjects: number;
    onTimeRate: number;
    repeatClients: number;
    avgRevisions: number;
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

// ================================================
// MÉTRICAS DE QUALIDADE
// ================================================

export async function getQualityMetrics(startDate: string, endDate: string): Promise<QualityMetrics> {
    try {
        // Tentar buscar da tabela agregada primeiro
        const { data: aggregatedData, error: aggError } = await supabase
            .from('analytics_quality_metrics')
            .select('*')
            .gte('metric_date', startDate)
            .lte('metric_date', endDate)
            .eq('period_type', 'daily');

        if (!aggError && aggregatedData && aggregatedData.length > 0) {
            // Calcular médias dos dados agregados
            const total = aggregatedData.length;
            const sum = aggregatedData.reduce((acc, curr) => ({
                avgRating: acc.avgRating + (curr.avg_rating || 0),
                totalReviews: acc.totalReviews + (curr.total_reviews || 0),
                npsScore: acc.npsScore + (curr.nps_score || 0),
                promoters: acc.promoters + (curr.nps_promoters || 0),
                passives: acc.passives + (curr.nps_passives || 0),
                detractors: acc.detractors + (curr.nps_detractors || 0),
                onTimeRate: acc.onTimeRate + (curr.on_time_rate || 0),
                projectsOnTime: acc.projectsOnTime + (curr.projects_on_time || 0),
                projectsLate: acc.projectsLate + (curr.projects_late || 0),
                avgRevisions: acc.avgRevisions + (curr.avg_revisions || 0),
                firstDeliveryApprovalRate: acc.firstDeliveryApprovalRate + (curr.first_delivery_approval_rate || 0),
                avgResponseTimeHours: acc.avgResponseTimeHours + (curr.avg_response_time_hours || 0),
                repeatHireRate: acc.repeatHireRate + (curr.repeat_hire_rate || 0),
            }), {
                avgRating: 0, totalReviews: 0, npsScore: 0, promoters: 0, passives: 0, detractors: 0,
                onTimeRate: 0, projectsOnTime: 0, projectsLate: 0, avgRevisions: 0,
                firstDeliveryApprovalRate: 0, avgResponseTimeHours: 0, repeatHireRate: 0
            });

            return {
                avgRating: sum.avgRating / total,
                totalReviews: sum.totalReviews,
                npsScore: sum.npsScore / total,
                npsBreakdown: {
                    promoters: sum.promoters,
                    passives: sum.passives,
                    detractors: sum.detractors,
                },
                onTimeRate: sum.onTimeRate / total,
                projectsOnTime: sum.projectsOnTime,
                projectsLate: sum.projectsLate,
                avgRevisions: sum.avgRevisions / total,
                firstDeliveryApprovalRate: sum.firstDeliveryApprovalRate / total,
                avgResponseTimeHours: sum.avgResponseTimeHours / total,
                repeatHireRate: sum.repeatHireRate / total,
            };
        }

        // Fallback: Calcular em tempo real se não houver dados agregados
        return await calculateQualityMetricsRealtime(startDate, endDate);

    } catch (error) {
        console.error('Erro ao buscar métricas de qualidade:', error);
        // Retornar valores default em caso de erro
        return {
            avgRating: 0,
            totalReviews: 0,
            npsScore: 0,
            npsBreakdown: { promoters: 0, passives: 0, detractors: 0 },
            onTimeRate: 0,
            projectsOnTime: 0,
            projectsLate: 0,
            avgRevisions: 0,
            firstDeliveryApprovalRate: 0,
            avgResponseTimeHours: 0,
            repeatHireRate: 0,
        };
    }
}

async function calculateQualityMetricsRealtime(startDate: string, endDate: string): Promise<QualityMetrics> {
    // Buscar reviews
    const { data: reviews } = await supabase
        .from('reviews')
        .select('rating') // Assumindo que só existe rating por enquanto, ajustar se existirem outros campos
        .gte('created_at', startDate)
        .lte('created_at', endDate);

    const totalReviews = reviews?.length || 0;
    const avgRating = totalReviews > 0
        ? reviews!.reduce((sum, r) => sum + r.rating, 0) / totalReviews
        : 0;

    // Calcular NPS (baseado no rating geral: 5 = promoter, 4 = passive, 1-3 = detractor)
    // Ajuste conforme a escala real de NPS (0-10) se disponível, aqui usando 1-5
    const promoters = reviews?.filter(r => r.rating >= 5).length || 0;
    const passives = reviews?.filter(r => r.rating === 4).length || 0;
    const detractors = reviews?.filter(r => r.rating <= 3).length || 0;
    const npsScore = totalReviews > 0
        ? ((promoters - detractors) / totalReviews) * 100
        : 0;

    // Buscar projetos completados
    const { data: projects } = await supabase
        .from('projects')
        .select('id, created_at, updated_at, status, current_revisions') // deadline_days pode não existir
        .eq('status', 'completed')
        .gte('created_at', startDate)
        .lte('created_at', endDate);

    const totalProjects = projects?.length || 0;

    // Calcular taxa de entrega no prazo (simplificado, pois deadline pode não estar disponível)
    // Assumindo que projetos com poucas revisões foram "bons" ou no prazo
    const projectsOnTime = projects?.filter(p => (p.current_revisions || 0) <= 1).length || 0;
    const projectsLate = totalProjects - projectsOnTime;
    const onTimeRate = totalProjects > 0 ? (projectsOnTime / totalProjects) * 100 : 0;

    // Média de revisões
    const avgRevisions = totalProjects > 0
        ? projects!.reduce((sum, p) => sum + (p.current_revisions || 0), 0) / totalProjects
        : 0;

    // Taxa de aprovação na primeira entrega
    const firstDeliveryApproval = projects?.filter(p => (p.current_revisions || 0) === 0).length || 0;
    const firstDeliveryApprovalRate = totalProjects > 0
        ? (firstDeliveryApproval / totalProjects) * 100
        : 0;

    return {
        avgRating,
        totalReviews,
        npsScore,
        npsBreakdown: { promoters, passives, detractors },
        onTimeRate,
        projectsOnTime,
        projectsLate,
        avgRevisions,
        firstDeliveryApprovalRate,
        avgResponseTimeHours: 0, // TODO: Implementar quando houver dados de chat/mensagens
        repeatHireRate: 0, // TODO: Implementar lógica de clientes recorrentes
    };
}

export async function getQualityTrends(startDate: string, endDate: string): Promise<QualityTrend[]> {
    try {
        const { data, error } = await supabase
            .from('analytics_quality_metrics')
            .select('metric_date, avg_rating, nps_score, on_time_rate')
            .gte('metric_date', startDate)
            .lte('metric_date', endDate)
            .eq('period_type', 'daily')
            .order('metric_date', { ascending: true });

        if (error) throw error;

        return (data || []).map(d => ({
            date: d.metric_date,
            avgRating: d.avg_rating || 0,
            npsScore: d.nps_score || 0,
            onTimeRate: d.on_time_rate || 0,
        }));
    } catch (error) {
        console.error('Erro ao buscar tendências de qualidade:', error);
        throw error;
    }
}

export async function getEditorQualityRankings(limit: number = 10): Promise<EditorQualityRanking[]> {
    try {
        const { data, error } = await supabase
            .from('analytics_editor_rankings')
            .select('*')
            .order('overall_rank', { ascending: true })
            .limit(limit);

        if (error) throw error;

        // Buscar nomes e avatares
        const editorIds = (data || []).map(r => r.editor_id);
        const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, name, avatar_url')
            .in('user_id', editorIds);

        const profilesMap = new Map<string, { name: string; avatar_url?: string }>(
            profiles?.map(p => [p.user_id, p]) as [string, { name: string; avatar_url?: string }][]
        );

        return (data || []).map(r => {
            const profile = profilesMap.get(r.editor_id);
            return {
                editorId: r.editor_id,
                editorName: profile?.name || 'Editor',
                avatarUrl: profile?.avatar_url,
                avgRating: r.avg_rating || 0,
                totalProjects: r.total_projects_completed || 0,
                onTimeRate: r.on_time_delivery_rate || 0,
                repeatClients: r.repeat_clients || 0,
                avgRevisions: r.avg_revisions || 0,
            };
        });
    } catch (error) {
        console.error('Erro ao buscar ranking de qualidade de editores:', error);
        throw error;
    }
}

export async function exportAnalyticsReport(
    startDate: string,
    endDate: string,
    reportType: string
) {
    try {
        let data: any[] = [];
        let headers: string[] = [];
        let filename = '';

        switch (reportType) {
            case 'overview':
                const overview = await getAnalyticsOverview(startDate, endDate);
                headers = ['Métrica', 'Valor'];
                data = [
                    ['Total de Usuários', overview.totalUsers],
                    ['Total de Projetos', overview.totalProjects],
                    ['Receita Total', `R$ ${overview.totalRevenue.toFixed(2)}`],
                    ['Editores Ativos', overview.activeEditors],
                    ['Taxa de Crescimento', `${overview.growthRate.toFixed(1)}%`],
                    ['Taxa de Conclusão', `${overview.completionRate.toFixed(1)}%`],
                ];
                filename = `analytics_overview_${startDate}_${endDate}`;
                break;

            case 'growth':
                const growth = await getGrowthMetrics(startDate, endDate);
                headers = ['Data', 'Novos Creators', 'Novos Editores', 'Total Signups'];
                data = growth.map(g => [g.date, g.newCreators, g.newEditors, g.totalSignups]);
                filename = `analytics_growth_${startDate}_${endDate}`;
                break;

            case 'quality':
                const quality = await getQualityMetrics(startDate, endDate);
                headers = ['Métrica', 'Valor'];
                data = [
                    ['NPS Score', quality.npsScore.toFixed(0)],
                    ['Avaliação Média', quality.avgRating.toFixed(2)],
                    ['Total de Avaliações', quality.totalReviews],
                    ['Taxa Entrega no Prazo', `${quality.onTimeRate.toFixed(1)}%`],
                    ['Taxa Aprovação 1ª Entrega', `${quality.firstDeliveryApprovalRate.toFixed(1)}%`],
                    ['Média de Revisões', quality.avgRevisions.toFixed(1)],
                    ['Taxa de Recontratação', `${quality.repeatHireRate.toFixed(1)}%`],
                ];
                filename = `analytics_quality_${startDate}_${endDate}`;
                break;

            case 'editors':
                const rankings = await getEditorRankings(50);
                headers = ['Rank', 'Editor', 'Projetos', 'Avaliação', 'Receita'];
                data = rankings.map(r => [
                    r.overallRank,
                    r.editorName,
                    r.totalProjects,
                    r.avgRating.toFixed(1),
                    `R$ ${r.totalRevenue.toFixed(2)}`,
                ]);
                filename = `analytics_editors_${startDate}_${endDate}`;
                break;

            case 'financial':
                const revenue = await getRevenueByVideoType(startDate, endDate);
                headers = ['Tipo de Vídeo', 'Receita', 'Quantidade', 'Ticket Médio'];
                data = revenue.map(r => [
                    r.videoType,
                    `R$ ${r.revenue.toFixed(2)}`,
                    r.count,
                    `R$ ${r.avgTicket.toFixed(2)}`,
                ]);
                filename = `analytics_financial_${startDate}_${endDate}`;
                break;

            default:
                throw new Error('Tipo de relatório não suportado');
        }

        // Gerar CSV
        const csvContent = [
            headers.join(','),
            ...data.map(row => row.map((cell: any) => `"${cell}"`).join(','))
        ].join('\n');

        // Download
        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${filename}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        return { success: true };
    } catch (error) {
        console.error('Erro ao exportar relatório:', error);
        throw error;
    }
}

export async function getReviewsBreakdown(startDate: string, endDate: string) {
    try {
        const { data: reviews, error } = await supabase
            .from('reviews')
            .select('rating, category') // Assumindo que existe category, se não existir, remover
            .gte('created_at', startDate)
            .lte('created_at', endDate);

        if (error) throw error;

        const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        const categoryBreakdown: Record<string, number> = {};

        reviews?.forEach(r => {
            // Rating distribution
            const rating = Math.round(r.rating);
            if (rating >= 1 && rating <= 5) {
                ratingDistribution[rating as keyof typeof ratingDistribution]++;
            }

            // Category breakdown (se existir)
            if (r.category) {
                categoryBreakdown[r.category] = (categoryBreakdown[r.category] || 0) + 1;
            }
        });

        return {
            ratingDistribution,
            categoryBreakdown
        };
    } catch (error) {
        console.error('Erro ao buscar breakdown de reviews:', error);
        // Retornar objeto vazio em caso de erro (ex: coluna category não existe)
        return {
            ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
            categoryBreakdown: {}
        };
    }
}

export async function getDeliveryPerformance(startDate: string, endDate: string) {
    try {
        const { data: funnel, error } = await supabase
            .from('analytics_project_funnel')
            .select('time_to_first_delivery, time_to_approval, total_revisions')
            .gte('created_at', startDate)
            .lte('created_at', endDate);

        if (error) throw error;

        const total = funnel?.length || 0;
        if (total === 0) {
            return {
                avgTimeToFirstDelivery: 0,
                avgTimeToApproval: 0,
                revisionsDistribution: { 0: 0, 1: 0, 2: 0, '3+': 0 }
            };
        }

        // Calcular médias (convertendo interval para horas/dias se necessário)
        // O Supabase retorna interval como string ISO ou objeto. Vamos assumir string ISO 8601 duration ou similar.
        // Simplificação: vamos contar apenas a distribuição de revisões que é inteiro

        const revisionsDistribution = { 0: 0, 1: 0, 2: 0, '3+': 0 };
        funnel?.forEach(f => {
            const rev = f.total_revisions || 0;
            if (rev === 0) revisionsDistribution[0]++;
            else if (rev === 1) revisionsDistribution[1]++;
            else if (rev === 2) revisionsDistribution[2]++;
            else revisionsDistribution['3+']++;
        });

        return {
            avgTimeToFirstDelivery: 0, // Implementar parse de interval se necessário
            avgTimeToApproval: 0,
            revisionsDistribution
        };
    } catch (error) {
        console.error('Erro ao buscar performance de entrega:', error);
        throw error;
    }
}
