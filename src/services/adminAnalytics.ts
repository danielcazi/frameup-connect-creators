import { supabase } from '@/lib/supabase';

// ============ TYPES ============

export interface AnalyticsOverview {
    totalUsers: number;
    totalCreators: number;
    totalEditors: number;
    totalProjects: number;
    totalRevenue: number;
    platformRevenue: number;
    completionRate: number;
    avgTicket: number;
    growthRate: number;
}

export interface GrowthMetrics {
    date: string;
    newCreators: number;
    newEditors: number;
    totalUsers: number;
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
    cohort: string;
    week1: number;
    week2: number;
    week3: number;
    week4: number;
    month2: number;
    month3: number;
}

export interface RevenueByVideoType {
    videoType: string;
    revenue: number;
    count: number;
}

export interface QualityMetrics {
    npsScore: number;
    npsBreakdown: {
        promoters: number;
        passives: number;
        detractors: number;
    };
    avgRating: number;
    totalReviews: number;
    onTimeRate: number;
    projectsOnTime: number;
    projectsLate: number;
    firstDeliveryApprovalRate: number;
    avgRevisions: number;
    repeatHireRate: number;
    avgResponseTimeHours: number;
}

export interface QualityTrend {
    date: string;
    avgRating: number;
    npsScore: number;
}

export interface EditorQualityRanking {
    editorId: string;
    editorName: string;
    avgRating: number;
    totalProjects: number;
    onTimeRate: number;
    repeatClients: number;
}

// ============ OVERVIEW ============

export async function getAnalyticsOverview(startDate: string, endDate: string): Promise<AnalyticsOverview> {
    try {
        // Total de usuários (creators + editors)
        const { count: totalUsers } = await supabase
            .from('users')
            .select('id', { count: 'exact', head: true })
            .in('user_type', ['creator', 'editor']);

        const { count: totalCreators } = await supabase
            .from('users')
            .select('id', { count: 'exact', head: true })
            .eq('user_type', 'creator');

        const { count: totalEditors } = await supabase
            .from('users')
            .select('id', { count: 'exact', head: true })
            .eq('user_type', 'editor');

        // Projetos no período
        const { data: projects } = await supabase
            .from('projects')
            .select('id, status, total_price, platform_fee, payment_status')
            .gte('created_at', startDate)
            .lte('created_at', endDate);

        const totalProjects = projects?.length || 0;

        const paidProjects = projects?.filter(p => p.payment_status === 'paid') || [];
        const totalRevenue = paidProjects.reduce((sum, p) => sum + (Number(p.total_price) || 0), 0);
        const platformRevenue = paidProjects.reduce((sum, p) => sum + (Number(p.platform_fee) || 0), 0);

        const completedProjects = projects?.filter(p => p.status === 'completed') || [];
        const completionRate = totalProjects > 0 ? (completedProjects.length / totalProjects) * 100 : 0;

        const avgTicket = paidProjects.length > 0 ? totalRevenue / paidProjects.length : 0;

        // Calcular crescimento vs período anterior
        const startPrev = new Date(startDate);
        const endPrev = new Date(endDate);
        const diff = endPrev.getTime() - startPrev.getTime();
        startPrev.setTime(startPrev.getTime() - diff);
        endPrev.setTime(endPrev.getTime() - diff);

        const { count: prevUsers } = await supabase
            .from('users')
            .select('id', { count: 'exact', head: true })
            .in('user_type', ['creator', 'editor'])
            .lte('created_at', endPrev.toISOString());

        const growthRate = prevUsers && prevUsers > 0
            ? (((totalUsers || 0) - prevUsers) / prevUsers) * 100
            : 0;

        return {
            totalUsers: totalUsers || 0,
            totalCreators: totalCreators || 0,
            totalEditors: totalEditors || 0,
            totalProjects,
            totalRevenue,
            platformRevenue,
            completionRate,
            avgTicket,
            growthRate,
        };
    } catch (error) {
        console.error('Erro ao buscar overview:', error);
        throw error;
    }
}

// ============ GROWTH ============

export async function getGrowthMetrics(startDate: string, endDate: string): Promise<GrowthMetrics[]> {
    try {
        const { data: users } = await supabase
            .from('users')
            .select('user_type, created_at')
            .in('user_type', ['creator', 'editor'])
            .gte('created_at', startDate)
            .lte('created_at', endDate)
            .order('created_at', { ascending: true });

        // Agrupar por dia
        const dailyData: Record<string, { creators: number; editors: number }> = {};

        users?.forEach(user => {
            const date = user.created_at.split('T')[0];
            if (!dailyData[date]) {
                dailyData[date] = { creators: 0, editors: 0 };
            }
            if (user.user_type === 'creator') {
                dailyData[date].creators++;
            } else {
                dailyData[date].editors++;
            }
        });

        // Converter para array e calcular total acumulado
        let totalUsers = 0;
        return Object.entries(dailyData).map(([date, data]) => {
            totalUsers += data.creators + data.editors;
            return {
                date: new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
                newCreators: data.creators,
                newEditors: data.editors,
                totalUsers,
            };
        });
    } catch (error) {
        console.error('Erro ao buscar growth metrics:', error);
        return [];
    }
}

// ============ PROJECTS FUNNEL ============

export async function getProjectFunnelMetrics(startDate: string, endDate: string): Promise<ProjectFunnelMetrics[]> {
    try {
        const { data: projects } = await supabase
            .from('projects')
            .select('status, created_at, published_at, completed_at')
            .gte('created_at', startDate)
            .lte('created_at', endDate);

        const statusCounts: Record<string, number> = {
            draft: 0,
            open: 0,
            in_progress: 0,
            in_review: 0,
            completed: 0,
            cancelled: 0,
        };

        projects?.forEach(p => {
            if (statusCounts[p.status] !== undefined) {
                statusCounts[p.status]++;
            }
        });

        const total = projects?.length || 1;
        const stages = [
            { stage: 'Rascunho', status: 'draft' },
            { stage: 'Publicado', status: 'open' },
            { stage: 'Em Andamento', status: 'in_progress' },
            { stage: 'Em Revisão', status: 'in_review' },
            { stage: 'Concluído', status: 'completed' },
        ];

        let previousCount = total;
        return stages.map(({ stage, status }) => {
            const count = statusCounts[status] || 0;
            const dropoffRate = previousCount > 0 ? ((previousCount - count) / previousCount) * 100 : 0;
            previousCount = count;

            return {
                stage,
                count,
                avgTime: Math.random() * 24 + 1, // TODO: Calcular tempo real entre estágios
                dropoffRate: Math.max(0, dropoffRate),
            };
        });
    } catch (error) {
        console.error('Erro ao buscar funnel:', error);
        return [];
    }
}

// ============ EDITOR RANKINGS ============

export async function getEditorRankings(limit: number = 10): Promise<EditorRanking[]> {
    try {
        // Buscar editores
        const { data: editors } = await supabase
            .from('users')
            .select('id, full_name, email')
            .eq('user_type', 'editor');

        if (!editors || editors.length === 0) return [];

        // Para cada editor, buscar métricas
        const rankings = await Promise.all(
            editors.map(async (editor) => {
                // Projetos concluídos
                const { data: projects } = await supabase
                    .from('projects')
                    .select('id, editor_receives')
                    .eq('assigned_editor_id', editor.id)
                    .eq('status', 'completed');

                const totalProjects = projects?.length || 0;
                const totalRevenue = projects?.reduce((sum, p) => sum + (Number(p.editor_receives) || 0), 0) || 0;

                // Avaliações
                const { data: reviews } = await supabase
                    .from('reviews')
                    .select('rating_overall')
                    .eq('reviewee_id', editor.id);

                const avgRating = reviews && reviews.length > 0
                    ? reviews.reduce((sum, r) => sum + r.rating_overall, 0) / reviews.length
                    : 0;

                return {
                    editorId: editor.id,
                    editorName: editor.full_name || editor.email || 'Editor',
                    totalProjects,
                    avgRating,
                    totalRevenue,
                    overallRank: 0, // Será calculado abaixo
                };
            })
        );

        // Ordenar por projetos e atribuir rank
        return rankings
            .sort((a, b) => b.totalProjects - a.totalProjects)
            .slice(0, limit)
            .map((editor, index) => ({
                ...editor,
                overallRank: index + 1,
            }));
    } catch (error) {
        console.error('Erro ao buscar rankings:', error);
        return [];
    }
}

// ============ COHORT ANALYSIS ============

export async function getCohortAnalysis(): Promise<CohortData[]> {
    try {
        // Simplificado - retorna dados de exemplo
        // TODO: Implementar análise de cohort real
        const months = ['Nov/2025', 'Out/2025', 'Set/2025'];

        return months.map(cohort => ({
            cohort,
            week1: 100,
            week2: Math.floor(Math.random() * 30) + 50,
            week3: Math.floor(Math.random() * 20) + 40,
            week4: Math.floor(Math.random() * 15) + 35,
            month2: Math.floor(Math.random() * 15) + 25,
            month3: Math.floor(Math.random() * 10) + 15,
        }));
    } catch (error) {
        console.error('Erro ao buscar cohort:', error);
        return [];
    }
}

// ============ REVENUE BY VIDEO TYPE ============

export async function getRevenueByVideoType(startDate: string, endDate: string): Promise<RevenueByVideoType[]> {
    try {
        const { data: projects } = await supabase
            .from('projects')
            .select('video_type, total_price')
            .eq('payment_status', 'paid')
            .gte('created_at', startDate)
            .lte('created_at', endDate);

        const revenueByType: Record<string, { revenue: number; count: number }> = {};

        projects?.forEach(p => {
            const type = p.video_type || 'Outro';
            if (!revenueByType[type]) {
                revenueByType[type] = { revenue: 0, count: 0 };
            }
            revenueByType[type].revenue += Number(p.total_price) || 0;
            revenueByType[type].count++;
        });

        return Object.entries(revenueByType).map(([videoType, data]) => ({
            videoType,
            revenue: data.revenue,
            count: data.count,
        }));
    } catch (error) {
        console.error('Erro ao buscar receita por tipo:', error);
        return [];
    }
}

// ============ QUALITY METRICS ============

export async function getQualityMetrics(startDate: string, endDate: string): Promise<QualityMetrics> {
    try {
        // Buscar reviews no período
        const { data: reviews } = await supabase
            .from('reviews')
            .select('rating_overall')
            .gte('created_at', startDate)
            .lte('created_at', endDate);

        const totalReviews = reviews?.length || 0;
        const avgRating = totalReviews > 0
            ? reviews!.reduce((sum, r) => sum + r.rating_overall, 0) / totalReviews
            : 0;

        // Calcular NPS (rating 5 = promoter, 3-4 = passive, 1-2 = detractor)
        const promoters = reviews?.filter(r => r.rating_overall === 5).length || 0;
        const passives = reviews?.filter(r => r.rating_overall >= 3 && r.rating_overall <= 4).length || 0;
        const detractors = reviews?.filter(r => r.rating_overall <= 2).length || 0;

        const npsScore = totalReviews > 0
            ? ((promoters - detractors) / totalReviews) * 100
            : 0;

        // Buscar projetos para métricas de entrega
        const { data: projects } = await supabase
            .from('projects')
            .select('status, completed_at, estimated_delivery_days, created_at, current_revision')
            .eq('status', 'completed')
            .gte('created_at', startDate)
            .lte('created_at', endDate);

        const completedProjects = projects?.length || 0;

        // Simplificado - considerar on time se foi completado
        const projectsOnTime = Math.floor(completedProjects * 0.85); // 85% estimado
        const projectsLate = completedProjects - projectsOnTime;
        const onTimeRate = completedProjects > 0 ? (projectsOnTime / completedProjects) * 100 : 0;

        // Média de revisões
        const avgRevisions = projects && projects.length > 0
            ? projects.reduce((sum, p) => sum + (p.current_revision || 0), 0) / projects.length
            : 0;

        // Taxa de aprovação na 1ª entrega (projetos com 0 ou 1 revisão)
        const firstApproval = projects?.filter(p => (p.current_revision || 0) <= 1).length || 0;
        const firstDeliveryApprovalRate = completedProjects > 0
            ? (firstApproval / completedProjects) * 100
            : 0;

        return {
            npsScore,
            npsBreakdown: { promoters, passives, detractors },
            avgRating,
            totalReviews,
            onTimeRate,
            projectsOnTime,
            projectsLate,
            firstDeliveryApprovalRate,
            avgRevisions,
            repeatHireRate: 25, // TODO: Calcular real
            avgResponseTimeHours: 2.5, // TODO: Calcular real
        };
    } catch (error) {
        console.error('Erro ao buscar quality metrics:', error);
        throw error;
    }
}

// ============ QUALITY TRENDS ============

export async function getQualityTrends(startDate: string, endDate: string): Promise<QualityTrend[]> {
    try {
        const { data: reviews } = await supabase
            .from('reviews')
            .select('rating_overall, created_at')
            .gte('created_at', startDate)
            .lte('created_at', endDate)
            .order('created_at', { ascending: true });

        // Agrupar por semana
        const weeklyData: Record<string, { ratings: number[]; count: number }> = {};

        reviews?.forEach(review => {
            const date = new Date(review.created_at);
            const weekStart = new Date(date.setDate(date.getDate() - date.getDay()));
            const weekKey = weekStart.toISOString().split('T')[0];

            if (!weeklyData[weekKey]) {
                weeklyData[weekKey] = { ratings: [], count: 0 };
            }
            weeklyData[weekKey].ratings.push(review.rating_overall);
            weeklyData[weekKey].count++;
        });

        return Object.entries(weeklyData).map(([date, data]) => {
            const avgRating = data.ratings.reduce((a, b) => a + b, 0) / data.ratings.length;
            const promoters = data.ratings.filter(r => r === 5).length;
            const detractors = data.ratings.filter(r => r <= 2).length;
            const npsScore = ((promoters - detractors) / data.count) * 100;

            return {
                date: new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
                avgRating,
                npsScore,
            };
        });
    } catch (error) {
        console.error('Erro ao buscar quality trends:', error);
        return [];
    }
}

// ============ EDITOR QUALITY RANKINGS ============

export async function getEditorQualityRankings(limit: number = 10): Promise<EditorQualityRanking[]> {
    try {
        const { data: editors } = await supabase
            .from('users')
            .select('id, full_name, email')
            .eq('user_type', 'editor');

        if (!editors) return [];

        const rankings = await Promise.all(
            editors.map(async (editor) => {
                const { data: reviews } = await supabase
                    .from('reviews')
                    .select('rating_overall')
                    .eq('reviewee_id', editor.id);

                const { data: projects } = await supabase
                    .from('projects')
                    .select('id, creator_id')
                    .eq('assigned_editor_id', editor.id)
                    .eq('status', 'completed');

                const avgRating = reviews && reviews.length > 0
                    ? reviews.reduce((sum, r) => sum + r.rating_overall, 0) / reviews.length
                    : 0;

                // Contar clientes únicos que recontrataram
                const creatorCounts: Record<string, number> = {};
                projects?.forEach(p => {
                    creatorCounts[p.creator_id] = (creatorCounts[p.creator_id] || 0) + 1;
                });
                const repeatClients = Object.values(creatorCounts).filter(c => c > 1).length;

                return {
                    editorId: editor.id,
                    editorName: editor.full_name || editor.email || 'Editor',
                    avgRating,
                    totalProjects: projects?.length || 0,
                    onTimeRate: 85 + Math.random() * 15, // TODO: Calcular real
                    repeatClients,
                };
            })
        );

        return rankings
            .filter(e => e.totalProjects > 0)
            .sort((a, b) => b.avgRating - a.avgRating)
            .slice(0, limit);
    } catch (error) {
        console.error('Erro ao buscar editor quality rankings:', error);
        return [];
    }
}

// ============ REVIEWS BREAKDOWN ============

export async function getReviewsBreakdown(startDate: string, endDate: string) {
    try {
        const { data: reviews } = await supabase
            .from('reviews')
            .select('rating_overall')
            .gte('created_at', startDate)
            .lte('created_at', endDate);

        const ratingDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

        reviews?.forEach(r => {
            const rating = Math.round(r.rating_overall);
            if (ratingDistribution[rating] !== undefined) {
                ratingDistribution[rating]++;
            }
        });

        return { ratingDistribution };
    } catch (error) {
        console.error('Erro ao buscar reviews breakdown:', error);
        return { ratingDistribution: {} };
    }
}

// ============ DELIVERY PERFORMANCE ============

export async function getDeliveryPerformance(startDate: string, endDate: string) {
    try {
        const { data: projects } = await supabase
            .from('projects')
            .select('current_revision, completed_at, created_at')
            .eq('status', 'completed')
            .gte('created_at', startDate)
            .lte('created_at', endDate);

        // Distribuição de revisões
        const revisionsDistribution: Record<string, number> = { '0': 0, '1': 0, '2': 0, '3+': 0 };

        projects?.forEach(p => {
            const revisions = p.current_revision || 0;
            if (revisions === 0) revisionsDistribution['0']++;
            else if (revisions === 1) revisionsDistribution['1']++;
            else if (revisions === 2) revisionsDistribution['2']++;
            else revisionsDistribution['3+']++;
        });

        // Tempo médio (simplificado)
        const avgTimeToFirstDelivery = 3.5; // TODO: Calcular real
        const avgTimeToApproval = 5.2; // TODO: Calcular real

        return {
            revisionsDistribution,
            avgTimeToFirstDelivery,
            avgTimeToApproval,
        };
    } catch (error) {
        console.error('Erro ao buscar delivery performance:', error);
        return {
            revisionsDistribution: {},
            avgTimeToFirstDelivery: 0,
            avgTimeToApproval: 0,
        };
    }
}

// ============ EXPORT ============

export async function exportAnalyticsReport(startDate: string, endDate: string, type: string) {
    // TODO: Implementar exportação real para CSV
    console.log(`Exportando relatório ${type} de ${startDate} a ${endDate}`);
    return true;
}
