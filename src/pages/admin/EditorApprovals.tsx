import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '@/hooks/useAdmin';
import { getApprovalQueue } from '@/services/adminApprovals';
import { Clock, CheckCircle, XCircle, ExternalLink, AlertTriangle } from 'lucide-react';

export default function EditorApprovals() {
    const { hasPermission } = useAdmin();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [queue, setQueue] = useState<any[]>([]);
    const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');

    useEffect(() => {
        if (!hasPermission('approve_editors')) {
            navigate('/admin');
            return;
        }
        loadQueue();
    }, [filter, hasPermission, navigate]);

    const loadQueue = async () => {
        setLoading(true);
        try {
            const data = await getApprovalQueue(filter);
            setQueue(data || []);
        } catch (error) {
            console.error('Erro ao carregar fila:', error);
        } finally {
            setLoading(false);
        }
    };

    const getDaysWaiting = (submittedAt: string) => {
        const days = Math.floor(
            (Date.now() - new Date(submittedAt).getTime()) / (1000 * 60 * 60 * 24)
        );
        return days;
    };

    const getFilteredStats = () => {
        return {
            pending: queue.filter((q) => q.status === 'pending').length,
            approved: queue.filter((q) => q.status === 'approved').length,
            rejected: queue.filter((q) => q.status === 'rejected').length,
            withAlerts: queue.filter(
                (q) => q.has_duplicate_portfolio || q.has_suspicious_links
            ).length,
        };
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

    const stats = getFilteredStats();

    return (
        <div className="p-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    Aprovação de Editores
                </h1>
                <p className="text-gray-600">
                    Analise e aprove novos editores para o marketplace
                </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-yellow-50 rounded-lg p-6 border border-yellow-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-yellow-600 font-medium">Pendentes</p>
                            <p className="text-3xl font-bold text-yellow-900 mt-1">
                                {stats.pending}
                            </p>
                        </div>
                        <Clock className="w-8 h-8 text-yellow-600" />
                    </div>
                </div>

                <div className="bg-green-50 rounded-lg p-6 border border-green-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-green-600 font-medium">Aprovados</p>
                            <p className="text-3xl font-bold text-green-900 mt-1">
                                {stats.approved}
                            </p>
                        </div>
                        <CheckCircle className="w-8 h-8 text-green-600" />
                    </div>
                </div>

                <div className="bg-red-50 rounded-lg p-6 border border-red-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-red-600 font-medium">Rejeitados</p>
                            <p className="text-3xl font-bold text-red-900 mt-1">
                                {stats.rejected}
                            </p>
                        </div>
                        <XCircle className="w-8 h-8 text-red-600" />
                    </div>
                </div>

                <div className="bg-orange-50 rounded-lg p-6 border border-orange-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-orange-600 font-medium">Com Alertas</p>
                            <p className="text-3xl font-bold text-orange-900 mt-1">
                                {stats.withAlerts}
                            </p>
                        </div>
                        <AlertTriangle className="w-8 h-8 text-orange-600" />
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="mb-6 flex space-x-2">
                {(['pending', 'approved', 'rejected', 'all'] as const).map((f) => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === f
                                ? 'bg-blue-600 text-white'
                                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                            }`}
                    >
                        {f === 'all' ? 'Todos' : f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                ))}
            </div>

            {/* Queue List */}
            <div className="space-y-4">
                {queue.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
                        <p className="text-gray-500 text-lg">Nenhum editor na fila</p>
                    </div>
                ) : (
                    queue.map((item) => (
                        <div
                            key={item.id}
                            className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    {/* Editor Info */}
                                    <div className="flex items-center space-x-3 mb-3">
                                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                                            {item.editor?.email?.[0]?.toUpperCase() || '?'}
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-semibold text-gray-900">
                                                {item.editor?.email || 'Email não disponível'}
                                            </h3>
                                            <p className="text-sm text-gray-500">
                                                Aguardando há {getDaysWaiting(item.submitted_at)} dias
                                            </p>
                                        </div>
                                    </div>

                                    {/* Flags */}
                                    {(item.has_duplicate_portfolio || item.has_suspicious_links) && (
                                        <div className="flex flex-wrap gap-2 mb-3">
                                            {item.has_duplicate_portfolio && (
                                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                    ⚠️ Portfólio Duplicado
                                                </span>
                                            )}
                                            {item.has_suspicious_links && (
                                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                                    ⚠️ Links Suspeitos
                                                </span>
                                            )}
                                        </div>
                                    )}

                                    {/* Status Badge */}
                                    <div className="flex items-center space-x-2">
                                        {item.status === 'pending' && (
                                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                                Pendente
                                            </span>
                                        )}
                                        {item.status === 'approved' && (
                                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                Aprovado
                                            </span>
                                        )}
                                        {item.status === 'rejected' && (
                                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                Rejeitado
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Action Button */}
                                <button
                                    onClick={() => navigate(`/admin/approvals/${item.editor_id}`)}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center space-x-2"
                                >
                                    <span>Analisar</span>
                                    <ExternalLink className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
