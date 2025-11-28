import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    getAdminUsersList,
    getUsersStats,
    AdminUserListItem,
    UserFilters,
} from '@/services/adminUsers';
import {
    Search,
    Filter,
    Users,
    UserCheck,
    UserX,
    DollarSign,
    Eye,
    Ban,
    CheckCircle,
    AlertCircle,
    Download,
    ChevronDown,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function PlatformUsers() {
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [users, setUsers] = useState<AdminUserListItem[]>([]);
    const [stats, setStats] = useState<any>(null);

    // Filtros
    const [filters, setFilters] = useState<UserFilters>({
        search: '',
        user_type: 'all',
        payment_status: 'all',
        recent_signup: false,
        sort_by: 'created_at',
        sort_order: 'desc',
    });

    const [showFilters, setShowFilters] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        // Debounce para busca
        const timer = setTimeout(() => {
            loadUsers();
        }, 300);

        return () => clearTimeout(timer);
    }, [filters]);

    const loadData = async () => {
        await Promise.all([loadUsers(), loadStats()]);
    };

    const loadUsers = async () => {
        setLoading(true);
        try {
            const data = await getAdminUsersList(filters);
            setUsers(data);
        } catch (error) {
            console.error('Erro ao carregar usuários:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadStats = async () => {
        try {
            const data = await getUsersStats();
            setStats(data);
        } catch (error) {
            console.error('Erro ao carregar estatísticas:', error);
        }
    };

    const handleFilterChange = (key: keyof UserFilters, value: any) => {
        setFilters((prev) => ({ ...prev, [key]: value }));
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        }).format(value);
    };

    const getLastActiveText = (date: string) => {
        return formatDistanceToNow(new Date(date), {
            addSuffix: true,
            locale: ptBR,
        });
    };

    const getUserTypeLabel = (type: string) => {
        return type === 'creator' ? 'Creator' : 'Editor';
    };

    const getUserTypeBadge = (type: string) => {
        return type === 'creator'
            ? 'bg-blue-100 text-blue-800'
            : 'bg-purple-100 text-purple-800';
    };

    if (loading && !users.length) {
        return (
            <div className="p-8">
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
                </div>
            </div>
        );
    }

    return (
        <div>
            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-medium text-gray-600">Total de Usuários</h3>
                            <Users className="w-8 h-8 text-blue-600" />
                        </div>
                        <p className="text-3xl font-bold text-gray-900">{stats.total_users}</p>
                        <p className="text-sm text-green-600 mt-2 font-medium">
                            +{stats.new_users_30d} nos últimos 30 dias
                        </p>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-medium text-gray-600">Creators</h3>
                            <UserCheck className="w-8 h-8 text-green-600" />
                        </div>
                        <p className="text-3xl font-bold text-gray-900">{stats.total_creators}</p>
                        <p className="text-sm text-gray-500 mt-2">Criadores de conteúdo</p>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-medium text-gray-600">Editores</h3>
                            <UserCheck className="w-8 h-8 text-purple-600" />
                        </div>
                        <p className="text-3xl font-bold text-gray-900">{stats.total_editors}</p>
                        <p className="text-sm text-gray-500 mt-2">
                            {stats.active_subscriptions} assinaturas ativas
                        </p>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-medium text-gray-600">Usuários Banidos</h3>
                            <UserX className="w-8 h-8 text-red-600" />
                        </div>
                        <p className="text-3xl font-bold text-gray-900">{stats.banned_users}</p>
                        <p className="text-sm text-gray-500 mt-2">Bloqueados da plataforma</p>
                    </div>
                </div>
            )}

            {/* Filters Bar */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                <div className="flex flex-col lg:flex-row gap-4">
                    {/* Search */}
                    <div className="flex-1">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                                type="text"
                                placeholder="Buscar por nome ou email..."
                                value={filters.search}
                                onChange={(e) => handleFilterChange('search', e.target.value)}
                                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                    </div>

                    {/* Filter Toggle */}
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium flex items-center justify-center space-x-2 transition-colors"
                    >
                        <Filter className="w-5 h-5" />
                        <span>Filtros</span>
                        <ChevronDown
                            className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''
                                }`}
                        />
                    </button>

                    {/* Export Button */}
                    <button
                        onClick={() => alert('Exportar para CSV - Implementar')}
                        className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium flex items-center justify-center space-x-2 transition-colors"
                    >
                        <Download className="w-5 h-5" />
                        <span>Exportar</span>
                    </button>
                </div>

                {/* Extended Filters */}
                {showFilters && (
                    <div className="mt-6 pt-6 border-t border-gray-200">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            {/* Tipo de Usuário */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Tipo de Usuário
                                </label>
                                <select
                                    value={filters.user_type}
                                    onChange={(e) => handleFilterChange('user_type', e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="all">Todos</option>
                                    <option value="creator">Creators</option>
                                    <option value="editor">Editores</option>
                                </select>
                            </div>

                            {/* Status de Pagamento */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Status de Pagamento
                                </label>
                                <select
                                    value={filters.payment_status}
                                    onChange={(e) => handleFilterChange('payment_status', e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="all">Todos</option>
                                    <option value="paid">Em dia</option>
                                    <option value="pending">Com pagamento pendente</option>
                                </select>
                            </div>

                            {/* Ordenar por */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Ordenar por
                                </label>
                                <select
                                    value={filters.sort_by}
                                    onChange={(e) => handleFilterChange('sort_by', e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="created_at">Data de Cadastro</option>
                                    <option value="last_active">Última Atividade</option>
                                    <option value="name">Nome</option>
                                </select>
                            </div>

                            {/* Cadastro Recente */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Cadastro
                                </label>
                                <label className="flex items-center space-x-3 cursor-pointer p-2">
                                    <input
                                        type="checkbox"
                                        checked={filters.recent_signup}
                                        onChange={(e) => handleFilterChange('recent_signup', e.target.checked)}
                                        className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                                    />
                                    <span className="text-sm text-gray-700">Últimos 30 dias</span>
                                </label>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Usuário
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Contato
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Tipo
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Última Atividade
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Pagamento Retido
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Projetos Ativos
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Ações
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {users.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center justify-center">
                                            <Users className="w-12 h-12 text-gray-400 mb-4" />
                                            <p className="text-gray-500 text-lg">Nenhum usuário encontrado</p>
                                            <p className="text-gray-400 text-sm mt-2">
                                                Tente ajustar os filtros de busca
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                users.map((user) => (
                                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                        {/* Usuário */}
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                                                    {user.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="ml-4">
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {user.name}
                                                    </div>
                                                    <div className="text-sm text-gray-500">
                                                        {user.total_projects} projetos totais
                                                    </div>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Contato */}
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-900">{user.email}</div>
                                            <div className="text-sm text-gray-500">
                                                {user.phone || 'Sem telefone'}
                                            </div>
                                        </td>

                                        {/* Tipo */}
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span
                                                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getUserTypeBadge(
                                                    user.user_type
                                                )}`}
                                            >
                                                {getUserTypeLabel(user.user_type)}
                                            </span>
                                            {user.subscription_status === 'active' && (
                                                <div className="text-xs text-green-600 mt-1 flex items-center">
                                                    <CheckCircle className="w-3 h-3 mr-1" />
                                                    Assinatura ativa
                                                </div>
                                            )}
                                        </td>

                                        {/* Última Atividade */}
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">
                                                {getLastActiveText(user.last_active_at)}
                                            </div>
                                        </td>

                                        {/* Pagamento Retido */}
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {user.payment_held_amount > 0 ? (
                                                <div className="flex items-center">
                                                    <DollarSign className="w-4 h-4 text-orange-500 mr-1" />
                                                    <span className="text-sm font-medium text-orange-600">
                                                        {formatCurrency(user.payment_held_amount)}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-sm text-gray-400">-</span>
                                            )}
                                        </td>

                                        {/* Projetos Ativos */}
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {user.active_projects_count > 0 ? (
                                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                    {user.active_projects_count}{' '}
                                                    {user.active_projects_count === 1 ? 'projeto' : 'projetos'}
                                                </span>
                                            ) : (
                                                <span className="text-sm text-gray-400">Nenhum</span>
                                            )}
                                        </td>

                                        {/* Status */}
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {user.is_banned ? (
                                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                    <Ban className="w-3 h-3 mr-1" />
                                                    Banido
                                                </span>
                                            ) : user.approval_status === 'pending' ? (
                                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                                    <AlertCircle className="w-3 h-3 mr-1" />
                                                    Pendente
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                    <CheckCircle className="w-3 h-3 mr-1" />
                                                    Ativo
                                                </span>
                                            )}
                                        </td>

                                        {/* Ações */}
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button
                                                onClick={() => navigate(`/admin/users/${user.id}`)}
                                                className="text-blue-600 hover:text-blue-900 inline-flex items-center space-x-1"
                                            >
                                                <Eye className="w-4 h-4" />
                                                <span>Ver Detalhes</span>
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer com contador */}
                <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-700">
                            Mostrando <span className="font-medium">{users.length}</span> usuários
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
