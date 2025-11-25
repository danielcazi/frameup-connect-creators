import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAdmin } from '@/hooks/useAdmin';
import {
    getEditorApprovalDetails,
    approveEditor,
    rejectEditor,
    runAutoChecks,
} from '@/services/adminApprovals';
import { EditorApprovalDetails } from '@/types/admin';
import {
    ArrowLeft,
    CheckCircle,
    XCircle,
    ExternalLink,
    Star,
    AlertTriangle,
    Video,
    Code,
    MapPin,
} from 'lucide-react';

export default function EditorApprovalDetail() {
    const { editorId } = useParams<{ editorId: string }>();
    const navigate = useNavigate();
    const { admin } = useAdmin();
    const [loading, setLoading] = useState(true);
    const [details, setDetails] = useState<EditorApprovalDetails | null>(null);
    const [portfolioScore, setPortfolioScore] = useState(5);
    const [profileScore, setProfileScore] = useState(5);
    const [notes, setNotes] = useState('');
    const [rejectionReason, setRejectionReason] = useState('');
    const [showApproveModal, setShowApproveModal] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (editorId) {
            loadDetails();
        }
    }, [editorId]);

    const loadDetails = async () => {
        if (!editorId) return;

        setLoading(true);
        try {
            const data = await getEditorApprovalDetails(editorId);
            setDetails(data);

            // Executar verificações automáticas
            if (data?.status === 'pending') {
                await runAutoChecks(editorId);
            }
        } catch (error) {
            console.error('Erro ao carregar detalhes:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async () => {
        if (!editorId || !admin) return;

        setSubmitting(true);
        try {
            await approveEditor(editorId, admin.id, portfolioScore, profileScore, notes);
            alert('Editor aprovado com sucesso!');
            navigate('/admin/approvals');
        } catch (error) {
            alert('Erro ao aprovar editor');
        } finally {
            setSubmitting(false);
            setShowApproveModal(false);
        }
    };

    const handleReject = async () => {
        if (!editorId || !admin || !rejectionReason.trim()) return;

        setSubmitting(true);
        try {
            await rejectEditor(
                editorId,
                admin.id,
                rejectionReason,
                portfolioScore,
                profileScore
            );
            alert('Editor rejeitado');
            navigate('/admin/approvals');
        } catch (error) {
            alert('Erro ao rejeitar editor');
        } finally {
            setSubmitting(false);
            setShowRejectModal(false);
        }
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

    if (!details) {
        return (
            <div className="p-8">
                <div className="text-center py-12">
                    <p className="text-gray-500 text-lg">Editor não encontrado</p>
                    <button
                        onClick={() => navigate('/admin/approvals')}
                        className="mt-4 text-blue-600 hover:underline"
                    >
                        Voltar para fila
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8">
            {/* Header */}
            <div className="mb-8">
                <button
                    onClick={() => navigate('/admin/approvals')}
                    className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-4"
                >
                    <ArrowLeft className="w-5 h-5" />
                    <span>Voltar para fila</span>
                </button>

                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">
                            Análise de Editor
                        </h1>
                        <p className="text-gray-600">{details.editor.email}</p>
                    </div>

                    {details.status === 'pending' && (
                        <div className="flex space-x-3">
                            <button
                                onClick={() => setShowRejectModal(true)}
                                className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium flex items-center space-x-2"
                            >
                                <XCircle className="w-5 h-5" />
                                <span>Rejeitar</span>
                            </button>
                            <button
                                onClick={() => setShowApproveModal(true)}
                                className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium flex items-center space-x-2"
                            >
                                <CheckCircle className="w-5 h-5" />
                                <span>Aprovar</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Auto Flags */}
            {(details.has_duplicate_portfolio || details.has_suspicious_links) && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
                    <div className="flex items-start space-x-3">
                        <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5" />
                        <div>
                            <h3 className="font-semibold text-orange-900 mb-2">
                                Alertas Automáticos
                            </h3>
                            <ul className="space-y-1 text-sm text-orange-800">
                                {details.has_duplicate_portfolio && (
                                    <li>• Portfólio duplicado detectado</li>
                                )}
                                {details.has_suspicious_links && (
                                    <li>• Links suspeitos ou inválidos</li>
                                )}
                            </ul>
                        </div>
                    </div>
                </div>
            )}

            {/* Editor Info */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Profile Info */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold mb-4">Informações do Perfil</h3>

                    <div className="space-y-4">
                        <div>
                            <label className="text-sm text-gray-600">Nome</label>
                            <p className="font-medium">{details.editor.name}</p>
                        </div>

                        <div>
                            <label className="text-sm text-gray-600">Email</label>
                            <p className="font-medium">{details.editor.email}</p>
                        </div>

                        {(details.editor.city || details.editor.state) && (
                            <div>
                                <label className="text-sm text-gray-600 flex items-center space-x-1">
                                    <MapPin className="w-4 h-4" />
                                    <span>Localização</span>
                                </label>
                                <p className="font-medium">
                                    {details.editor.city}, {details.editor.state}
                                </p>
                            </div>
                        )}

                        <div>
                            <label className="text-sm text-gray-600">Bio</label>
                            <p className="text-gray-900">{details.editor.bio || 'Sem bio'}</p>
                        </div>

                        {details.editor.software_skills.length > 0 && (
                            <div>
                                <label className="text-sm text-gray-600 flex items-center space-x-1 mb-2">
                                    <Code className="w-4 h-4" />
                                    <span>Softwares</span>
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {details.editor.software_skills.map((skill) => (
                                        <span
                                            key={skill}
                                            className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                                        >
                                            {skill}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {details.editor.specialties.length > 0 && (
                            <div>
                                <label className="text-sm text-gray-600 mb-2 block">
                                    Especialidades
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {details.editor.specialties.map((spec) => (
                                        <span
                                            key={spec}
                                            className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm"
                                        >
                                            {spec}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Portfolio */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
                        <Video className="w-5 h-5" />
                        <span>Portfólio ({details.portfolio.length}/3)</span>
                    </h3>

                    <div className="space-y-4">
                        {details.portfolio.length === 0 ? (
                            <p className="text-gray-500 text-center py-8">Sem vídeos no portfólio</p>
                        ) : (
                            details.portfolio.map((video) => (
                                <div
                                    key={video.id}
                                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <div>
                                            <p className="font-medium text-gray-900">
                                                Vídeo {video.order_position}
                                            </p>
                                            <p className="text-sm text-gray-600">{video.video_type}</p>
                                        </div>
                                        <a
                                            href={video.video_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-600 hover:text-blue-700"
                                        >
                                            <ExternalLink className="w-5 h-5" />
                                        </a>
                                    </div>
                                    <p className="text-sm text-gray-700 mb-2">{video.title}</p>
                                    <p className="text-xs text-gray-500 truncate">{video.video_url}</p>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Scoring Section */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold mb-4">Avaliação</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Qualidade do Portfólio
                        </label>
                        <div className="flex items-center space-x-2">
                            {[1, 2, 3, 4, 5].map((score) => (
                                <button
                                    key={score}
                                    onClick={() => setPortfolioScore(score)}
                                    className={`p-2 ${portfolioScore >= score ? 'text-yellow-500' : 'text-gray-300'
                                        }`}
                                >
                                    <Star className="w-6 h-6 fill-current" />
                                </button>
                            ))}
                            <span className="text-sm text-gray-600 ml-2">
                                {portfolioScore}/5
                            </span>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Completude do Perfil
                        </label>
                        <div className="flex items-center space-x-2">
                            {[1, 2, 3, 4, 5].map((score) => (
                                <button
                                    key={score}
                                    onClick={() => setProfileScore(score)}
                                    className={`p-2 ${profileScore >= score ? 'text-yellow-500' : 'text-gray-300'
                                        }`}
                                >
                                    <Star className="w-6 h-6 fill-current" />
                                </button>
                            ))}
                            <span className="text-sm text-gray-600 ml-2">{profileScore}/5</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Approve Modal */}
            {showApproveModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                        <h3 className="text-xl font-bold mb-4">Aprovar Editor</h3>

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Notas do Revisor (opcional)
                            </label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                rows={4}
                                placeholder="Portfólio de alta qualidade. Editor demonstra experiência..."
                            />
                        </div>

                        <div className="flex space-x-3">
                            <button
                                onClick={() => setShowApproveModal(false)}
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleApprove}
                                disabled={submitting}
                                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50"
                            >
                                {submitting ? 'Aprovando...' : 'Confirmar Aprovação'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reject Modal */}
            {showRejectModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                        <h3 className="text-xl font-bold mb-4">Rejeitar Editor</h3>

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Motivo da Rejeição *
                            </label>
                            <textarea
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                rows={4}
                                placeholder="Portfólio não atende aos padrões mínimos..."
                                required
                            />
                        </div>

                        <div className="flex space-x-3">
                            <button
                                onClick={() => setShowRejectModal(false)}
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleReject}
                                disabled={submitting || !rejectionReason.trim()}
                                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg disabled:opacity-50"
                            >
                                {submitting ? 'Rejeitando...' : 'Confirmar Rejeição'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
