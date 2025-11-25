import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '@/hooks/useAdmin';
import { getDisputes } from '@/services/adminDisputes';
import { AlertCircle, Clock, CheckCircle, Eye } from 'lucide-react';
import { DisputeStatus, DisputePriority } from '@/types/admin';

export default function Disputes() {
    const { hasPermission } = useAdmin();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [disputes, setDisputes] = useState<any[]>([]);
    const [statusFilter, setStatusFilter] = useState<DisputeStatus | 'all'>('open');
    const [priorityFilter, setPriorityFilter] = useState<DisputePriority | 'all'>('all');

    useEffect(() => {
        if (!hasPermission('view_disputes')) {
            navigate('/admin');
            return;
        }
        loadDisputes();
    }, [statusFilter, priorityFilter]);

    const loadDisputes = async () => {
        setLoading(true);
        try {
            const data = await getDisputes(
                statusFilter === 'all' ? undefined : statusFilter,
                priorityFilter === 'all' ? undefined : priorityFilter
            );
            setDisputes(data || []);
        } catch (error) {
            console.error('Erro ao carregar disputas:', error);
        } finally {
            setLoading(false);
        }
    };

    const getPriorityColor = (priority: string) => {
        const colors = {
            low: 'bg-gray-100 text-gray-800',
            medium: 'bg-blue-100 text-blue-800',
            high: 'bg-orange-100 text-orange-800',
            urgent: 'bg-red-100 text-red-800',
        };
        return colors[priority as keyof typeof colors] || colors.medium;
    };

    const getCategoryLabel = (category: string) => {
        const labels: Record<string, string> = {
            delivery_delay: 'Atraso na Entrega',
            quality_issue: 'Problema de Qualidade',
            payment_issue: 'Problema de Pagamento',
            communication_issue: 'Problema de Comunicação',
            scope_change: 'Mudança de Escopo',
            inappropriate_behavior: 'Comportamento Inadequado',
            other: 'Outro',
        };
        return labels[category] || category;
    };

    const getDaysOpen = (createdAt: string) => {
        return Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24));
    };

    if (loading) {
        return (
            <div className="p-8">
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
                </div>
            </div>
        );
    }

    return (
        <div className="p-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Disputas e Reclamações</h1>
                <p className="text-gray-600">Gerencie conflitos entre creators e editores</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                {['open', 'investigating', 'waiting_response', 'resolved'].map((status) => {
                    const count = disputes.filter((d) => d.status === status).length;
                    const icon =
                        status === 'resolved' ? (
                            <CheckCircle className="w-8 h-8" />
                        ) : (
                            <AlertCircle className="w-8 h-8" />
                        );
                    const colors =
                        status === 'open'
                            ? 'bg-red-50 border-red-200 text-red-600'
                            : status === 'investigating'
                                ? 'bg-yellow-50 border-yellow-200 text-yellow-600'
                                : status === 'resolved'
                                    ? 'bg-green-50 border-green-200 text-green-600'
                                    : 'bg-blue-50 border-blue-200 text-blue-600';

                    return (
                        <div key={status} className={`rounded-lg p-6 border ${colors}`}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium capitalize">
                                        {status.replace('_', ' ')}
                                    </p>
                                    <p className="text-3xl font-bold mt-1">{count}</p>
                                </div>
                                {icon}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Filters */}
            <div className="mb-6 flex flex-wrap gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as any)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="all">Todos</option>
                        <option value="open">Abertos</option>
                        <option value="investigating">Investigando</option>
                        <option value="waiting_response">Aguardando Resposta</option>
                        <option value="resolved">Resolvidos</option>
                        <option value="closed">Fechados</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Prioridade</label>
                    <select
                        value={priorityFilter}
                        onChange={(e) => setPriorityFilter(e.target.value as any)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="all">Todas</option>
                        <option value="urgent">Urgente</option>
                        <option value="high">Alta</option>
                        <option value="medium">Média</option>
                        <option value="low">Baixa</option>
                    </select>
                </div>
            </div>

            {/* Disputes List */}
            <div className="space-y-4">
                {disputes.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
                        <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500 text-lg">Nenhuma disputa encontrada</p>
                    </div>
                ) : (
                    disputes.map((dispute) => (
                        <div
                            key={dispute.id}
                            className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    {/* Title and Category */}
                                    <div className="flex items-center space-x-3 mb-3">
                                        <h3 className="text-lg font-semibold text-gray-900">{dispute.title}</h3>
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPriorityColor(dispute.priority)}`}>
                                            {dispute.priority.toUpperCase()}
                                        </span>
                                    </div>

                                    {/* Details */}
                                    <div className="space-y-2 mb-4">
                                        <p className="text-sm text-gray-600">
                                            <span className="font-medium">Projeto:</span> {dispute.project.title}
                                        </p>
                                        <p className="text-sm text-gray-600">
                                            <span className="font-medium">Categoria:</span>{' '}
                                            {getCategoryLabel(dispute.category)}
                                        </p>
                                        <p className="text-sm text-gray-600">
                                            <span className="font-medium">Aberto por:</span>{' '}
                                            {dispute.opened_by_user.email}
                                        </p>
                                        <p className="text-sm text-gray-600">
                                            <span className="font-medium">Contra:</span> {dispute.disputed_user.email}
                                        </p>
                                    </div>

                                    {/* Timeline */}
                                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                                        <span className="flex items-center space-x-1">
                                            <Clock className="w-4 h-4" />
                                            <span>Há {getDaysOpen(dispute.created_at)} dias</span>
                                        </span>
                                        <span className="capitalize">{dispute.status.replace('_', ' ')}</span>
                                    </div>
                                </div>

                                {/* Action Button */}
                                <button
                                    onClick={() => navigate(`/admin/disputes/${dispute.id}`)}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center space-x-2"
                                >
                                    <Eye className="w-4 h-4" />
                                    <span>Ver Detalhes</span>
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
