import { useEffect, useState } from 'react';
import { useAdmin } from '@/hooks/useAdmin';
import {
    getAnalyticsOverview,
    getGrowthMetrics,
    getProjectFunnelMetrics,
    getEditorRankings,
    getCohortAnalysis,
    getRevenueByVideoType,
    getQualityMetrics,
    getQualityTrends,
    getEditorQualityRankings,
    getReviewsBreakdown,
    getDeliveryPerformance,
    exportAnalyticsReport,
    GrowthMetrics,
    ProjectFunnelMetrics,
    EditorRanking,
    CohortData,
    RevenueByVideoType,
    QualityMetrics,
    QualityTrend,
    EditorQualityRanking,
} from '@/services/adminAnalytics';
import {
    TrendingUp,
    Users,
    Briefcase,
    DollarSign,
    Award,
    Calendar,
    Download,
    BarChart3,
    PieChart as PieChartIcon,
    Activity,
    Clock,
    CheckCircle,
    Loader2,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
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
    Legend,
    ResponsiveContainer,
    FunnelChart,
    Funnel,
    LabelList,
} from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

type TabType = 'overview' | 'growth' | 'projects' | 'editors' | 'financial' | 'quality';

export default function Analytics() {
    const { hasPermission } = useAdmin();
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<TabType>('overview');

    // Data states
    const [overview, setOverview] = useState<any>(null);
    const [growthData, setGrowthData] = useState<GrowthMetrics[]>([]);
    const [funnelData, setFunnelData] = useState<ProjectFunnelMetrics[]>([]);
    const [editorRankings, setEditorRankings] = useState<EditorRanking[]>([]);
    const [cohortData, setCohortData] = useState<CohortData[]>([]);
    const [revenueByType, setRevenueByType] = useState<RevenueByVideoType[]>([]);
    const [qualityMetrics, setQualityMetrics] = useState<QualityMetrics | null>(null);
    const [qualityTrends, setQualityTrends] = useState<QualityTrend[]>([]);
    const [editorQualityRankings, setEditorQualityRankings] = useState<EditorQualityRanking[]>([]);
    const [reviewsBreakdown, setReviewsBreakdown] = useState<any>(null);
    const [deliveryPerformance, setDeliveryPerformance] = useState<any>(null);
    const [exporting, setExporting] = useState(false);
    const { toast } = useToast();

    // Filters
    const [dateRange, setDateRange] = useState({
        start: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0],
    });

    useEffect(() => {
        if (hasPermission('view_analytics')) {
            loadData();
        }
    }, [dateRange]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [
                overviewData,
                growth,
                funnel,
                rankings,
                cohort,
                revenue,
                quality,
                qTrends,
                editorQuality,
                reviews,
                delivery
            ] = await Promise.all([
                getAnalyticsOverview(dateRange.start, dateRange.end),
                getGrowthMetrics(dateRange.start, dateRange.end),
                getProjectFunnelMetrics(dateRange.start, dateRange.end),
                getEditorRankings(10),
                getCohortAnalysis(),
                getRevenueByVideoType(dateRange.start, dateRange.end),
                getQualityMetrics(dateRange.start, dateRange.end),
                getQualityTrends(dateRange.start, dateRange.end),
                getEditorQualityRankings(10),
                getReviewsBreakdown(dateRange.start, dateRange.end),
                getDeliveryPerformance(dateRange.start, dateRange.end),
            ]);

            setOverview(overviewData);
            setGrowthData(growth);
            setFunnelData(funnel);
            setEditorRankings(rankings);
            setCohortData(cohort);
            setRevenueByType(revenue);
            setQualityMetrics(quality);
            setQualityTrends(qTrends);
            setEditorQualityRankings(editorQuality);
            setReviewsBreakdown(reviews);
            setDeliveryPerformance(delivery);
        } catch (error) {
            console.error('Erro ao carregar analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        }).format(value);
    };

    const formatPercent = (value: number) => {
        return `${value.toFixed(1)}%`;
    };

    if (!hasPermission('view_analytics')) {
        return (
            <div className="p-8 text-center text-gray-500">
                Você não tem permissão para visualizar analytics.
            </div>
        );
    }

    if (loading && !overview) {
        return (
            <div className="p-8 flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
            </div>
        );
    }

    const tabs = [
        { id: 'overview', label: 'Visão Geral', icon: BarChart3 },
        { id: 'growth', label: 'Crescimento', icon: TrendingUp },
        { id: 'projects', label: 'Projetos', icon: Briefcase },
        { id: 'editors', label: 'Editores', icon: Award },
        { id: 'financial', label: 'Financeiro', icon: DollarSign },
        { id: 'quality', label: 'Qualidade', icon: Activity },
    ];

    const handleExport = async () => {
        setExporting(true);
        try {
            await exportAnalyticsReport(dateRange.start, dateRange.end, activeTab);
            toast({
                title: 'Sucesso',
                description: 'Relatório exportado com sucesso!',
            });
        } catch (error) {
            console.error('Erro ao exportar:', error);
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: 'Não foi possível exportar o relatório.',
            });
        } finally {
            setExporting(false);
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
                    <p className="text-gray-600 mt-1">Análise completa da plataforma</p>
                </div>

                <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2 bg-white p-2 rounded-lg border border-gray-200">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        <input
                            type="date"
                            value={dateRange.start}
                            onChange={(e) => setDateRange((prev) => ({ ...prev, start: e.target.value }))}
                            className="border-none text-sm focus:ring-0"
                        />
                        <span className="text-gray-400">-</span>
                        <input
                            type="date"
                            value={dateRange.end}
                            onChange={(e) => setDateRange((prev) => ({ ...prev, end: e.target.value }))}
                            className="border-none text-sm focus:ring-0"
                        />
                    </div>

                    <button
                        onClick={handleExport}
                        disabled={exporting}
                        className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {exporting ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Download className="w-4 h-4" />
                        )}
                        <span>{exporting ? 'Exportando...' : 'Exportar CSV'}</span>
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
                <div className="flex overflow-x-auto">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as TabType)}
                                className={`flex items-center space-x-2 px-6 py-4 font-medium transition-colors whitespace-nowrap ${activeTab === tab.id
                                    ? 'text-blue-600 border-b-2 border-blue-600'
                                    : 'text-gray-600 hover:text-gray-900'
                                    }`}
                            >
                                <Icon className="w-5 h-5" />
                                <span>{tab.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Tab Content */}
            <div className="space-y-6">
                {/* OVERVIEW TAB */}
                {activeTab === 'overview' && overview && (
                    <>
                        {/* KPI Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-sm font-medium text-gray-600">Total de Usuários</h3>
                                    <Users className="w-8 h-8 text-blue-600" />
                                </div>
                                <p className="text-3xl font-bold text-gray-900">{overview.totalUsers}</p>
                                <p className="text-sm text-green-600 mt-2 flex items-center">
                                    <TrendingUp className="w-3 h-3 mr-1" />
                                    {formatPercent(overview.growthRate)} vs período anterior
                                </p>
                            </div>

                            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-sm font-medium text-gray-600">Total de Projetos</h3>
                                    <Briefcase className="w-8 h-8 text-purple-600" />
                                </div>
                                <p className="text-3xl font-bold text-gray-900">{overview.totalProjects}</p>
                                <p className="text-sm text-gray-500 mt-2">No período selecionado</p>
                            </div>

                            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-sm font-medium text-gray-600">Receita Total</h3>
                                    <DollarSign className="w-8 h-8 text-green-600" />
                                </div>
                                <p className="text-3xl font-bold text-gray-900">
                                    {formatCurrency(overview.totalRevenue)}
                                </p>
                                <p className="text-sm text-gray-500 mt-2">No período selecionado</p>
                            </div>

                            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-sm font-medium text-gray-600">Taxa de Conclusão</h3>
                                    <Award className="w-8 h-8 text-orange-600" />
                                </div>
                                <p className="text-3xl font-bold text-gray-900">
                                    {formatPercent(overview.completionRate)}
                                </p>
                                <p className="text-sm text-gray-500 mt-2">Projetos concluídos</p>
                            </div>
                        </div>

                        {/* Growth Chart */}
                        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-900 mb-6">Crescimento de Usuários</h3>
                            <div className="h-80">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={growthData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="date" />
                                        <YAxis />
                                        <Tooltip />
                                        <Legend />
                                        <Line
                                            type="monotone"
                                            dataKey="newCreators"
                                            stroke="#3b82f6"
                                            strokeWidth={2}
                                            name="Creators"
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="newEditors"
                                            stroke="#10b981"
                                            strokeWidth={2}
                                            name="Editores"
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </>
                )}

                {/* GROWTH TAB */}
                {activeTab === 'growth' && (
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900 mb-6">
                            Novos Usuários por Dia
                        </h3>
                        <div className="h-96">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={growthData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="date" />
                                    <YAxis />
                                    <Tooltip />
                                    <Legend />
                                    <Bar dataKey="newCreators" fill="#3b82f6" name="Creators" />
                                    <Bar dataKey="newEditors" fill="#10b981" name="Editores" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}

                {/* PROJECTS TAB */}
                {activeTab === 'projects' && (
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900 mb-6">Funil de Projetos</h3>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                            Estágio
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                            Quantidade
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                            Tempo Médio (h)
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                            Taxa de Abandono
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {funnelData.map((stage, index) => (
                                        <tr key={index}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                {stage.stage}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {stage.count}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {stage.avgTime.toFixed(1)}h
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {formatPercent(stage.dropoffRate)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* EDITORS TAB */}
                {activeTab === 'editors' && (
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900 mb-6">
                            Top 10 Editores
                        </h3>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                            Rank
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                            Editor
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                            Projetos
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                            Avaliação
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                            Receita Gerada
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {editorRankings.map((editor) => (
                                        <tr key={editor.editorId}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                #{editor.overallRank}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {editor.editorName}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {editor.totalProjects}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                ⭐ {editor.avgRating.toFixed(1)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {formatCurrency(editor.totalRevenue)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* FINANCIAL TAB */}
                {activeTab === 'financial' && (
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900 mb-6">
                            Receita por Tipo de Vídeo
                        </h3>
                        <div className="h-96">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={revenueByType}
                                        dataKey="revenue"
                                        nameKey="videoType"
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={120}
                                        label
                                    >
                                        {revenueByType.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}

                {/* QUALITY TAB */}
                {activeTab === 'quality' && (
                    <>
                        {loading ? (
                            <div className="flex items-center justify-center h-64">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
                            </div>
                        ) : qualityMetrics ? (
                            <div className="space-y-6">
                                {/* KPIs de Qualidade */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    {/* NPS Score */}
                                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm font-medium text-gray-600">NPS Score</span>
                                            <div className={`px-2 py-1 rounded-full text-xs font-medium ${qualityMetrics.npsScore >= 50 ? 'bg-green-100 text-green-800' :
                                                qualityMetrics.npsScore >= 0 ? 'bg-yellow-100 text-yellow-800' :
                                                    'bg-red-100 text-red-800'
                                                }`}>
                                                {qualityMetrics.npsScore >= 50 ? 'Excelente' :
                                                    qualityMetrics.npsScore >= 0 ? 'Bom' : 'Crítico'}
                                            </div>
                                        </div>
                                        <p className="text-3xl font-bold text-gray-900">{qualityMetrics.npsScore.toFixed(0)}</p>
                                        <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                                            <span className="text-green-600">👍 {qualityMetrics.npsBreakdown.promoters}</span>
                                            <span className="text-gray-400">😐 {qualityMetrics.npsBreakdown.passives}</span>
                                            <span className="text-red-600">👎 {qualityMetrics.npsBreakdown.detractors}</span>
                                        </div>
                                    </div>

                                    {/* Avaliação Média */}
                                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm font-medium text-gray-600">Avaliação Média</span>
                                            <Award className="w-5 h-5 text-yellow-500" />
                                        </div>
                                        <p className="text-3xl font-bold text-gray-900">
                                            ⭐ {qualityMetrics.avgRating.toFixed(1)}
                                        </p>
                                        <p className="text-sm text-gray-500 mt-1">
                                            {qualityMetrics.totalReviews} avaliações
                                        </p>
                                    </div>

                                    {/* Taxa de Entrega no Prazo */}
                                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm font-medium text-gray-600">Entrega no Prazo</span>
                                            <Clock className="w-5 h-5 text-blue-500" />
                                        </div>
                                        <p className="text-3xl font-bold text-gray-900">
                                            {formatPercent(qualityMetrics.onTimeRate)}
                                        </p>
                                        <p className="text-sm text-gray-500 mt-1">
                                            {qualityMetrics.projectsOnTime} de {qualityMetrics.projectsOnTime + qualityMetrics.projectsLate} projetos
                                        </p>
                                    </div>

                                    {/* Taxa de Aprovação 1ª Entrega */}
                                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm font-medium text-gray-600">Aprovação 1ª Entrega</span>
                                            <CheckCircle className="w-5 h-5 text-green-500" />
                                        </div>
                                        <p className="text-3xl font-bold text-gray-900">
                                            {formatPercent(qualityMetrics.firstDeliveryApprovalRate)}
                                        </p>
                                        <p className="text-sm text-gray-500 mt-1">
                                            Média de {qualityMetrics.avgRevisions.toFixed(1)} revisões
                                        </p>
                                    </div>
                                </div>

                                {/* Gráficos */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {/* Tendência de Qualidade */}
                                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                                        <h3 className="text-lg font-semibold text-gray-900 mb-6">Tendência de Qualidade</h3>
                                        <div className="h-80">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <LineChart data={qualityTrends}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                    <XAxis dataKey="date" />
                                                    <YAxis yAxisId="left" domain={[0, 5]} />
                                                    <YAxis yAxisId="right" orientation="right" domain={[-100, 100]} />
                                                    <Tooltip />
                                                    <Legend />
                                                    <Line
                                                        yAxisId="left"
                                                        type="monotone"
                                                        dataKey="avgRating"
                                                        stroke="#f59e0b"
                                                        strokeWidth={2}
                                                        name="Avaliação Média"
                                                        dot={false}
                                                    />
                                                    <Line
                                                        yAxisId="right"
                                                        type="monotone"
                                                        dataKey="npsScore"
                                                        stroke="#3b82f6"
                                                        strokeWidth={2}
                                                        name="NPS"
                                                        dot={false}
                                                    />
                                                </LineChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>

                                    {/* Distribuição de Avaliações */}
                                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                                        <h3 className="text-lg font-semibold text-gray-900 mb-6">Distribuição de Avaliações</h3>
                                        <div className="h-80">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={reviewsBreakdown?.ratingDistribution ? Object.entries(reviewsBreakdown.ratingDistribution).map(([rating, count]) => ({ rating: Number(rating), count })) : []} layout="vertical">
                                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                                    <XAxis type="number" />
                                                    <YAxis dataKey="rating" type="category" width={60} tickFormatter={(v) => `${v} ⭐`} />
                                                    <Tooltip />
                                                    <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]}>
                                                        {(reviewsBreakdown?.ratingDistribution ? Object.entries(reviewsBreakdown.ratingDistribution).map(([rating, count]) => ({ rating: Number(rating), count })) : []).map((entry: any, index: number) => (
                                                            <Cell
                                                                key={`cell-${index}`}
                                                                fill={entry.rating >= 4 ? '#10b981' : entry.rating >= 3 ? '#f59e0b' : '#ef4444'}
                                                            />
                                                        ))}
                                                    </Bar>
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                </div>

                                {/* Métricas Adicionais */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {/* Performance de Entrega */}
                                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                                        <h3 className="text-lg font-semibold text-gray-900 mb-6">Performance de Entrega</h3>
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-gray-600">Tempo Médio 1ª Entrega</span>
                                                <span className="font-semibold">{deliveryPerformance?.avgTimeToFirstDelivery?.toFixed(1) || 0} dias</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-gray-600">Tempo Médio até Aprovação</span>
                                                <span className="font-semibold">{deliveryPerformance?.avgTimeToApproval?.toFixed(1) || 0} dias</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-gray-600">Taxa de Recontratação</span>
                                                <span className="font-semibold text-green-600">{formatPercent(qualityMetrics.repeatHireRate)}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-gray-600">Tempo Médio Resposta Chat</span>
                                                <span className="font-semibold">{qualityMetrics.avgResponseTimeHours.toFixed(1)}h</span>
                                            </div>
                                        </div>

                                        {/* Distribuição de Revisões */}
                                        <div className="mt-6 pt-6 border-t border-gray-100">
                                            <h4 className="text-sm font-medium text-gray-700 mb-4">Distribuição de Revisões</h4>
                                            <div className="flex gap-2">
                                                {deliveryPerformance?.revisionsDistribution && Object.entries(deliveryPerformance.revisionsDistribution).map(([revisions, count]: [string, any], i: number) => {
                                                    const total = Object.values(deliveryPerformance.revisionsDistribution).reduce((a: any, b: any) => a + b, 0) as number;
                                                    const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
                                                    return (
                                                        <div key={i} className="flex-1 text-center">
                                                            <div
                                                                className="h-20 bg-blue-100 rounded-t flex items-end justify-center relative overflow-hidden"
                                                            >
                                                                <div
                                                                    className="absolute bottom-0 left-0 right-0 bg-blue-500 transition-all duration-500"
                                                                    style={{ height: `${percentage}%` }}
                                                                />
                                                                <span className="text-xs font-medium text-gray-700 pb-1 relative z-10 mix-blend-difference text-white">{percentage}%</span>
                                                            </div>
                                                            <p className="text-xs text-gray-600 mt-1">{revisions} rev</p>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Top Editores por Qualidade */}
                                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                                        <h3 className="text-lg font-semibold text-gray-900 mb-6">Top Editores por Qualidade</h3>
                                        <div className="space-y-4">
                                            {editorQualityRankings.slice(0, 5).map((editor, index) => (
                                                <div key={editor.editorId} className="flex items-center gap-4">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${index === 0 ? 'bg-yellow-500' :
                                                        index === 1 ? 'bg-gray-400' :
                                                            index === 2 ? 'bg-amber-600' :
                                                                'bg-gray-300'
                                                        }`}>
                                                        {index + 1}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-medium text-gray-900 truncate">{editor.editorName}</p>
                                                        <p className="text-xs text-gray-500">
                                                            {editor.totalProjects} projetos • {editor.repeatClients} clientes recorrentes
                                                        </p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="font-semibold text-gray-900">⭐ {editor.avgRating.toFixed(1)}</p>
                                                        <p className="text-xs text-green-600">{formatPercent(editor.onTimeRate)} no prazo</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-12 text-gray-500">
                                Nenhum dado de qualidade disponível para o período selecionado.
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
