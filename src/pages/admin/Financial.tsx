import { useEffect, useState } from 'react';
import { useAdmin } from '@/hooks/useAdmin';
import { getFinancialDashboard, exportFinancialReport } from '@/services/adminFinancial';
import { DollarSign, TrendingUp, CreditCard, Users, Download, Calendar } from 'lucide-react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    Legend
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function Financial() {
    const { hasPermission } = useAdmin();
    const [loading, setLoading] = useState(true);
    const [dashboard, setDashboard] = useState<any>(null);
    const [dateRange, setDateRange] = useState({
        start: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        if (hasPermission('view_financial_data')) {
            loadDashboard();
        }
    }, [dateRange]);

    const loadDashboard = async () => {
        setLoading(true);
        try {
            const data = await getFinancialDashboard(dateRange.start, dateRange.end);
            setDashboard(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async () => {
        try {
            await exportFinancialReport(dateRange.start, dateRange.end);
        } catch (error) {
            console.error('Erro ao exportar:', error);
            alert('Erro ao exportar relatório');
        }
    };

    if (!hasPermission('view_financial_data')) {
        return (
            <div className="p-8 text-center text-gray-500">
                Você não tem permissão para visualizar dados financeiros.
            </div>
        );
    }

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
            </div>
        );
    }

    // Mock data for charts if real data is sparse/simple in the initial implementation
    const revenueData = [
        { name: 'Jan', revenue: 4000 },
        { name: 'Feb', revenue: 3000 },
        { name: 'Mar', revenue: 2000 },
        { name: 'Apr', revenue: 2780 },
        { name: 'May', revenue: 1890 },
        { name: 'Jun', revenue: 2390 },
        { name: 'Jul', revenue: 3490 },
    ];

    const videoTypeData = [
        { name: 'YouTube', value: 400 },
        { name: 'Shorts', value: 300 },
        { name: 'Reels', value: 300 },
        { name: 'TikTok', value: 200 },
    ];

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <h1 className="text-3xl font-bold text-gray-900">Dashboard Financeiro</h1>

                <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2 bg-white p-2 rounded-lg border border-gray-200">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        <input
                            type="date"
                            value={dateRange.start}
                            onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                            className="border-none text-sm focus:ring-0"
                        />
                        <span className="text-gray-400">-</span>
                        <input
                            type="date"
                            value={dateRange.end}
                            onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                            className="border-none text-sm focus:ring-0"
                        />
                    </div>

                    <button
                        onClick={handleExport}
                        className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <Download className="w-4 h-4" />
                        <span>Exportar Relatório</span>
                    </button>
                </div>
            </div>

            {/* Métricas */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Receita Total</p>
                            <h3 className="text-2xl font-bold text-gray-900 mt-1">
                                R$ {dashboard?.totalRevenue.toFixed(2)}
                            </h3>
                        </div>
                        <div className="p-2 bg-green-100 rounded-lg">
                            <DollarSign className="w-6 h-6 text-green-600" />
                        </div>
                    </div>
                    <p className="text-xs text-green-600 mt-4 flex items-center">
                        <TrendingUp className="w-3 h-3 mr-1" />
                        +12.5% vs mês anterior
                    </p>
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Taxas da Plataforma</p>
                            <h3 className="text-2xl font-bold text-gray-900 mt-1">
                                R$ {dashboard?.platformFees.toFixed(2)}
                            </h3>
                        </div>
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <CreditCard className="w-6 h-6 text-blue-600" />
                        </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-4">
                        5% sobre transações
                    </p>
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Projetos Concluídos</p>
                            <h3 className="text-2xl font-bold text-gray-900 mt-1">
                                {dashboard?.totalProjects}
                            </h3>
                        </div>
                        <div className="p-2 bg-purple-100 rounded-lg">
                            <TrendingUp className="w-6 h-6 text-purple-600" />
                        </div>
                    </div>
                    <p className="text-xs text-purple-600 mt-4">
                        +5 novos hoje
                    </p>
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Receita Assinaturas</p>
                            <h3 className="text-2xl font-bold text-gray-900 mt-1">
                                R$ {dashboard?.subscriptionRevenue.toFixed(2)}
                            </h3>
                        </div>
                        <div className="p-2 bg-orange-100 rounded-lg">
                            <Users className="w-6 h-6 text-orange-600" />
                        </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-4">
                        Planos ativos
                    </p>
                </div>
            </div>

            {/* Gráficos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Receita ao longo do tempo */}
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-900 mb-6">Receita Mensal</h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={revenueData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `R$${value}`} />
                                <Tooltip
                                    formatter={(value: number) => [`R$ ${value}`, 'Receita']}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="revenue"
                                    stroke="#2563eb"
                                    strokeWidth={3}
                                    dot={{ r: 4, fill: '#2563eb', strokeWidth: 2, stroke: '#fff' }}
                                    activeDot={{ r: 6, fill: '#2563eb' }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Breakdown por tipo */}
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-900 mb-6">Receita por Tipo de Vídeo</h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={videoTypeData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    fill="#8884d8"
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {videoTypeData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend verticalAlign="bottom" height={36} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Lista de Transações Recentes (Placeholder) */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">Transações Recentes</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                            <tr>
                                <th className="px-6 py-3">ID</th>
                                <th className="px-6 py-3">Projeto</th>
                                <th className="px-6 py-3">Data</th>
                                <th className="px-6 py-3">Valor</th>
                                <th className="px-6 py-3">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {/* Mock rows */}
                            <tr className="bg-white border-b hover:bg-gray-50">
                                <td className="px-6 py-4 font-medium text-gray-900">#TRX-1234</td>
                                <td className="px-6 py-4">Edição YouTube Vlog</td>
                                <td className="px-6 py-4">24/11/2025</td>
                                <td className="px-6 py-4">R$ 450,00</td>
                                <td className="px-6 py-4">
                                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                        Pago
                                    </span>
                                </td>
                            </tr>
                            <tr className="bg-white border-b hover:bg-gray-50">
                                <td className="px-6 py-4 font-medium text-gray-900">#TRX-1235</td>
                                <td className="px-6 py-4">Reels Instagram</td>
                                <td className="px-6 py-4">23/11/2025</td>
                                <td className="px-6 py-4">R$ 150,00</td>
                                <td className="px-6 py-4">
                                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                        Pendente
                                    </span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
