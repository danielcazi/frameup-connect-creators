import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAdmin } from '@/hooks/useAdmin';
import {
    getDisputeDetails,
    sendDisputeMessage,
    resolveDispute,
    assignDispute,
} from '@/services/adminDisputes';
import { DisputeWithDetails, DisputeResolutionType } from '@/types/admin';
import {
    ArrowLeft,
    Send,
    User,
    Clock,
    DollarSign,
    CheckCircle,
    XCircle,
    AlertTriangle,
    MessageSquare,
    Shield,
    FileText,
    Lock,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function DisputeDetail() {
    const { disputeId } = useParams<{ disputeId: string }>();
    const navigate = useNavigate();
    const { admin, hasPermission } = useAdmin();

    const [loading, setLoading] = useState(true);
    const [dispute, setDispute] = useState<DisputeWithDetails | null>(null);
    const [newMessage, setNewMessage] = useState('');
    const [isInternalMessage, setIsInternalMessage] = useState(false);
    const [sendingMessage, setSendingMessage] = useState(false);

    // Resolution state
    const [showResolveModal, setShowResolveModal] = useState(false);
    const [resolutionType, setResolutionType] = useState<DisputeResolutionType>('no_action');
    const [resolutionText, setResolutionText] = useState('');
    const [refundAmount, setRefundAmount] = useState<string>('');
    const [transferAmount, setTransferAmount] = useState<string>('');
    const [resolving, setResolving] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (disputeId) {
            loadDispute();
            subscribeToMessages();
        }
        return () => {
            supabase.removeAllChannels();
        };
    }, [disputeId]);

    useEffect(() => {
        scrollToBottom();
    }, [dispute?.messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const loadDispute = async () => {
        if (!disputeId) return;
        setLoading(true);
        try {
            const data = await getDisputeDetails(disputeId);
            setDispute(data);
        } catch (error) {
            console.error('Erro ao carregar disputa:', error);
        } finally {
            setLoading(false);
        }
    };

    const subscribeToMessages = () => {
        if (!disputeId) return;

        const channel = supabase
            .channel(`dispute_messages:${disputeId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'dispute_messages',
                    filter: `dispute_id=eq.${disputeId}`,
                },
                (payload) => {
                    setDispute((prev) => {
                        if (!prev) return null;
                        // Avoid duplicates if necessary, though simple append works for now
                        const newMessage = payload.new as any;
                        return {
                            ...prev,
                            messages: [...prev.messages, newMessage],
                        };
                    });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!disputeId || !admin || !newMessage.trim()) return;

        setSendingMessage(true);
        try {
            await sendDisputeMessage(
                disputeId,
                admin.user_id, // Assuming admin.user_id maps to auth.users.id
                newMessage,
                isInternalMessage
            );
            setNewMessage('');
            // Message will be added via subscription
        } catch (error) {
            console.error('Erro ao enviar mensagem:', error);
            alert('Erro ao enviar mensagem');
        } finally {
            setSendingMessage(false);
        }
    };

    const handleAssignToMe = async () => {
        if (!disputeId || !admin) return;
        try {
            await assignDispute(disputeId, admin.id);
            loadDispute(); // Reload to update status and assigned_to
        } catch (error) {
            console.error('Erro ao atribuir disputa:', error);
            alert('Erro ao atribuir disputa');
        }
    };

    const handleResolve = async () => {
        if (!disputeId || !admin) return;

        setResolving(true);
        try {
            await resolveDispute(
                disputeId,
                admin.id,
                resolutionText,
                resolutionType,
                refundAmount ? parseFloat(refundAmount) : undefined,
                transferAmount ? parseFloat(transferAmount) : undefined
            );
            setShowResolveModal(false);
            loadDispute();
            alert('Disputa resolvida com sucesso');
        } catch (error) {
            console.error('Erro ao resolver disputa:', error);
            alert('Erro ao resolver disputa');
        } finally {
            setResolving(false);
        }
    };

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
            </div>
        );
    }

    if (!dispute) {
        return (
            <div className="p-8 text-center">
                <p className="text-gray-500">Disputa não encontrada</p>
                <button onClick={() => navigate('/admin/disputes')} className="text-blue-600 mt-4">
                    Voltar para lista
                </button>
            </div>
        );
    }

    const isResolved = dispute.status === 'resolved' || dispute.status === 'closed';

    return (
        <div className="p-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-6">
                <button
                    onClick={() => navigate('/admin/disputes')}
                    className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-4"
                >
                    <ArrowLeft className="w-5 h-5" />
                    <span>Voltar para lista</span>
                </button>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center space-x-3 mb-2">
                            <h1 className="text-2xl font-bold text-gray-900">
                                Disputa #{dispute.id.slice(0, 8)}
                            </h1>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium uppercase
                ${dispute.status === 'open' ? 'bg-red-100 text-red-800' :
                                    dispute.status === 'resolved' ? 'bg-green-100 text-green-800' :
                                        'bg-blue-100 text-blue-800'}`}>
                                {dispute.status.replace('_', ' ')}
                            </span>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium uppercase
                ${dispute.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                                    dispute.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                                        'bg-gray-100 text-gray-800'}`}>
                                {dispute.priority}
                            </span>
                        </div>
                        <p className="text-gray-600">{dispute.title}</p>
                    </div>

                    <div className="flex items-center space-x-3">
                        {!isResolved && !dispute.assigned_to && (
                            <button
                                onClick={handleAssignToMe}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                Atribuir a mim
                            </button>
                        )}
                        {!isResolved && (
                            <button
                                onClick={() => setShowResolveModal(true)}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                            >
                                <CheckCircle className="w-4 h-4" />
                                <span>Resolver Disputa</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Details & Info */}
                <div className="space-y-6">
                    {/* Project Info */}
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
                            <FileText className="w-5 h-5 text-gray-500" />
                            <span>Detalhes do Projeto</span>
                        </h3>
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs text-gray-500 uppercase">Projeto</label>
                                <p className="font-medium">{dispute.project.title}</p>
                            </div>
                            <div className="flex justify-between">
                                <div>
                                    <label className="text-xs text-gray-500 uppercase">Valor</label>
                                    <p className="font-medium">R$ {dispute.project.base_price.toFixed(2)}</p>
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 uppercase">Status</label>
                                    <p className="font-medium capitalize">{dispute.project.status}</p>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 uppercase">Categoria da Disputa</label>
                                <p className="font-medium capitalize">{dispute.category.replace('_', ' ')}</p>
                            </div>
                        </div>
                    </div>

                    {/* Involved Parties */}
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
                            <User className="w-5 h-5 text-gray-500" />
                            <span>Partes Envolvidas</span>
                        </h3>

                        <div className="space-y-6">
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-gray-500">Reclamante (Abriu)</span>
                                    <span className="text-xs bg-gray-100 px-2 py-1 rounded uppercase">
                                        {dispute.opened_by_user.type}
                                    </span>
                                </div>
                                <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                                        {dispute.opened_by_user.email[0].toUpperCase()}
                                    </div>
                                    <div className="overflow-hidden">
                                        <p className="font-medium truncate">{dispute.opened_by_user.email}</p>
                                        <p className="text-xs text-gray-500">ID: {dispute.opened_by_user.id.slice(0, 8)}...</p>
                                    </div>
                                </div>
                            </div>

                            <div className="border-t border-gray-100 pt-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-gray-500">Reclamado</span>
                                    <span className="text-xs bg-gray-100 px-2 py-1 rounded uppercase">
                                        {dispute.disputed_user.type}
                                    </span>
                                </div>
                                <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold">
                                        {dispute.disputed_user.email[0].toUpperCase()}
                                    </div>
                                    <div className="overflow-hidden">
                                        <p className="font-medium truncate">{dispute.disputed_user.email}</p>
                                        <p className="text-xs text-gray-500">ID: {dispute.disputed_user.id.slice(0, 8)}...</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Resolution Info (if resolved) */}
                    {isResolved && (
                        <div className="bg-green-50 rounded-lg border border-green-200 p-6">
                            <h3 className="text-lg font-semibold text-green-900 mb-4 flex items-center space-x-2">
                                <Shield className="w-5 h-5" />
                                <span>Resolução</span>
                            </h3>
                            <div className="space-y-3">
                                <div>
                                    <label className="text-xs text-green-700 uppercase">Tipo</label>
                                    <p className="font-medium text-green-900 capitalize">
                                        {dispute.resolution_type?.replace('_', ' ')}
                                    </p>
                                </div>
                                <div>
                                    <label className="text-xs text-green-700 uppercase">Decisão</label>
                                    <p className="text-green-900 text-sm">{dispute.resolution}</p>
                                </div>
                                <div className="text-xs text-green-700 pt-2 border-t border-green-200">
                                    Resolvido em {new Date(dispute.resolved_at!).toLocaleDateString()}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Column: Chat & Activity */}
                <div className="lg:col-span-2 flex flex-col h-[600px] bg-white rounded-lg border border-gray-200 shadow-sm">
                    <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-lg">
                        <h3 className="font-semibold flex items-center space-x-2">
                            <MessageSquare className="w-5 h-5 text-gray-500" />
                            <span>Histórico e Mensagens</span>
                        </h3>
                        <span className="text-xs text-gray-500">
                            {dispute.messages.length} mensagens
                        </span>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
                        {/* Initial Dispute Description */}
                        <div className="flex justify-center">
                            <div className="bg-white border border-gray-200 rounded-lg p-4 max-w-2xl w-full shadow-sm">
                                <div className="flex items-center space-x-2 mb-2 border-b border-gray-100 pb-2">
                                    <AlertTriangle className="w-4 h-4 text-red-500" />
                                    <span className="font-semibold text-sm">Descrição da Disputa</span>
                                    <span className="text-xs text-gray-400 ml-auto">
                                        {new Date(dispute.created_at).toLocaleString()}
                                    </span>
                                </div>
                                <p className="text-gray-700 whitespace-pre-wrap">{dispute.description}</p>
                            </div>
                        </div>

                        {dispute.messages.map((msg) => {
                            const isMe = msg.sender_id === admin?.user_id;
                            const isInternal = msg.is_internal;

                            return (
                                <div
                                    key={msg.id}
                                    className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div
                                        className={`max-w-[80%] rounded-lg p-3 shadow-sm ${isInternal
                                                ? 'bg-yellow-50 border border-yellow-200'
                                                : isMe
                                                    ? 'bg-blue-600 text-white'
                                                    : 'bg-white border border-gray-200'
                                            }`}
                                    >
                                        <div className="flex items-center space-x-2 mb-1">
                                            {isInternal && <Lock className="w-3 h-3 text-yellow-600" />}
                                            <span className={`text-xs font-medium ${isInternal ? 'text-yellow-800' : isMe ? 'text-blue-100' : 'text-gray-500'
                                                }`}>
                                                {isMe ? 'Você (Admin)' : msg.sender_id === dispute.opened_by ? 'Reclamante' : 'Reclamado'}
                                            </span>
                                            <span className={`text-xs ${isInternal ? 'text-yellow-600' : isMe ? 'text-blue-200' : 'text-gray-400'
                                                }`}>
                                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <p className={`text-sm whitespace-pre-wrap ${isInternal ? 'text-yellow-900' : isMe ? 'text-white' : 'text-gray-800'
                                            }`}>
                                            {msg.message}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Message Input */}
                    {!isResolved && (
                        <div className="p-4 border-t border-gray-200 bg-white rounded-b-lg">
                            <form onSubmit={handleSendMessage} className="space-y-3">
                                <div className="flex items-center space-x-2 mb-2">
                                    <label className="flex items-center space-x-2 text-sm text-gray-600 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={isInternalMessage}
                                            onChange={(e) => setIsInternalMessage(e.target.checked)}
                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <div className="flex items-center space-x-1">
                                            <Lock className="w-3 h-3" />
                                            <span>Mensagem Interna (apenas admins)</span>
                                        </div>
                                    </label>
                                </div>

                                <div className="flex space-x-2">
                                    <textarea
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        placeholder={isInternalMessage ? "Digite uma nota interna..." : "Digite uma mensagem para as partes..."}
                                        className={`flex-1 p-3 border rounded-lg focus:ring-2 focus:border-transparent resize-none h-24 ${isInternalMessage
                                                ? 'bg-yellow-50 border-yellow-200 focus:ring-yellow-500 placeholder-yellow-400'
                                                : 'border-gray-300 focus:ring-blue-500'
                                            }`}
                                        disabled={sendingMessage}
                                    />
                                    <button
                                        type="submit"
                                        disabled={sendingMessage || !newMessage.trim()}
                                        className={`px-4 rounded-lg flex items-center justify-center transition-colors ${isInternalMessage
                                                ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                                                : 'bg-blue-600 hover:bg-blue-700 text-white'
                                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                                    >
                                        {sendingMessage ? (
                                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                                        ) : (
                                            <Send className="w-5 h-5" />
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}
                </div>
            </div>

            {/* Resolve Modal */}
            {showResolveModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-gray-900">Resolver Disputa</h3>
                            <button
                                onClick={() => setShowResolveModal(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <XCircle className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Tipo de Resolução
                                </label>
                                <select
                                    value={resolutionType}
                                    onChange={(e) => setResolutionType(e.target.value as DisputeResolutionType)}
                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="no_action">Sem Ação (Fechar)</option>
                                    <option value="refund_full">Reembolso Total (Creator)</option>
                                    <option value="refund_partial">Reembolso Parcial</option>
                                    <option value="payment_released">Liberar Pagamento (Editor)</option>
                                    <option value="warning_issued">Emitir Aviso</option>
                                    <option value="user_banned">Banir Usuário</option>
                                    <option value="other">Outro</option>
                                </select>
                            </div>

                            {(resolutionType === 'refund_partial' || resolutionType === 'refund_full') && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Valor do Reembolso (R$)
                                    </label>
                                    <div className="relative">
                                        <DollarSign className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={refundAmount}
                                            onChange={(e) => setRefundAmount(e.target.value)}
                                            className="w-full pl-9 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                            placeholder="0.00"
                                        />
                                    </div>
                                    {resolutionType === 'refund_full' && (
                                        <p className="text-xs text-gray-500 mt-1">
                                            Valor total do projeto: R$ {dispute.project.base_price.toFixed(2)}
                                        </p>
                                    )}
                                </div>
                            )}

                            {resolutionType === 'payment_released' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Valor a Liberar (R$)
                                    </label>
                                    <div className="relative">
                                        <DollarSign className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={transferAmount}
                                            onChange={(e) => setTransferAmount(e.target.value)}
                                            className="w-full pl-9 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Decisão e Justificativa
                                </label>
                                <textarea
                                    value={resolutionText}
                                    onChange={(e) => setResolutionText(e.target.value)}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 h-32 resize-none"
                                    placeholder="Explique a decisão tomada..."
                                    required
                                />
                            </div>

                            <div className="flex space-x-3 pt-4">
                                <button
                                    onClick={() => setShowResolveModal(false)}
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 font-medium"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleResolve}
                                    disabled={resolving || !resolutionText.trim()}
                                    className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium disabled:opacity-50"
                                >
                                    {resolving ? 'Processando...' : 'Confirmar Resolução'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
