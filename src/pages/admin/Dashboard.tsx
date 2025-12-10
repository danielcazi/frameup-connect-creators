import { useAdmin } from '@/hooks/useAdmin';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { adminService } from '@/services/adminService';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
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

interface RecentActivity {
    id: string;
    type: 'new_user' | 'new_project' | 'editor_approved' | 'dispute' | 'payment';
    title: string;
    description: string;
    created_at: string;
    color: string;
}

export default function AdminDashboard() {
    const { admin } = useAdmin();
    const navigate = useNavigate();
    const [stats, setStats] = useState<DashboardStats>({
        totalUsers: 0,
        totalProjects: 0,
        pendingApprovals: 0,
        activeDisputes: 0,
        monthlyRevenue: 0,
        growthRate: 0,
    });
    const [activities, setActivities] = useState<RecentActivity[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDashboardData();
        loadRecentActivities();
    }, []);

    const loadDashboardData = async () => {
        try {
            // Buscar total de usuários (excluindo admins)
            const { count: totalUsers } = await supabase
                .from('users')
                .select('id', { count: 'exact', head: true })
                .in('user_type', ['creator', 'editor']);

            // Buscar projetos ativos (status: open, in_progress, in_review)
            const { count: totalProjects } = await supabase
                .from('projects')
                .select('id', { count: 'exact', head: true })
                .in('status', ['open', 'in_progress', 'in_review']);

            // Buscar editores pendentes de aprovação
            const { count: pendingApprovals } = await supabase
                .from('user_metadata_extension')
                .select('user_id', { count: 'exact', head: true })
                .eq('approval_status', 'pending');

            // Buscar disputas ativas
            const { count: activeDisputes } = await supabase
                .from('projects')
                .select('id', { count: 'exact', head: true })
                .eq('has_dispute', true);

            // Buscar receita do mês atual (projetos pagos)
            const startOfMonth = new Date();
            startOfMonth.setDate(1);
            startOfMonth.setHours(0, 0, 0, 0);

            const { data: paidProjects } = await supabase
                .from('projects')
                .select('total_price')
                .eq('payment_status', 'paid')
                .gte('paid_at', startOfMonth.toISOString());

            const monthlyRevenue = paidProjects?.reduce((sum, p) => sum + (Number(p.total_price) || 0), 0) || 0;

            // Calcular crescimento (novos usuários este mês vs mês anterior)
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const sixtyDaysAgo = new Date();
            sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

            const { count: newUsersThisMonth } = await supabase
                .from('users')
                .select('id', { count: 'exact', head: true })
                .gte('created_at', thirtyDaysAgo.toISOString())
                .in('user_type', ['creator', 'editor']);

            const { count: newUsersLastMonth } = await supabase
                .from('users')
                .select('id', { count: 'exact', head: true })
                .gte('created_at', sixtyDaysAgo.toISOString())
                .lt('created_at', thirtyDaysAgo.toISOString())
                .in('user_type', ['creator', 'editor']);

            const growthRate = newUsersLastMonth && newUsersLastMonth > 0
                ? Math.round(((newUsersThisMonth || 0) - newUsersLastMonth) / newUsersLastMonth * 100)
                : newUsersThisMonth || 0;

            setStats({
                totalUsers: totalUsers || 0,
                totalProjects: totalProjects || 0,
                pendingApprovals: pendingApprovals || 0,
                activeDisputes: activeDisputes || 0,
                monthlyRevenue: monthlyRevenue,
                growthRate: growthRate,
            });
        } catch (error) {
            console.error('Erro ao carregar dados do dashboard:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadRecentActivities = async () => {
        try {
            const recentActivities: RecentActivity[] = [];

            // Buscar últimos 5 usuários cadastrados
            const { data: newUsers } = await supabase
                .from('users')
                .select('id, full_name, email, user_type, created_at')
                .in('user_type', ['creator', 'editor'])
                .order('created_at', { ascending: false })
                .limit(3);

            newUsers?.forEach(user => {
                recentActivities.push({
                    id: `user-${user.id}`,
                    type: 'new_user',
                    title: `Novo ${user.user_type === 'creator' ? 'Creator' : 'Editor'} cadastrado`,
                    description: user.full_name || user.email,
                    created_at: user.created_at,
                    color: user.user_type === 'creator' ? 'bg-blue-500' : 'bg-purple-500',
                });
            });

            // Buscar últimos projetos criados
            const { data: newProjects } = await supabase
                .from('projects')
                .select('id, title, created_at')
                .order('created_at', { ascending: false })
                .limit(3);

            newProjects?.forEach(project => {
                recentActivities.push({
                    id: `project-${project.id}`,
                    type: 'new_project',
                    title: 'Novo projeto criado',
                    description: project.title,
                    created_at: project.created_at,
                    color: 'bg-green-500',
                });
            });

            // Buscar disputas recentes
            const { data: disputes } = await supabase
                .from('projects')
                .select('id, title, updated_at')
                .eq('has_dispute', true)
                .order('updated_at', { ascending: false })
                .limit(2);

            disputes?.forEach(dispute => {
                recentActivities.push({
                    id: `dispute-${dispute.id}`,
                    type: 'dispute',
                    title: 'Disputa aberta',
                    description: dispute.title,
                    created_at: dispute.updated_at,
                    color: 'bg-red-500',
                });
            });

            // Ordenar por data mais recente
            recentActivities.sort((a, b) =>
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );

            setActivities(recentActivities.slice(0, 5));
        } catch (error) {
            console.error('Erro ao carregar atividades:', error);
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
                    <button
                        type="button"
                        onClick={() => navigate('/admin/approvals')}
                        className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
                    >
                        <CheckSquare className="w-6 h-6 text-blue-600 mb-2" />
                        <h3 className="font-medium text-gray-900">Aprovar Editores</h3>
                        <p className="text-sm text-gray-500 mt-1">{stats.pendingApprovals} pendentes</p>
                    </button>

                    <button
                        type="button"
                        onClick={() => navigate('/admin/users')}
                        className="p-4 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors text-left"
                    >
                        <Users className="w-6 h-6 text-green-600 mb-2" />
                        <h3 className="font-medium text-gray-900">Gerenciar Usuários</h3>
                        <p className="text-sm text-gray-500 mt-1">Ver todos os usuários</p>
                    </button>

                    <button
                        type="button"
                        onClick={() => navigate('/admin/financial')}
                        className="p-4 border-2 border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors text-left"
                    >
                        <DollarSign className="w-6 h-6 text-purple-600 mb-2" />
                        <h3 className="font-medium text-gray-900">Relatórios</h3>
                        <p className="text-sm text-gray-500 mt-1">Ver dados financeiros</p>
                    </button>

                    <button
                        type="button"
                        onClick={() => navigate('/admin/disputes')}
                        className="p-4 border-2 border-gray-200 rounded-lg hover:border-red-500 hover:bg-red-50 transition-colors text-left"
                    >
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
                    {activities.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <p className="text-sm">Nenhuma atividade recente</p>
                            <p className="text-xs mt-1">As atividades aparecerão aqui conforme a plataforma for usada</p>
                        </div>
                    ) : (
                        activities.map((activity) => (
                            <div
                                key={activity.id}
                                className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
                            >
                                <div className="flex items-center space-x-3">
                                    <div className={`w-2 h-2 ${activity.color} rounded-full`}></div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                                        <p className="text-xs text-gray-500">{activity.description}</p>
                                    </div>
                                </div>
                                <span className="text-xs text-gray-400">
                                    {formatDistanceToNow(new Date(activity.created_at), {
                                        addSuffix: true,
                                        locale: ptBR,
                                    })}
                                </span>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
