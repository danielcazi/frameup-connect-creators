import { useEffect, useState } from 'react';
import { useAdmin } from '@/hooks/useAdmin';
import {
    getAnalyticsOverview,
    getGrowthMetrics,
    getProjectFunnelMetrics,
    getEditorRankings,
    getCohortAnalysis,
    getRevenueByVideoType,
    GrowthMetrics,
    ProjectFunnelMetrics,
    EditorRanking,
    CohortData,
    RevenueByVideoType,
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
            const [overviewData, growth, funnel, rankings, cohort, revenue] = await Promise.all([
                getAnalyticsOverview(dateRange.start, dateRange.end),
                getGrowthMetrics(dateRange.start, dateRange.end),
                getProjectFunnelMetrics(dateRange.start, dateRange.end),
                getEditorRankings(10),
                getCohortAnalysis(),
                getRevenueByVideoType(dateRange.start, dateRange.end),
            ]);

            setOverview(overviewData);
            setGrowthData(growth);
            setFunnelData(funnel);
            setEditorRankings(rankings);
            setCohortData(cohort);
            setRevenueByType(revenue);
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
                        onClick={() => alert('Exportar - Implementar')}
                        className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <Download className="w-4 h-4" />
                        <span>Exportar</span>
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
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900 mb-6">
                            Métricas de Qualidade
                        </h3>
                        <p className="text-gray-500 text-center py-12">
                            Métricas de qualidade em desenvolvimento...
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
