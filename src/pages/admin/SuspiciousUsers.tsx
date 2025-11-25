import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '@/hooks/useAdmin';
import { getSuspiciousUsers } from '@/services/adminWarnings';
import { AlertTriangle, Eye, Ban, ShieldAlert } from 'lucide-react';
import IssueWarningModal from '@/components/admin/IssueWarningModal';

export default function SuspiciousUsers() {
    const { hasPermission } = useAdmin();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [users, setUsers] = useState<any[]>([]);
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [showWarningModal, setShowWarningModal] = useState(false);

    useEffect(() => {
        if (hasPermission('view_users')) {
            loadUsers();
        }
    }, []);

    const loadUsers = async () => {
        setLoading(true);
        try {
            const data = await getSuspiciousUsers();
            setUsers(data || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const getScoreColor = (score: number) => {
        if (score >= 75) return 'bg-red-500';
        if (score >= 50) return 'bg-orange-500';
        if (score >= 25) return 'bg-yellow-500';
        return 'bg-green-500';
    };

    const handleOpenWarning = (userId: string) => {
        setSelectedUserId(userId);
        setShowWarningModal(true);
    };

    if (!hasPermission('view_users')) {
        return (
            <div className="p-8 text-center text-gray-500">
                Você não tem permissão para visualizar usuários.
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

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center space-x-3">
                    <ShieldAlert className="w-8 h-8 text-red-600" />
                    <span>Usuários com Comportamento Suspeito</span>
                </h1>
                <p className="text-gray-600">
                    Monitore usuários com padrões de comportamento problemáticos e alto risco.
                </p>
            </div>

            {/* Lista de usuários */}
            <div className="space-y-4">
                {users.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                        <p className="text-gray-500">Nenhum usuário suspeito encontrado.</p>
                    </div>
                ) : (
                    users.map((user) => (
                        <div
                            key={user.user_id}
                            className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow"
                        >
                            <div className="flex flex-col md:flex-row items-start justify-between gap-6">
                                <div className="flex-1 w-full">
                                    {/* User info */}
                                    <div className="flex items-center space-x-4 mb-6">
                                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-xl font-bold text-gray-600">
                                            {user.user?.email?.[0]?.toUpperCase() || '?'}
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-gray-900 text-lg">
                                                {user.user?.email || 'Email não disponível'}
                                            </h3>
                                            <p className="text-sm text-gray-500">
                                                ID: {user.user_id}
                                            </p>
                                        </div>
                                        {user.is_banned && (
                                            <span className="px-3 py-1 bg-red-100 text-red-800 text-xs font-bold uppercase rounded-full">
                                                Banido
                                            </span>
                                        )}
                                    </div>

                                    {/* Score bar */}
                                    <div className="mb-6">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm font-medium text-gray-700 flex items-center space-x-2">
                                                <AlertTriangle className="w-4 h-4 text-orange-500" />
                                                <span>Bias Score (Risco)</span>
                                            </span>
                                            <span className={`text-sm font-bold ${user.bias_score >= 75 ? 'text-red-600' :
                                                user.bias_score >= 50 ? 'text-orange-600' : 'text-gray-900'
                                                }`}>
                                                {user.bias_score}/100
                                            </span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-3">
                                            <div
                                                className={`h-3 rounded-full transition-all duration-500 ${getScoreColor(user.bias_score)}`}
                                                style={{ width: `${user.bias_score}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* Stats Grid */}
                                    <div className="grid grid-cols-3 gap-4 mb-6 bg-gray-50 p-4 rounded-lg">
                                        <div className="text-center">
                                            <span className="block text-2xl font-bold text-gray-900">{user.total_warnings}</span>
                                            <span className="text-xs text-gray-500 uppercase">Warnings</span>
                                        </div>
                                        {/* Placeholder stats - would need to fetch real project stats if not in metadata */}
                                        <div className="text-center border-l border-gray-200">
                                            <span className="block text-2xl font-bold text-gray-900">-</span>
                                            <span className="text-xs text-gray-500 uppercase">Disputas</span>
                                        </div>
                                        <div className="text-center border-l border-gray-200">
                                            <span className="block text-2xl font-bold text-gray-900">-</span>
                                            <span className="text-xs text-gray-500 uppercase">Cancelamentos</span>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex space-x-3">
                                        <button
                                            onClick={() => navigate(`/admin/users/${user.user_id}`)}
                                            className="flex-1 px-4 py-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg flex items-center justify-center space-x-2 transition-colors"
                                        >
                                            <Eye className="w-4 h-4" />
                                            <span>Ver Histórico</span>
                                        </button>
                                        {hasPermission('ban_users') && !user.is_banned && (
                                            <button
                                                onClick={() => handleOpenWarning(user.user_id)}
                                                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center justify-center space-x-2 transition-colors"
                                            >
                                                <Ban className="w-4 h-4" />
                                                <span>Aplicar Penalidade</span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {showWarningModal && selectedUserId && (
                <IssueWarningModal
                    userId={selectedUserId}
                    onClose={() => setShowWarningModal(false)}
                    onSuccess={loadUsers}
                />
            )}
        </div>
    );
}
