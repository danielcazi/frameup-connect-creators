import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDashboardOverview, DashboardOverview } from '@/services/adminDashboard';
import {
    Users,
    FileText,
    DollarSign,
    TrendingUp,
    TrendingDown,
    AlertCircle,
    Activity,
    Tag,
} from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

export default function AdminDashboard() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [dashboard, setDashboard] = useState<DashboardOverview | null>(null);
    const [period, setPeriod] = useState<'last_7_days' | 'last_30_days' | 'last_90_days'>('last_30_days');

    useEffect(() => {
        loadDashboard();
    }, [period]);

    const loadDashboard = async () => {
        setLoading(true);
        try {
            const data = await getDashboardOverview(period);
            setDashboard(data);
        } catch (error) {
            console.error('Erro ao carregar dashboard:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading || !dashboard) {
        return (
            <div className="p-8">
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
                </div>
            </div>
        );
    }

    const projectsChartData = [
        { name: 'Abertos', value: dashboard.projects.open, color: '#3B82F6' },
        { name: 'Em Andamento', value: dashboard.projects.in_progress, color: '#F59E0B' },
        { name: 'Em Revisão', value: dashboard.projects.in_review, color: '#8B5CF6' },
        { name: 'Concluídos', value: dashboard.projects.completed, color: '#10B981' },
        { name: 'Cancelados', value: dashboard.projects.cancelled, color: '#EF4444' },
    ].filter(item => item.value > 0);

    return (
        <div className="p-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
                    <p className="text-gray-600">Visão geral da plataforma</p>
                </div>

                {/* Period Selector */}
                <select
                    value={period}
                    onChange={(e) => setPeriod(e.target.value as any)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                >
                    <option value="last_7_days">Últimos 7 dias</option>
                    <option value="last_30_days">Últimos 30 dias</option>
                    <option value="last_90_days">Últimos 90 dias</option>
                </select>
            </div>

            {/* Alertas */}
            {dashboard.alerts.length > 0 && (
                <div className="mb-8 space-y-3">
                    {dashboard.alerts.map((alert, index) => (
                        <div
                            key={index}
                            className={`p-4 rounded-lg border flex items-start justify-between ${alert.severity === 'error'
                                ? 'bg-red-50 border-red-200'
                                : alert.severity === 'warning'
                                    ? 'bg-yellow-50 border-yellow-200'
                                    : 'bg-blue-50 border-blue-200'
                                }`}
                        >
                            <div className="flex items-start space-x-3">
                                <AlertCircle
                                    className={`w-5 h-5 mt-0.5 ${alert.severity === 'error'
                                        ? 'text-red-600'
                                        : alert.severity === 'warning'
                                            ? 'text-yellow-600'
                                            : 'text-blue-600'
                                        }`}
                                />
                                <p
                                    className={`text-sm font-medium ${alert.severity === 'error'
                                        ? 'text-red-900'
                                        : alert.severity === 'warning'
                                            ? 'text-yellow-900'
                                            : 'text-blue-900'
                                        }`}
                                >
                                    {alert.message}
                                </p>
                            </div>
                            <button
                                onClick={() => navigate(alert.action_url)}
                                className={`text-sm font-medium ${alert.severity === 'error'
                                    ? 'text-red-600 hover:text-red-700'
                                    : alert.severity === 'warning'
                                        ? 'text-yellow-600 hover:text-yellow-700'
                                        : 'text-blue-600 hover:text-blue-700'
                                    }`}
                            >
                                Ver →
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Acesso Rápido */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <button
                    onClick={() => navigate('/admin/discounts')}
                    className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 transition-colors flex flex-col items-center justify-center gap-2 text-center"
                >
                    <div className="p-2 bg-purple-100 rounded-full text-purple-600">
                        <Tag className="w-6 h-6" />
                    </div>
                    <span className="font-medium text-gray-900">Criar Desconto</span>
                </button>

                <button
                    onClick={() => navigate('/admin/analytics')}
                    className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 transition-colors flex flex-col items-center justify-center gap-2 text-center"
                >
                    <div className="p-2 bg-red-100 rounded-full text-red-600">
                        <TrendingDown className="w-6 h-6" />
                    </div>
                    <div className="flex flex-col items-center">
                        <span className="text-xs text-gray-500">Churn Rate</span>
                        <span className="font-bold text-xl text-gray-900">
                            {(dashboard.health_metrics.churn_rate * 100).toFixed(1)}%
                        </span>
                    </div>
                </button>

                <button
                    onClick={() => navigate('/admin/analytics')}
                    className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 transition-colors flex flex-col items-center justify-center gap-2 text-center"
                >
                    <div className="p-2 bg-orange-100 rounded-full text-orange-600">
                        <FileText className="w-6 h-6" />
                    </div>
                    <span className="font-medium text-gray-900">Relatório de Cancelamento</span>
                </button>

                <button
                    onClick={() => navigate('/admin/disputes')}
                    className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 transition-colors flex flex-col items-center justify-center gap-2 text-center"
                >
                    <div className="p-2 bg-blue-100 rounded-full text-blue-600">
                        <AlertCircle className="w-6 h-6" />
                    </div>
                    <span className="font-medium text-gray-900">Disputas</span>
                </button>
            </div>

            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {/* Usuários */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-medium text-gray-600">Usuários</h3>
                        <Users className="w-8 h-8 text-blue-600" />
                    </div>
                    <p className="text-3xl font-bold text-gray-900 mb-2">
                        {dashboard.users.total_creators + dashboard.users.total_editors}
                    </p>
                    <p className="text-sm text-green-600 font-medium">
                        +{dashboard.users.new_creators + dashboard.users.new_editors} novos
                    </p>
                </div>

                {/* Projetos */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-medium text-gray-600">Projetos</h3>
                        <FileText className="w-8 h-8 text-purple-600" />
                    </div>
                    <p className="text-3xl font-bold text-gray-900 mb-2">
                        {dashboard.projects.total_created}
                    </p>
                    <p className="text-sm text-blue-600 font-medium">
                        {dashboard.projects.in_progress} em andamento
                    </p>
                </div>

                {/* Receita */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-medium text-gray-600">Receita</h3>
                        <DollarSign className="w-8 h-8 text-green-600" />
                    </div>
                    <p className="text-3xl font-bold text-gray-900 mb-2">
                        R$ {dashboard.financial.total_revenue.toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-600">
                        R$ {dashboard.financial.platform_fees.toFixed(2)} em taxas
                    </p>
                </div>

                {/* Health Score */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-medium text-gray-600">Taxa de Conclusão</h3>
                        <TrendingUp className="w-8 h-8 text-orange-600" />
                    </div>
                    <p className="text-3xl font-bold text-gray-900 mb-2">
                        {(dashboard.health_metrics.project_completion_rate * 100).toFixed(1)}%
                    </p>
                    <p className="text-sm text-green-600 font-medium">
                        ⭐ {dashboard.health_metrics.avg_editor_rating.toFixed(1)} rating médio
                    </p>
                </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Status dos Projetos */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold mb-4">Projetos por Status</h3>
                    <div className="h-[300px] w-full">
                        {projectsChartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={projectsChartData}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={(entry) => entry.name}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        dataKey="value"
                                    >
                                        {projectsChartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-gray-500">
                                Sem dados para o período selecionado
                            </div>
                        )}
                    </div>
                </div>

                {/* Métricas de Saúde */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold mb-4">Métricas de Saúde</h3>
                    <div className="space-y-6">
                        <div>
                            <div className="flex justify-between mb-2">
                                <span className="text-sm text-gray-600">Taxa de Conclusão</span>
                                <span className="text-sm font-medium">
                                    {(dashboard.health_metrics.project_completion_rate * 100).toFixed(1)}%
                                </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                    className="bg-green-600 h-2 rounded-full transition-all duration-500"
                                    style={{
                                        width: `${dashboard.health_metrics.project_completion_rate * 100}%`,
                                    }}
                                />
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between mb-2">
                                <span className="text-sm text-gray-600">Taxa de Disputa</span>
                                <span className="text-sm font-medium">
                                    {(dashboard.health_metrics.dispute_rate * 100).toFixed(1)}%
                                </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                    className={`h-2 rounded-full transition-all duration-500 ${dashboard.health_metrics.dispute_rate > 0.05
                                        ? 'bg-red-600'
                                        : 'bg-green-600'
                                        }`}
                                    style={{ width: `${Math.min(dashboard.health_metrics.dispute_rate * 100 * 5, 100)}%` }} // Amplified for visibility
                                />
                            </div>
                        </div>

                        <div className="pt-6 border-t border-gray-100">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-gray-600 mb-1">Tempo Médio de Atribuição</p>
                                    <p className="text-xl font-semibold text-gray-900">
                                        {dashboard.health_metrics.avg_time_to_assign.toFixed(1)} dias
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600 mb-1">Tempo Médio de Entrega</p>
                                    <p className="text-xl font-semibold text-gray-900">
                                        {dashboard.health_metrics.avg_delivery_time.toFixed(1)} dias
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Atividade Recente */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
                    <Activity className="w-5 h-5 text-blue-600" />
                    <span>Atividade Recente</span>
                </h3>
                <div className="space-y-4">
                    {dashboard.recent_activities.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">Sem atividades recentes</p>
                    ) : (
                        dashboard.recent_activities.map((activity, index) => (
                            <div key={index} className="flex items-start space-x-3 pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                                <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0" />
                                <div className="flex-1">
                                    <p className="text-sm text-gray-900 font-medium">{activity.description}</p>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        {new Date(activity.timestamp).toLocaleString('pt-BR')}
                                    </p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
