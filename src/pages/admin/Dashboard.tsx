import { useAdmin } from '@/hooks/useAdmin';
import { useEffect, useState } from 'react';
import { adminService } from '@/services/adminService';
import {
    Users,
    FileText,
    DollarSign,
    AlertCircle,
    CheckSquare,
    TrendingUp,
} from 'lucide-react';

interface DashboardStats {
    totalUsers: number;
    totalProjects: number;
    pendingApprovals: number;
    activeDisputes: number;
    monthlyRevenue: number;
    growthRate: number;
}

export default function AdminDashboard() {
    const { admin } = useAdmin();
    const [stats, setStats] = useState<DashboardStats>({
        totalUsers: 0,
        totalProjects: 0,
        pendingApprovals: 0,
        activeDisputes: 0,
        monthlyRevenue: 0,
        growthRate: 0,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        try {
            // Buscar editores pendentes
            const pendingEditors = await adminService.getPendingEditors();

            // TODO: Buscar outras estatísticas quando as tabelas estiverem criadas
            setStats({
                totalUsers: 0, // Será implementado
                totalProjects: 0, // Será implementado
                pendingApprovals: pendingEditors.length,
                activeDisputes: 0, // Será implementado
                monthlyRevenue: 0, // Será implementado
                growthRate: 0, // Será implementado
            });
        } catch (error) {
            console.error('Erro ao carregar dados do dashboard:', error);
        } finally {
            setLoading(false);
        }
    };

    const statCards = [
        {
            title: 'Total de Usuários',
            value: stats.totalUsers,
            icon: <Users className="w-6 h-6" />,
            color: 'bg-blue-500',
            change: '+12%',
        },
        {
            title: 'Projetos Ativos',
            value: stats.totalProjects,
            icon: <FileText className="w-6 h-6" />,
            color: 'bg-green-500',
            change: '+8%',
        },
        {
            title: 'Aprovações Pendentes',
            value: stats.pendingApprovals,
            icon: <CheckSquare className="w-6 h-6" />,
            color: 'bg-yellow-500',
            change: stats.pendingApprovals > 0 ? 'Requer atenção' : 'Tudo ok',
        },
        {
            title: 'Disputas Ativas',
            value: stats.activeDisputes,
            icon: <AlertCircle className="w-6 h-6" />,
            color: 'bg-red-500',
            change: stats.activeDisputes > 0 ? 'Urgente' : 'Nenhuma',
        },
        {
            title: 'Receita Mensal',
            value: `R$ ${stats.monthlyRevenue.toLocaleString('pt-BR')}`,
            icon: <DollarSign className="w-6 h-6" />,
            color: 'bg-purple-500',
            change: `+${stats.growthRate}%`,
        },
        {
            title: 'Crescimento',
            value: `${stats.growthRate}%`,
            icon: <TrendingUp className="w-6 h-6" />,
            color: 'bg-indigo-500',
            change: 'Este mês',
        },
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
            </div>
        );
    }

    return (
        <div className="p-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Dashboard Administrativo</h1>
                <p className="text-gray-600 mt-2">
                    Bem-vindo de volta, <span className="font-medium">{admin?.role.replace('_', ' ')}</span>
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {statCards.map((stat, index) => (
                    <div
                        key={index}
                        className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className={`${stat.color} p-3 rounded-lg text-white`}>
                                {stat.icon}
                            </div>
                            <span className="text-sm text-gray-500">{stat.change}</span>
                        </div>
                        <h3 className="text-gray-600 text-sm font-medium mb-1">{stat.title}</h3>
                        <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                    </div>
                ))}
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Ações Rápidas</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <button className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left">
                        <CheckSquare className="w-6 h-6 text-blue-600 mb-2" />
                        <h3 className="font-medium text-gray-900">Aprovar Editores</h3>
                        <p className="text-sm text-gray-500 mt-1">{stats.pendingApprovals} pendentes</p>
                    </button>

                    <button className="p-4 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors text-left">
                        <Users className="w-6 h-6 text-green-600 mb-2" />
                        <h3 className="font-medium text-gray-900">Gerenciar Usuários</h3>
                        <p className="text-sm text-gray-500 mt-1">Ver todos os usuários</p>
                    </button>

                    <button className="p-4 border-2 border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors text-left">
                        <DollarSign className="w-6 h-6 text-purple-600 mb-2" />
                        <h3 className="font-medium text-gray-900">Relatórios</h3>
                        <p className="text-sm text-gray-500 mt-1">Ver dados financeiros</p>
                    </button>

                    <button className="p-4 border-2 border-gray-200 rounded-lg hover:border-red-500 hover:bg-red-50 transition-colors text-left">
                        <AlertCircle className="w-6 h-6 text-red-600 mb-2" />
                        <h3 className="font-medium text-gray-900">Disputas</h3>
                        <p className="text-sm text-gray-500 mt-1">{stats.activeDisputes} ativas</p>
                    </button>
                </div>
            </div>

            {/* Recent Activity */}
            <div className="mt-8 bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Atividade Recente</h2>
                <div className="space-y-4">
                    <div className="flex items-center justify-between py-3 border-b border-gray-100">
                        <div className="flex items-center space-x-3">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <div>
                                <p className="text-sm font-medium text-gray-900">Sistema inicializado</p>
                                <p className="text-xs text-gray-500">Aguardando criação das tabelas no banco</p>
                            </div>
                        </div>
                        <span className="text-xs text-gray-400">Agora</span>
                    </div>

                    <div className="text-center py-8 text-gray-500">
                        <p className="text-sm">Nenhuma atividade recente</p>
                        <p className="text-xs mt-1">As atividades aparecerão aqui após a configuração do banco de dados</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
