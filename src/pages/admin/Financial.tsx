import { useEffect, useState } from 'react';
import { useAdmin } from '@/hooks/useAdmin';
import { useToast } from '@/hooks/use-toast';
import {
    getFinancialDashboard,
    getRevenueByPeriod,
    getRevenueByVideoType,
    getSubscriptionMetrics,
    getRecentTransactions,
    exportFinancialReport,
    FinancialDashboard,
    RevenueByPeriod,
    RevenueByVideoType,
    SubscriptionMetrics,
    Transaction,
} from '@/services/adminFinancial';
import {
    DollarSign,
    TrendingUp,
    TrendingDown,
    CreditCard,
    Users,
    Download,
    Calendar,
    RefreshCw,
    ArrowUpRight,
    ArrowDownRight,
    Loader2,
    FileText,
    Percent,
} from 'lucide-react';
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

type ExportType = 'transactions' | 'summary' | 'subscriptions';

const ChartSkeleton = () => (
    <div className="h-80 bg-gray-100 animate-pulse rounded-lg flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
    </div>
);

export default function Financial() {
    const { hasPermission } = useAdmin();
    const { toast } = useToast();

    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    // Data states
    const [dashboard, setDashboard] = useState<FinancialDashboard | null>(null);
    const [revenueByPeriod, setRevenueByPeriod] = useState<RevenueByPeriod[]>([]);
    const [revenueByType, setRevenueByType] = useState<RevenueByVideoType[]>([]);
    const [subscriptionMetrics, setSubscriptionMetrics] = useState<SubscriptionMetrics[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [transactionsTotal, setTransactionsTotal] = useState(0);

    // Filters
    const [dateRange, setDateRange] = useState({
        start: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0],
    });

    useEffect(() => {
        if (hasPermission('view_financial_data')) {
            loadData();
        }
    }, [dateRange]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [dashboardData, periodData, typeData, subMetrics, txData] = await Promise.all([
                getFinancialDashboard(dateRange.start, dateRange.end),
                getRevenueByPeriod(dateRange.start, dateRange.end, 'day'),
                getRevenueByVideoType(dateRange.start, dateRange.end),
                getSubscriptionMetrics(),
                getRecentTransactions(10),
            ]);

            setDashboard(dashboardData);
            setRevenueByPeriod(periodData);
            setRevenueByType(typeData);
            setSubscriptionMetrics(subMetrics);
            setTransactions(txData.transactions);
            setTransactionsTotal(txData.total);
        } catch (error) {
            console.error('Erro ao carregar dados financeiros:', error);
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: 'Não foi possível carregar os dados financeiros.',
            });
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
        toast({
            title: 'Dados atualizados',
            description: 'Os dados financeiros foram atualizados.',
        });
    };

    const handleExport = async (type: ExportType) => {
        setExporting(true);
        try {
            await exportFinancialReport(dateRange.start, dateRange.end, type);
            toast({
                title: 'Exportação concluída',
                description: 'O relatório foi baixado com sucesso.',
            });
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Erro na exportação',
                description: 'Não foi possível exportar o relatório.',
            });
        } finally {
            setExporting(false);
        }
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        }).format(value);
    };

    const formatPercent = (value: number) => {
        return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
    };

    if (!hasPermission('view_financial_data')) {
        return (
            <div className="p-8 text-center text-gray-500">
                Você não tem permissão para visualizar dados financeiros.
            </div>
        );
    }

    if (loading && !dashboard) {
        return (
            <div className="p-8 flex items-center justify-center h-screen">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto" />
                    <p className="mt-4 text-gray-600">Carregando dados financeiros...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Dashboard Financeiro</h1>
                    <p className="text-gray-600 mt-1">Visão geral das finanças da plataforma</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Date Range */}
                    <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-gray-200">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        <input
                            type="date"
                            value={dateRange.start}
                            onChange={(e) => setDateRange((prev) => ({ ...prev, start: e.target.value }))}
                            className="border-none text-sm focus:ring-0 bg-transparent"
                        />
                        <span className="text-gray-400">-</span>
                        <input
                            type="date"
                            value={dateRange.end}
                            onChange={(e) => setDateRange((prev) => ({ ...prev, end: e.target.value }))}
                            className="border-none text-sm focus:ring-0 bg-transparent"
                        />
                    </div>

                    {/* Refresh */}
                    <button
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                        title="Atualizar dados"
                    >
                        <RefreshCw className={`w-5 h-5 text-gray-600 ${refreshing ? 'animate-spin' : ''}`} />
                    </button>

                    {/* Export Dropdown */}
                    <div className="relative group">
                        <button
                            disabled={exporting}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                        >
                            {exporting ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Download className="w-4 h-4" />
                            )}
                            <span>Exportar</span>
                        </button>
                        <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                            <button
                                onClick={() => handleExport('summary')}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                            >
                                <FileText className="w-4 h-4" />
                                Resumo Financeiro
                            </button>
                            <button
                                onClick={() => handleExport('transactions')}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                            >
                                <CreditCard className="w-4 h-4" />
                                Transações
                            </button>
                            <button
                                onClick={() => handleExport('subscriptions')}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                            >
                                <Users className="w-4 h-4" />
                                Assinaturas
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {dashboard && (
                <>
                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        {/* Receita Total */}
                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm group relative" title="Soma de todas as receitas (projetos + assinaturas)">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Receita Total</p>
                                    <h3 className="text-2xl font-bold text-gray-900 mt-1">
                                        {formatCurrency(dashboard.totalRevenue)}
                                    </h3>
                                </div>
                                <div className="p-2 bg-green-100 rounded-lg">
                                    <DollarSign className="w-6 h-6 text-green-600" />
                                </div>
                            </div>
                            <div className="mt-4 flex items-center gap-1">
                                {dashboard.revenueGrowth >= 0 ? (
                                    <ArrowUpRight className="w-4 h-4 text-green-600" />
                                ) : (
                                    <ArrowDownRight className="w-4 h-4 text-red-600" />
                                )}
                                <span className={`text-sm font-medium ${dashboard.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {formatPercent(dashboard.revenueGrowth)}
                                </span>
                                <span className="text-sm text-gray-500">vs período anterior</span>
                            </div>
                        </div>

                        {/* Taxas da Plataforma */}
                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm group relative" title="Receita líquida da plataforma (taxas)">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Taxas da Plataforma</p>
                                    <h3 className="text-2xl font-bold text-gray-900 mt-1">
                                        {formatCurrency(dashboard.platformFees)}
                                    </h3>
                                </div>
                                <div className="p-2 bg-blue-100 rounded-lg">
                                    <Percent className="w-6 h-6 text-blue-600" />
                                </div>
                            </div>
                            <p className="mt-4 text-sm text-gray-500">
                                5% sobre {formatCurrency(dashboard.projectRevenue)} em projetos
                            </p>
                        </div>

                        {/* MRR de Assinaturas */}
                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm group relative" title="Receita Recorrente Mensal de assinaturas ativas">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-sm font-medium text-gray-500">MRR Assinaturas</p>
                                    <h3 className="text-2xl font-bold text-gray-900 mt-1">
                                        {formatCurrency(dashboard.subscriptionMRR)}
                                    </h3>
                                </div>
                                <div className="p-2 bg-purple-100 rounded-lg">
                                    <Users className="w-6 h-6 text-purple-600" />
                                </div>
                            </div>
                            <p className="mt-4 text-sm text-gray-500">
                                {dashboard.activeSubscriptions} assinantes ativos
                            </p>
                        </div>

                        {/* Transações */}
                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm group relative" title="Total de transações processadas no período">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Transações</p>
                                    <h3 className="text-2xl font-bold text-gray-900 mt-1">
                                        {dashboard.successfulTransactions}
                                    </h3>
                                </div>
                                <div className="p-2 bg-orange-100 rounded-lg">
                                    <CreditCard className="w-6 h-6 text-orange-600" />
                                </div>
                            </div>
                            <div className="mt-4 flex items-center gap-2">
                                <span className="text-sm text-green-600">{dashboard.successfulTransactions} ✓</span>
                                <span className="text-sm text-red-600">{dashboard.failedTransactions} ✗</span>
                            </div>
                        </div>
                    </div>

                    {/* Charts Row 1 */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                        {/* Revenue Over Time */}
                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                            <h3 className="text-lg font-semibold text-gray-900 mb-6">Receita ao Longo do Tempo</h3>
                            <div className="h-80">
                                {revenueByPeriod.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={revenueByPeriod}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                            <XAxis
                                                dataKey="period"
                                                tickFormatter={(v) => new Date(v).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                                            />
                                            <YAxis tickFormatter={(v) => `R$${v}`} />
                                            <Tooltip
                                                formatter={(value: number) => formatCurrency(value)}
                                                labelFormatter={(label) => new Date(label).toLocaleDateString('pt-BR')}
                                            />
                                            <Legend />
                                            <Line
                                                type="monotone"
                                                dataKey="projectRevenue"
                                                stroke="#3b82f6"
                                                strokeWidth={2}
                                                name="Projetos"
                                                dot={false}
                                            />
                                            <Line
                                                type="monotone"
                                                dataKey="subscriptionRevenue"
                                                stroke="#10b981"
                                                strokeWidth={2}
                                                name="Assinaturas"
                                                dot={false}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-gray-500">
                                        Sem dados para o período selecionado
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Revenue by Video Type */}
                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                            <h3 className="text-lg font-semibold text-gray-900 mb-6">Receita por Tipo de Vídeo</h3>
                            <div className="h-80">
                                {revenueByType.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={revenueByType}
                                                dataKey="revenue"
                                                nameKey="videoType"
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={100}
                                                paddingAngle={2}
                                                label={({ videoType, percentage }) => `${videoType} (${percentage.toFixed(0)}%)`}
                                            >
                                                {revenueByType.map((_, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip formatter={(value: number) => formatCurrency(value)} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-gray-500">
                                        Sem dados para o período selecionado
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Subscription Metrics */}
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mb-8">
                        <h3 className="text-lg font-semibold text-gray-900 mb-6">Métricas de Assinaturas</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {subscriptionMetrics.map((metric, index) => (
                                <div key={metric.plan} className="p-4 bg-gray-50 rounded-lg">
                                    <div className="flex items-center gap-2 mb-3">
                                        <div
                                            className="w-3 h-3 rounded-full"
                                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                        />
                                        <h4 className="font-semibold text-gray-900">{metric.plan}</h4>
                                    </div>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Ativos</span>
                                            <span className="font-medium">{metric.activeCount}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Receita/mês</span>
                                            <span className="font-medium">{formatCurrency(metric.revenue)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Churn Rate</span>
                                            <span className={`font-medium ${metric.churnRate > 5 ? 'text-red-600' : 'text-green-600'}`}>
                                                {metric.churnRate.toFixed(1)}%
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Lifetime Médio</span>
                                            <span className="font-medium">{metric.avgLifetime.toFixed(0)} dias</span>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {subscriptionMetrics.length === 0 && (
                                <div className="col-span-full text-center py-8 text-gray-500">
                                    Nenhuma assinatura encontrada
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Recent Transactions */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-900">Transações Recentes</h3>
                            <span className="text-sm text-gray-500">{transactionsTotal} total</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3">ID</th>
                                        <th className="px-6 py-3">Data</th>
                                        <th className="px-6 py-3">Tipo</th>
                                        <th className="px-6 py-3">Usuário</th>
                                        <th className="px-6 py-3">Projeto</th>
                                        <th className="px-6 py-3">Valor</th>
                                        <th className="px-6 py-3">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {transactions.length > 0 ? (
                                        transactions.map((tx) => (
                                            <tr key={tx.id} className="bg-white border-b hover:bg-gray-50">
                                                <td className="px-6 py-4 font-mono text-xs text-gray-500">
                                                    {tx.id.slice(0, 8)}...
                                                </td>
                                                <td className="px-6 py-4 text-gray-600">
                                                    {new Date(tx.created_at).toLocaleDateString('pt-BR')}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${tx.type === 'project_payment' ? 'bg-blue-100 text-blue-800' :
                                                        tx.type === 'subscription_payment' ? 'bg-purple-100 text-purple-800' :
                                                            tx.type === 'editor_payout' ? 'bg-green-100 text-green-800' :
                                                                tx.type === 'refund' ? 'bg-red-100 text-red-800' :
                                                                    'bg-gray-100 text-gray-800'
                                                        }`}>
                                                        {tx.type === 'project_payment' ? 'Projeto' :
                                                            tx.type === 'subscription_payment' ? 'Assinatura' :
                                                                tx.type === 'editor_payout' ? 'Repasse' :
                                                                    tx.type === 'refund' ? 'Reembolso' :
                                                                        tx.type}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-gray-600">
                                                    {tx.user?.full_name || tx.user?.email || '-'}
                                                </td>
                                                <td className="px-6 py-4 text-gray-600 max-w-[200px] truncate">
                                                    {tx.project?.title || '-'}
                                                </td>
                                                <td className="px-6 py-4 font-medium text-gray-900">
                                                    {formatCurrency(tx.amount)}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${tx.status === 'completed' ? 'bg-green-100 text-green-800' :
                                                        tx.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                            tx.status === 'failed' ? 'bg-red-100 text-red-800' :
                                                                'bg-gray-100 text-gray-800'
                                                        }`}>
                                                        {tx.status === 'completed' ? 'Concluído' :
                                                            tx.status === 'pending' ? 'Pendente' :
                                                                tx.status === 'failed' ? 'Falhou' :
                                                                    tx.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                                                Nenhuma transação encontrada
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
