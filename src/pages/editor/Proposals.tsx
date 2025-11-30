import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    RefreshCw,
    Check,
    X,
    DollarSign,
    Calendar,
    MessageSquare,
    Loader2,
    Video,
    AlertTriangle,
    Briefcase,
    User,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRehireProposals } from '@/hooks/useRehire';
import { RehireProposal } from '@/services/rehireService';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { cn } from '@/lib/utils';

// Mapear tipos para labels
const videoTypeLabels: Record<string, string> = {
    reels: 'Reels/Shorts',
    motion: 'Motion Graphics',
    youtube: 'YouTube',
};

const editingStyleLabels: Record<string, string> = {
    lofi: 'Lo-Fi',
    dynamic: 'Dinâmico',
    pro: 'Profissional',
    motion: 'Motion',
};

const durationLabels: Record<string, string> = {
    '30s': '30 segundos',
    '1m': '1 minuto',
    '2m': '2 minutos',
    '5m': '5 minutos',
};

export default function EditorProposals() {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [respondingId, setRespondingId] = useState<string | null>(null);
    const [rejectReason, setRejectReason] = useState('');
    const [showRejectModal, setShowRejectModal] = useState<string | null>(null);

    const { proposals, pendingCount, loading, error, accept, reject, refresh } =
        useRehireProposals();

    const handleAccept = async (proposal: RehireProposal) => {
        setRespondingId(proposal.project_id);
        try {
            await accept(proposal.project_id);
            toast({
                title: 'Proposta aceita! 🎉',
                description: `Aguardando pagamento do creator para iniciar o projeto "${proposal.project_title}"`,
            });
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: error.message || 'Não foi possível aceitar a proposta.',
            });
        } finally {
            setRespondingId(null);
        }
    };

    const handleReject = async (projectId: string) => {
        setRespondingId(projectId);
        try {
            await reject(projectId, rejectReason || undefined);
            toast({
                title: 'Proposta recusada',
                description: 'O creator será notificado.',
            });
            setShowRejectModal(null);
            setRejectReason('');
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: error.message || 'Não foi possível recusar a proposta.',
            });
        } finally {
            setRespondingId(null);
        }
    };

    return (
        <DashboardLayout userType="editor">
            <div className="p-6 lg:p-8 max-w-5xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <RefreshCw className="w-6 h-6 text-blue-600" />
                        </div>
                        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
                            Propostas de Recontratação
                        </h1>
                        {pendingCount > 0 && (
                            <span className="px-3 py-1 bg-blue-600 text-white text-sm font-medium rounded-full">
                                {pendingCount} nova{pendingCount !== 1 ? 's' : ''}
                            </span>
                        )}
                    </div>
                    <p className="text-gray-600">
                        Creators que já trabalharam com você querem recontratar
                    </p>
                </div>

                {/* Content */}
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                    </div>
                ) : error ? (
                    <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                        <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-red-400" />
                        <p className="text-red-600 mb-4">{error}</p>
                        <button onClick={refresh} className="text-blue-600 hover:underline">
                            Tentar novamente
                        </button>
                    </div>
                ) : proposals.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                        <RefreshCw className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            Nenhuma proposta pendente
                        </h3>
                        <p className="text-gray-500 max-w-md mx-auto">
                            Quando creators com quem você já trabalhou quiserem recontratar você,
                            as propostas aparecerão aqui.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {proposals.map((proposal) => (
                            <ProposalCard
                                key={proposal.project_id}
                                proposal={proposal}
                                isResponding={respondingId === proposal.project_id}
                                onAccept={() => handleAccept(proposal)}
                                onReject={() => setShowRejectModal(proposal.project_id)}
                            />
                        ))}
                    </div>
                )}

                {/* Modal de recusa */}
                {showRejectModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div
                            className="absolute inset-0 bg-black/50"
                            onClick={() => setShowRejectModal(null)}
                        />
                        <div className="relative bg-white rounded-xl p-6 w-full max-w-md">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">
                                Recusar proposta
                            </h3>
                            <p className="text-gray-600 mb-4 text-sm">
                                Deseja informar um motivo? (opcional)
                            </p>
                            <textarea
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                placeholder="Ex: Estou com muitos projetos no momento..."
                                rows={3}
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none mb-4"
                            />
                            <div className="flex gap-3">
                                <button
                                    onClick={() => {
                                        setShowRejectModal(null);
                                        setRejectReason('');
                                    }}
                                    className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={() => handleReject(showRejectModal)}
                                    disabled={respondingId === showRejectModal}
                                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                                >
                                    {respondingId === showRejectModal ? (
                                        <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                                    ) : (
                                        'Recusar'
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}

// ================================================
// CARD DA PROPOSTA
// ================================================

interface ProposalCardProps {
    proposal: RehireProposal;
    isResponding: boolean;
    onAccept: () => void;
    onReject: () => void;
}

function ProposalCard({ proposal, isResponding, onAccept, onReject }: ProposalCardProps) {
    return (
        <div className="bg-white rounded-xl border border-blue-200 shadow-sm overflow-hidden">
            {/* Header - Info do Creator */}
            <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
                <div className="flex items-center gap-4">
                    {/* Avatar */}
                    {proposal.creator_photo ? (
                        <img
                            src={proposal.creator_photo}
                            alt={proposal.creator_name}
                            className="w-14 h-14 rounded-full object-cover border-2 border-white shadow"
                        />
                    ) : (
                        <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center border-2 border-white shadow">
                            <User className="w-7 h-7 text-blue-600" />
                        </div>
                    )}

                    <div className="flex-1">
                        <div className="flex items-center gap-2">
                            <p className="font-semibold text-gray-900">{proposal.creator_name}</p>
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full flex items-center gap-1">
                                <RefreshCw className="w-3 h-3" />
                                Recontratação
                            </span>
                        </div>
                        <p className="text-sm text-gray-600 flex items-center gap-1 mt-0.5">
                            <Briefcase className="w-3.5 h-3.5" />
                            {proposal.projects_with_creator} projeto{proposal.projects_with_creator !== 1 ? 's' : ''} juntos
                        </p>
                    </div>

                    <p className="text-xs text-gray-500">
                        {new Date(proposal.sent_at).toLocaleDateString('pt-BR')}
                    </p>
                </div>
            </div>

            {/* Projeto */}
            <div className="p-4">
                <h3 className="font-semibold text-gray-900 text-lg mb-2">
                    {proposal.project_title}
                </h3>
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {proposal.project_description}
                </p>

                {/* Detalhes */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    <div className="flex items-center gap-2 text-sm p-2 bg-gray-50 rounded-lg">
                        <Video className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-700">
                            {videoTypeLabels[proposal.video_type] || proposal.video_type}
                        </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm p-2 bg-gray-50 rounded-lg">
                        <span className="text-gray-700">
                            {editingStyleLabels[proposal.editing_style] || proposal.editing_style}
                        </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm p-2 bg-green-50 rounded-lg">
                        <DollarSign className="w-4 h-4 text-green-600" />
                        <span className="text-green-700 font-medium">
                            R$ {proposal.base_price.toFixed(2)}
                        </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm p-2 bg-gray-50 rounded-lg">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-700">
                            {proposal.deadline_days ? `${proposal.deadline_days} dias` : 'Sem prazo'}
                        </span>
                    </div>
                </div>

                {/* Mensagem do creator */}
                {proposal.rehire_message && (
                    <div className="p-3 bg-blue-50 rounded-lg mb-4">
                        <div className="flex items-start gap-2">
                            <MessageSquare className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-blue-800">{proposal.rehire_message}</p>
                        </div>
                    </div>
                )}

                {/* Ações */}
                <div className="flex gap-3 pt-4 border-t border-gray-100">
                    <button
                        onClick={onReject}
                        disabled={isResponding}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                        <X className="w-5 h-5" />
                        Recusar
                    </button>
                    <button
                        onClick={onAccept}
                        disabled={isResponding}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                        {isResponding ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <>
                                <Check className="w-5 h-5" />
                                Aceitar Proposta
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
