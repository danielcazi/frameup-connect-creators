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
        <div className="p-4 max-w-full">
            {/* Stats Cards - Compactos */}
            {stats && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-gray-500">Total de Usuários</p>
                                <p className="text-2xl font-bold text-gray-900">{stats.total_users}</p>
                            </div>
                            <Users className="w-8 h-8 text-blue-600" />
                        </div>
                        <p className="text-xs text-green-600 mt-1">+{stats.new_users_30d} nos últimos 30 dias</p>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-gray-500">Creators</p>
                                <p className="text-2xl font-bold text-gray-900">{stats.total_creators}</p>
                            </div>
                            <UserCheck className="w-8 h-8 text-green-600" />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Criadores de conteúdo</p>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-gray-500">Editores</p>
                                <p className="text-2xl font-bold text-gray-900">{stats.total_editors}</p>
                            </div>
                            <UserCheck className="w-8 h-8 text-purple-600" />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{stats.active_subscriptions} assinaturas ativas</p>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-gray-500">Usuários Banidos</p>
                                <p className="text-2xl font-bold text-gray-900">{stats.banned_users}</p>
                            </div>
                            <UserX className="w-8 h-8 text-red-600" />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Bloqueados da plataforma</p>
                    </div>
                </div>
            )}

            {/* Filters Bar - Compacto */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
                <div className="flex flex-col lg:flex-row gap-3">
                    {/* Search */}
                    <div className="flex-1">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input
                                type="text"
                                placeholder="Buscar por nome ou email..."
                                value={filters.search}
                                onChange={(e) => handleFilterChange('search', e.target.value)}
                                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                    </div>

                    {/* Filter Toggle */}
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors text-sm"
                    >
                        <Filter className="w-4 h-4" />
                        Filtros
                        <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Export Button */}
                    <button
                        onClick={() => alert('Exportar para CSV - Implementar')}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors text-sm"
                    >
                        <Download className="w-4 h-4" />
                        Exportar
                    </button>
                </div>

                {/* Extended Filters - Compacto */}
                {showFilters && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Tipo</label>
                                <select
                                    value={filters.user_type}
                                    onChange={(e) => handleFilterChange('user_type', e.target.value)}
                                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="all">Todos</option>
                                    <option value="creator">Creators</option>
                                    <option value="editor">Editores</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Pagamento</label>
                                <select
                                    value={filters.payment_status}
                                    onChange={(e) => handleFilterChange('payment_status', e.target.value)}
                                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="all">Todos</option>
                                    <option value="paid">Em dia</option>
                                    <option value="pending">Pendente</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Ordenar</label>
                                <select
                                    value={filters.sort_by}
                                    onChange={(e) => handleFilterChange('sort_by', e.target.value)}
                                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="created_at">Data Cadastro</option>
                                    <option value="last_active">Última Atividade</option>
                                    <option value="name">Nome</option>
                                </select>
                            </div>
                            <div className="flex items-end">
                                <label className="flex items-center gap-2 cursor-pointer text-sm">
                                    <input
                                        type="checkbox"
                                        checked={filters.recent_signup}
                                        onChange={(e) => handleFilterChange('recent_signup', e.target.checked)}
                                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                    />
                                    Últimos 30 dias
                                </label>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Users Table - Com altura fixa e scroll interno */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-auto" style={{ maxHeight: 'calc(100vh - 380px)' }}>
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 sticky top-0 z-10">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Usuário
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Contato
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Tipo
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Última Atividade
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Pagamento Retido
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Projetos Ativos
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Ações
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {users.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-4 py-12 text-center">
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
                                        <td className="px-4 py-3 whitespace-nowrap">
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
                                        <td className="px-4 py-3">
                                            <div className="text-sm text-gray-900">{user.email}</div>
                                            <div className="text-sm text-gray-500">
                                                {user.phone || 'Sem telefone'}
                                            </div>
                                        </td>

                                        {/* Tipo */}
                                        <td className="px-4 py-3 whitespace-nowrap">
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
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">
                                                {getLastActiveText(user.last_active_at)}
                                            </div>
                                        </td>

                                        {/* Pagamento Retido */}
                                        <td className="px-4 py-3 whitespace-nowrap">
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
                                        <td className="px-4 py-3 whitespace-nowrap">
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
                                        <td className="px-4 py-3 whitespace-nowrap">
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
                                        <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
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

                {/* Mobile Card View */}
                <div className="md:hidden">
                    {users.length === 0 ? (
                        <div className="p-8 text-center">
                            <Users className="w-12 h-12 text-gray-400 mb-4 mx-auto" />
                            <p className="text-gray-500 text-lg">Nenhum usuário encontrado</p>
                            <p className="text-gray-400 text-sm mt-2">
                                Tente ajustar os filtros de busca
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-200">
                            {users.map((user) => (
                                <div key={user.id} className="p-4 bg-white hover:bg-gray-50">
                                    {/* Header do Card */}
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                                                {user.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <h3 className="font-medium text-gray-900">{user.name}</h3>
                                                <div className="flex items-center space-x-2">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getUserTypeBadge(user.user_type)}`}>
                                                        {getUserTypeLabel(user.user_type)}
                                                    </span>
                                                    <span className="text-xs text-gray-500">
                                                        {getLastActiveText(user.last_active_at)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Info Grid */}
                                    <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                                        <div>
                                            <p className="text-gray-500 text-xs">Email</p>
                                            <p className="text-gray-900 truncate">{user.email}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-500 text-xs">Status</p>
                                            <div className="flex items-center mt-0.5">
                                                {user.is_banned ? (
                                                    <span className="text-red-600 flex items-center text-xs font-medium">
                                                        <Ban className="w-3 h-3 mr-1" /> Banido
                                                    </span>
                                                ) : user.approval_status === 'pending' ? (
                                                    <span className="text-yellow-600 flex items-center text-xs font-medium">
                                                        <AlertCircle className="w-3 h-3 mr-1" /> Pendente
                                                    </span>
                                                ) : (
                                                    <span className="text-green-600 flex items-center text-xs font-medium">
                                                        <CheckCircle className="w-3 h-3 mr-1" /> Ativo
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        {user.payment_held_amount > 0 && (
                                            <div>
                                                <p className="text-gray-500 text-xs">Retido</p>
                                                <p className="text-orange-600 font-medium">{formatCurrency(user.payment_held_amount)}</p>
                                            </div>
                                        )}
                                        {user.active_projects_count > 0 && (
                                            <div>
                                                <p className="text-gray-500 text-xs">Projetos Ativos</p>
                                                <p className="text-gray-900">{user.active_projects_count}</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Action Button */}
                                    <button
                                        onClick={() => navigate(`/admin/users/${user.id}`)}
                                        className="w-full py-2 flex items-center justify-center space-x-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                                    >
                                        <Eye className="w-4 h-4" />
                                        <span>Ver Detalhes</span>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
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
