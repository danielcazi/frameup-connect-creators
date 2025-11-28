import { supabase } from '@/lib/supabase';

// ================================================
// TIPOS
// ================================================

export type TransactionType =
    | 'project_payment'
    | 'editor_payout'
    | 'subscription_payment'
    | 'refund'
    | 'platform_fee'
    | 'adjustment';

export type TransactionStatus =
    | 'pending'
    | 'processing'
    | 'completed'
    | 'failed'
    | 'refunded'
    | 'cancelled';

export interface Transaction {
    id: string;
    type: TransactionType;
    status: TransactionStatus;
    amount: number;
    currency: string;
    platform_fee: number;
    net_amount: number;
    user_id?: string;
    project_id?: string;
    subscription_id?: string;
    stripe_payment_intent_id?: string;
    description?: string;
    metadata?: Record<string, any>;
    processed_at?: string;
    created_at: string;
    // Joined data
    user?: {
        email: string;
        full_name: string;
    };
    project?: {
        title: string;
    };
}

export interface FinancialDashboard {
    // Métricas principais
    totalRevenue: number;
    projectRevenue: number;
    subscriptionRevenue: number;
    platformFees: number;
    editorPayouts: number;
    refunds: number;
    netRevenue: number;

    // Contagens
    totalTransactions: number;
    successfulTransactions: number;
    failedTransactions: number;

    // Assinaturas
    activeSubscriptions: number;
    newSubscriptions: number;
    cancelledSubscriptions: number;
    subscriptionMRR: number; // Monthly Recurring Revenue

    // Comparação com período anterior
    revenueGrowth: number;
    transactionGrowth: number;
}

export interface RevenueByPeriod {
    period: string;
    projectRevenue: number;
    subscriptionRevenue: number;
    platformFees: number;
    totalRevenue: number;
}

export interface RevenueByVideoType {
    videoType: string;
    revenue: number;
    count: number;
    avgTicket: number;
    percentage: number;
}

export interface SubscriptionMetrics {
    plan: string;
    activeCount: number;
    revenue: number;
    churnRate: number;
    avgLifetime: number;
}

export interface DiscountCode {
    id: string;
    code: string;
    discount_type: 'percentage' | 'fixed';
    discount_value: number;
    max_uses?: number;
    current_uses: number;
    valid_from: string;
    valid_until?: string;
    is_active: boolean;
    applies_to: 'subscription' | 'project' | 'all';
    min_amount?: number;
    created_at: string;
}

// Em adminFinancial.ts, adicione no início
export class FinancialError extends Error {
    constructor(message: string, public code?: string) {
        super(message);
        this.name = 'FinancialError';
    }
}

function getEmptyDashboard(): FinancialDashboard {
    return {
        totalRevenue: 0,
        projectRevenue: 0,
        subscriptionRevenue: 0,
        platformFees: 0,
        editorPayouts: 0,
        refunds: 0,
        netRevenue: 0,
        totalTransactions: 0,
        successfulTransactions: 0,
        failedTransactions: 0,
        activeSubscriptions: 0,
        newSubscriptions: 0,
        cancelledSubscriptions: 0,
        subscriptionMRR: 0,
        revenueGrowth: 0,
        transactionGrowth: 0,
    };
}

// ================================================
// DASHBOARD PRINCIPAL
// ================================================

export async function getFinancialDashboard(
    startDate: string,
    endDate: string
): Promise<FinancialDashboard> {
    try {
        // Buscar transações do período
        const { data: transactions, error: txError } = await supabase
            .from('transactions')
            .select('type, status, amount, platform_fee, net_amount, created_at')
            .gte('created_at', startDate)
            .lte('created_at', endDate + 'T23:59:59');

        if (txError) throw txError;

        // Calcular métricas
        const completedTx = transactions?.filter(t => t.status === 'completed') || [];

        const projectRevenue = completedTx
            .filter(t => t.type === 'project_payment')
            .reduce((sum, t) => sum + (t.amount || 0), 0);

        const subscriptionRevenue = completedTx
            .filter(t => t.type === 'subscription_payment')
            .reduce((sum, t) => sum + (t.amount || 0), 0);

        const platformFees = completedTx
            .reduce((sum, t) => sum + (t.platform_fee || 0), 0);

        const editorPayouts = completedTx
            .filter(t => t.type === 'editor_payout')
            .reduce((sum, t) => sum + (t.amount || 0), 0);

        const refunds = completedTx
            .filter(t => t.type === 'refund')
            .reduce((sum, t) => sum + (t.amount || 0), 0);

        const totalRevenue = projectRevenue + subscriptionRevenue;
        const netRevenue = platformFees; // Taxa da plataforma é a receita líquida

        // Buscar assinaturas
        const { data: subscriptions } = await supabase
            .from('editor_subscriptions')
            .select('status, plan_id, created_at, updated_at, subscription_plans(price)')
            .eq('status', 'active');

        const activeSubscriptions = subscriptions?.length || 0;
        const subscriptionMRR = subscriptions?.reduce((sum, s: any) =>
            sum + (s.subscription_plans?.price || 0), 0) || 0;

        // Novas assinaturas no período
        const { count: newSubs } = await supabase
            .from('editor_subscriptions')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', startDate)
            .lte('created_at', endDate + 'T23:59:59');

        // Canceladas no período
        const { count: cancelledSubs } = await supabase
            .from('editor_subscriptions')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'cancelled')
            .gte('updated_at', startDate)
            .lte('updated_at', endDate + 'T23:59:59');

        // Calcular crescimento (comparar com período anterior)
        const periodDays = Math.ceil(
            (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)
        );
        const prevStartDate = new Date(new Date(startDate).getTime() - periodDays * 24 * 60 * 60 * 1000)
            .toISOString().split('T')[0];
        const prevEndDate = new Date(new Date(endDate).getTime() - periodDays * 24 * 60 * 60 * 1000)
            .toISOString().split('T')[0];

        const { data: prevTransactions } = await supabase
            .from('transactions')
            .select('amount, status, type')
            .gte('created_at', prevStartDate)
            .lte('created_at', prevEndDate + 'T23:59:59')
            .eq('status', 'completed');

        const prevRevenue = prevTransactions
            ?.filter(t => t.type === 'project_payment' || t.type === 'subscription_payment')
            .reduce((sum, t) => sum + (t.amount || 0), 0) || 0;

        const revenueGrowth = prevRevenue > 0
            ? ((totalRevenue - prevRevenue) / prevRevenue) * 100
            : 0;

        const transactionGrowth = (prevTransactions?.length || 0) > 0
            ? ((completedTx.length - (prevTransactions?.length || 0)) / (prevTransactions?.length || 1)) * 100
            : 0;

        return {
            totalRevenue,
            projectRevenue,
            subscriptionRevenue,
            platformFees,
            editorPayouts,
            refunds,
            netRevenue,
            totalTransactions: transactions?.length || 0,
            successfulTransactions: completedTx.length,
            failedTransactions: transactions?.filter(t => t.status === 'failed').length || 0,
            activeSubscriptions,
            newSubscriptions: newSubs || 0,
            cancelledSubscriptions: cancelledSubs || 0,
            subscriptionMRR,
            revenueGrowth,
            transactionGrowth,
        };
    } catch (error: any) {
        // Se tabela não existe, retornar valores zerados
        if (error?.code === '42P01') { // relation does not exist
            console.warn('Tabela transactions não existe. Retornando valores padrão.');
            return getEmptyDashboard();
        }
        console.error('Erro ao buscar dashboard financeiro:', error);
        throw error;
    }
}

// ================================================
// RECEITA POR PERÍODO (PARA GRÁFICOS)
// ================================================

export async function getRevenueByPeriod(
    startDate: string,
    endDate: string,
    groupBy: 'day' | 'week' | 'month' = 'day'
): Promise<RevenueByPeriod[]> {
    try {
        const { data: transactions, error } = await supabase
            .from('transactions')
            .select('type, amount, platform_fee, created_at, status')
            .gte('created_at', startDate)
            .lte('created_at', endDate + 'T23:59:59')
            .eq('status', 'completed')
            .order('created_at', { ascending: true });

        if (error) throw error;

        // Agrupar por período
        const grouped = new Map<string, RevenueByPeriod>();

        (transactions || []).forEach(tx => {
            const date = new Date(tx.created_at);
            let periodKey: string;

            if (groupBy === 'day') {
                periodKey = date.toISOString().split('T')[0];
            } else if (groupBy === 'week') {
                const weekStart = new Date(date);
                weekStart.setDate(date.getDate() - date.getDay());
                periodKey = weekStart.toISOString().split('T')[0];
            } else {
                periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            }

            if (!grouped.has(periodKey)) {
                grouped.set(periodKey, {
                    period: periodKey,
                    projectRevenue: 0,
                    subscriptionRevenue: 0,
                    platformFees: 0,
                    totalRevenue: 0,
                });
            }

            const period = grouped.get(periodKey)!;

            if (tx.type === 'project_payment') {
                period.projectRevenue += tx.amount || 0;
            } else if (tx.type === 'subscription_payment') {
                period.subscriptionRevenue += tx.amount || 0;
            }

            period.platformFees += tx.platform_fee || 0;
            period.totalRevenue = period.projectRevenue + period.subscriptionRevenue;
        });

        return Array.from(grouped.values());
    } catch (error) {
        console.error('Erro ao buscar receita por período:', error);
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
            .select('video_type, base_price, payment_status')
            .eq('payment_status', 'paid')
            .gte('created_at', startDate)
            .lte('created_at', endDate + 'T23:59:59');

        if (error) throw error;

        // Agrupar por tipo
        const grouped = new Map<string, { revenue: number; count: number }>();
        let totalRevenue = 0;

        (data || []).forEach(project => {
            const type = project.video_type || 'Outros';
            const price = project.base_price || 0;

            if (!grouped.has(type)) {
                grouped.set(type, { revenue: 0, count: 0 });
            }

            grouped.get(type)!.revenue += price;
            grouped.get(type)!.count += 1;
            totalRevenue += price;
        });

        // Mapear labels amigáveis
        const typeLabels: Record<string, string> = {
            youtube: 'YouTube',
            reels: 'Reels/Shorts',
            motion: 'Motion Graphics',
            tiktok: 'TikTok',
        };

        return Array.from(grouped.entries()).map(([type, data]) => ({
            videoType: typeLabels[type] || type,
            revenue: data.revenue,
            count: data.count,
            avgTicket: data.count > 0 ? data.revenue / data.count : 0,
            percentage: totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0,
        }));
    } catch (error) {
        console.error('Erro ao buscar receita por tipo de vídeo:', error);
        throw error;
    }
}

// ================================================
// MÉTRICAS DE ASSINATURA
// ================================================

export async function getSubscriptionMetrics(): Promise<SubscriptionMetrics[]> {
    try {
        const { data: subscriptions, error } = await supabase
            .from('editor_subscriptions')
            .select(`
        id,
        status,
        created_at,
        updated_at,
        subscription_plans (
          id,
          name,
          price
        )
      `);

        if (error) throw error;

        // Agrupar por plano
        const grouped = new Map<string, {
            activeCount: number;
            totalCount: number;
            cancelledCount: number;
            revenue: number;
            lifetimeDays: number[];
        }>();

        (subscriptions || []).forEach((sub: any) => {
            const planName = sub.subscription_plans?.name || 'Desconhecido';
            const price = sub.subscription_plans?.price || 0;

            if (!grouped.has(planName)) {
                grouped.set(planName, {
                    activeCount: 0,
                    totalCount: 0,
                    cancelledCount: 0,
                    revenue: 0,
                    lifetimeDays: [],
                });
            }

            const plan = grouped.get(planName)!;
            plan.totalCount += 1;

            if (sub.status === 'active') {
                plan.activeCount += 1;
                plan.revenue += price;
            } else if (sub.status === 'cancelled') {
                plan.cancelledCount += 1;
                // Calcular lifetime
                const created = new Date(sub.created_at);
                const updated = new Date(sub.updated_at);
                const lifetimeDays = Math.ceil((updated.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
                plan.lifetimeDays.push(lifetimeDays);
            }
        });

        return Array.from(grouped.entries()).map(([plan, data]) => ({
            plan,
            activeCount: data.activeCount,
            revenue: data.revenue,
            churnRate: data.totalCount > 0 ? (data.cancelledCount / data.totalCount) * 100 : 0,
            avgLifetime: data.lifetimeDays.length > 0
                ? data.lifetimeDays.reduce((a, b) => a + b, 0) / data.lifetimeDays.length
                : 0,
        }));
    } catch (error) {
        console.error('Erro ao buscar métricas de assinatura:', error);
        throw error;
    }
}

// ================================================
// TRANSAÇÕES RECENTES
// ================================================

export async function getRecentTransactions(
    limit: number = 20,
    offset: number = 0,
    filters?: {
        type?: TransactionType;
        status?: TransactionStatus;
        startDate?: string;
        endDate?: string;
    }
): Promise<{ transactions: Transaction[]; total: number }> {
    try {
        let query = supabase
            .from('transactions')
            .select(`
        *,
        user:user_id (
          email,
          full_name
        ),
        project:project_id (
          title
        )
      `, { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (filters?.type) {
            query = query.eq('type', filters.type);
        }
        if (filters?.status) {
            query = query.eq('status', filters.status);
        }
        if (filters?.startDate) {
            query = query.gte('created_at', filters.startDate);
        }
        if (filters?.endDate) {
            query = query.lte('created_at', filters.endDate + 'T23:59:59');
        }

        const { data, count, error } = await query;

        if (error) throw error;

        return {
            transactions: data || [],
            total: count || 0,
        };
    } catch (error) {
        console.error('Erro ao buscar transações:', error);
        throw error;
    }
}

// ================================================
// EXPORTAR RELATÓRIO
// ================================================

export async function exportFinancialReport(
    startDate: string,
    endDate: string,
    reportType: 'transactions' | 'summary' | 'subscriptions' = 'transactions'
): Promise<void> {
    try {
        let csvContent = '';
        let filename = '';

        if (reportType === 'transactions') {
            const { transactions } = await getRecentTransactions(1000, 0, { startDate, endDate });

            const headers = ['ID', 'Data', 'Tipo', 'Status', 'Valor', 'Taxa', 'Líquido', 'Usuário', 'Projeto', 'Descrição'];
            const rows = transactions.map(t => [
                t.id,
                new Date(t.created_at).toLocaleString('pt-BR'),
                t.type,
                t.status,
                t.amount.toFixed(2),
                t.platform_fee.toFixed(2),
                t.net_amount.toFixed(2),
                t.user?.email || '',
                t.project?.title || '',
                t.description || '',
            ]);

            csvContent = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
            filename = `transacoes_${startDate}_${endDate}.csv`;

        } else if (reportType === 'summary') {
            const dashboard = await getFinancialDashboard(startDate, endDate);

            const rows = [
                ['Métrica', 'Valor'],
                ['Receita Total', `R$ ${dashboard.totalRevenue.toFixed(2)}`],
                ['Receita de Projetos', `R$ ${dashboard.projectRevenue.toFixed(2)}`],
                ['Receita de Assinaturas', `R$ ${dashboard.subscriptionRevenue.toFixed(2)}`],
                ['Taxas da Plataforma', `R$ ${dashboard.platformFees.toFixed(2)}`],
                ['Repasses para Editores', `R$ ${dashboard.editorPayouts.toFixed(2)}`],
                ['Reembolsos', `R$ ${dashboard.refunds.toFixed(2)}`],
                ['Receita Líquida', `R$ ${dashboard.netRevenue.toFixed(2)}`],
                [''],
                ['Transações Totais', dashboard.totalTransactions],
                ['Transações Bem-sucedidas', dashboard.successfulTransactions],
                ['Transações Falhas', dashboard.failedTransactions],
                [''],
                ['Assinaturas Ativas', dashboard.activeSubscriptions],
                ['Novas Assinaturas', dashboard.newSubscriptions],
                ['Assinaturas Canceladas', dashboard.cancelledSubscriptions],
                ['MRR', `R$ ${dashboard.subscriptionMRR.toFixed(2)}`],
            ];

            csvContent = rows.map(r => r.join(',')).join('\n');
            filename = `resumo_financeiro_${startDate}_${endDate}.csv`;

        } else if (reportType === 'subscriptions') {
            const metrics = await getSubscriptionMetrics();

            const headers = ['Plano', 'Ativos', 'Receita Mensal', 'Taxa de Churn', 'Lifetime Médio (dias)'];
            const rows = metrics.map(m => [
                m.plan,
                m.activeCount,
                `R$ ${m.revenue.toFixed(2)}`,
                `${m.churnRate.toFixed(1)}%`,
                m.avgLifetime.toFixed(0),
            ]);

            csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
            filename = `assinaturas_${startDate}_${endDate}.csv`;
        }

        // Download
        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (error) {
        console.error('Erro ao exportar relatório:', error);
        throw error;
    }
}

// ================================================
// CUPONS DE DESCONTO
// ================================================

export async function getDiscountCodes(): Promise<DiscountCode[]> {
    try {
        const { data, error } = await supabase
            .from('discount_codes')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Erro ao buscar cupons:', error);
        throw error;
    }
}

export async function createDiscountCode(code: Partial<DiscountCode>): Promise<DiscountCode> {
    try {
        const { data, error } = await supabase
            .from('discount_codes')
            .insert(code)
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Erro ao criar cupom:', error);
        throw error;
    }
}

export async function updateDiscountCode(id: string, updates: Partial<DiscountCode>): Promise<void> {
    try {
        const { error } = await supabase
            .from('discount_codes')
            .update(updates)
            .eq('id', id);

        if (error) throw error;
    } catch (error) {
        console.error('Erro ao atualizar cupom:', error);
        throw error;
    }
}

export async function deactivateDiscountCode(id: string): Promise<void> {
    try {
        const { error } = await supabase
            .from('discount_codes')
            .update({ is_active: false })
            .eq('id', id);

        if (error) throw error;
    } catch (error) {
        console.error('Erro ao desativar cupom:', error);
        throw error;
    }
}
