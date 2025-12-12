import { useState } from 'react';
import {
    CheckCircle,
    XCircle,
    MessageSquare,
    DollarSign,
    ExternalLink,
    AlertCircle,
    Clock,
    Play
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
    approveBatchVideo,
    requestBatchVideoRevision,
    payForExtraRevisions
} from '@/services/batchDeliveryService';

// =====================================================
// INTERFACES
// =====================================================
interface ReviewPanelProps {
    projectId: string;
    batchVideo: {
        id: string;
        sequence_order: number;
        title: string;
        revision_count: number;
        paid_extra_revisions: boolean;
        specific_instructions?: string;
    };
    delivery: {
        id: string;
        video_url: string;
        notes?: string;
        version: number;
        delivered_at: string;
    };
    editorEarningsPerVideo: number;
    editorName?: string;
    onUpdate: () => void;
}

type ActionMode = 'idle' | 'approve' | 'revision';

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================
export function ReviewPanel({
    projectId,
    batchVideo,
    delivery,
    editorEarningsPerVideo,
    editorName,
    onUpdate
}: ReviewPanelProps) {
    const { toast } = useToast();
    const [feedback, setFeedback] = useState('');
    const [revisionNotes, setRevisionNotes] = useState('');
    const [action, setAction] = useState<ActionMode>('idle');
    const [submitting, setSubmitting] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);

    // Cálculos de revisões
    const FREE_REVISIONS = 2;
    const freeRevisionsUsed = batchVideo.revision_count;
    const freeRevisionsRemaining = Math.max(0, FREE_REVISIONS - freeRevisionsUsed);
    const needsPaymentForRevision = freeRevisionsUsed >= FREE_REVISIONS && !batchVideo.paid_extra_revisions;
    const extraRevisionCost = editorEarningsPerVideo * 0.2;

    // =====================================================
    // APROVAR VÍDEO
    // =====================================================
    const handleApprove = async () => {
        setSubmitting(true);
        try {
            const result = await approveBatchVideo({
                projectId,
                batchVideoId: batchVideo.id,
                deliveryId: delivery.id,
                feedback: feedback.trim() || undefined,
            });

            if (result.success) {
                toast({
                    title: '✅ Vídeo aprovado!',
                    description: `R$ ${editorEarningsPerVideo.toFixed(2)} liberado para ${editorName || 'o editor'}.`,
                });
                onUpdate();
            } else {
                throw new Error(result.error || 'Falha ao aprovar');
            }
        } catch (error: any) {
            console.error('Erro ao aprovar:', error);
            toast({
                variant: 'destructive',
                title: 'Erro ao aprovar',
                description: error.message || 'Tente novamente.',
            });
        } finally {
            setSubmitting(false);
            setAction('idle');
        }
    };

    // =====================================================
    // SOLICITAR REVISÃO
    // =====================================================
    const handleRequestRevision = async () => {
        if (!revisionNotes.trim()) {
            toast({
                variant: 'destructive',
                title: 'Descrição obrigatória',
                description: 'Descreva as alterações necessárias para o editor.',
            });
            return;
        }

        // Verificar se precisa pagar
        if (needsPaymentForRevision) {
            setShowPaymentModal(true);
            return;
        }

        setSubmitting(true);
        try {
            const result = await requestBatchVideoRevision({
                projectId,
                batchVideoId: batchVideo.id,
                deliveryId: delivery.id,
                revisionNotes: revisionNotes.trim(),
            });

            if (result.success) {
                toast({
                    title: '🔄 Revisão solicitada',
                    description: `${editorName || 'O editor'} foi notificado dos ajustes necessários.`,
                });
                onUpdate();
            } else if (result.needsPayment) {
                setShowPaymentModal(true);
            } else {
                throw new Error(result.error || 'Falha ao solicitar revisão');
            }
        } catch (error: any) {
            console.error('Erro ao solicitar revisão:', error);
            toast({
                variant: 'destructive',
                title: 'Erro ao solicitar revisão',
                description: error.message || 'Tente novamente.',
            });
        } finally {
            setSubmitting(false);
        }
    };

    // =====================================================
    // PAGAR POR REVISÕES EXTRAS
    // =====================================================
    const handlePayForRevisions = async () => {
        setSubmitting(true);
        try {
            const result = await payForExtraRevisions({
                projectId,
                batchVideoId: batchVideo.id,
            });

            if (result.success) {
                toast({
                    title: '💳 Pagamento aprovado!',
                    description: 'Agora você pode solicitar mais revisões.',
                });
                setShowPaymentModal(false);

                // Tentar solicitar revisão novamente
                setTimeout(() => {
                    handleRequestRevision();
                }, 500);
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            console.error('Erro no pagamento:', error);
            toast({
                variant: 'destructive',
                title: 'Erro no pagamento',
                description: error.message || 'Tente novamente.',
            });
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">

            {/* =====================================================
          CARD DE PREVIEW DO VÍDEO
      ===================================================== */}
            <div className="border-2 border-border rounded-xl overflow-hidden bg-card">
                {/* Header */}
                <div className="bg-muted/50 p-4 border-b border-border">
                    <div className="flex items-center justify-between">
                        <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                            <Play className="w-5 h-5 text-primary" />
                            {batchVideo.title || `Vídeo #${batchVideo.sequence_order}`}
                        </h3>
                        <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-medium">
                            Versão {delivery.version}
                        </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                        Entregue em {new Date(delivery.delivered_at).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        })}
                    </p>
                </div>

                {/* Link do Vídeo */}
                <div className="p-4">
                    <a
                        href={delivery.video_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-4 bg-primary/5 hover:bg-primary/10 border-2 border-primary/20 hover:border-primary/40 rounded-lg transition-colors group"
                    >
                        <div className="p-3 bg-primary/10 rounded-full group-hover:bg-primary/20">
                            <ExternalLink className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex-1">
                            <div className="font-semibold text-foreground">🎬 Assistir Vídeo</div>
                            <div className="text-sm text-muted-foreground truncate max-w-xs">
                                {delivery.video_url}
                            </div>
                        </div>
                    </a>

                    {/* Notas do Editor */}
                    {delivery.notes && (
                        <div className="mt-4 p-4 bg-muted/30 rounded-lg border border-border">
                            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-2">
                                <MessageSquare className="w-3 h-3" />
                                Notas do Editor
                            </div>
                            <p className="text-sm text-foreground whitespace-pre-wrap">
                                {delivery.notes}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* =====================================================
          CARD DE STATUS DE REVISÕES
      ===================================================== */}
            <div className={`border-2 rounded-xl p-4 ${freeRevisionsRemaining > 0
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                    : needsPaymentForRevision
                        ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
                        : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                }`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Clock className={`w-5 h-5 ${freeRevisionsRemaining > 0
                                ? 'text-blue-600 dark:text-blue-400'
                                : needsPaymentForRevision
                                    ? 'text-amber-600 dark:text-amber-400'
                                    : 'text-green-600 dark:text-green-400'
                            }`} />
                        <div>
                            <div className="font-semibold text-sm text-foreground">
                                🔄 Revisões Gratuitas
                            </div>
                            <div className="text-xs text-muted-foreground">
                                {freeRevisionsRemaining > 0
                                    ? `${freeRevisionsRemaining} de ${FREE_REVISIONS} disponíveis`
                                    : batchVideo.paid_extra_revisions
                                        ? 'Revisões extras liberadas'
                                        : 'Esgotadas'
                                }
                            </div>
                        </div>
                    </div>

                    {needsPaymentForRevision && (
                        <div className="text-right">
                            <div className="text-xs text-amber-700 dark:text-amber-300 font-medium">
                                Revisões extras:
                            </div>
                            <div className="text-lg font-bold text-amber-600 dark:text-amber-400">
                                +R$ {extraRevisionCost.toFixed(2)}
                            </div>
                        </div>
                    )}
                </div>

                {/* Barra de progresso */}
                <div className="mt-3 w-full bg-background rounded-full h-2 overflow-hidden">
                    <div
                        className={`h-2 rounded-full transition-all ${freeRevisionsRemaining > 0
                                ? 'bg-blue-500'
                                : 'bg-amber-500'
                            }`}
                        style={{ width: `${(freeRevisionsUsed / FREE_REVISIONS) * 100}%` }}
                    />
                </div>
            </div>

            {/* =====================================================
          BOTÕES DE AÇÃO PRINCIPAL
      ===================================================== */}
            {action === 'idle' && (
                <div className="grid grid-cols-2 gap-4">
                    <Button
                        onClick={() => setAction('approve')}
                        size="lg"
                        className="bg-green-600 hover:bg-green-700 text-white font-semibold h-14"
                    >
                        <CheckCircle className="w-5 h-5 mr-2" />
                        Aprovar Vídeo
                    </Button>

                    <Button
                        onClick={() => setAction('revision')}
                        size="lg"
                        variant="outline"
                        className="border-2 border-orange-500 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 font-semibold h-14"
                    >
                        <XCircle className="w-5 h-5 mr-2" />
                        Pedir Revisão
                    </Button>
                </div>
            )}

            {/* =====================================================
          FORMULÁRIO DE APROVAÇÃO
      ===================================================== */}
            {action === 'approve' && (
                <div className="border-2 border-green-300 dark:border-green-700 rounded-xl p-6 bg-green-50 dark:bg-green-900/20 space-y-4">
                    <h4 className="font-bold text-green-800 dark:text-green-200 flex items-center gap-2">
                        <CheckCircle className="w-5 h-5" />
                        Aprovar e Liberar Pagamento
                    </h4>

                    <div>
                        <label className="block text-sm font-medium mb-2 text-foreground">
                            Feedback para o editor (opcional)
                        </label>
                        <textarea
                            value={feedback}
                            onChange={(e) => setFeedback(e.target.value)}
                            placeholder="Parabéns pelo trabalho! Ficou excelente..."
                            rows={3}
                            className="w-full px-4 py-3 border-2 border-input rounded-lg bg-background focus:border-green-500 focus:ring-2 focus:ring-green-500/20 resize-none"
                        />
                    </div>

                    {/* Card de Pagamento */}
                    <div className="bg-white dark:bg-card border-2 border-green-200 dark:border-green-800 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <DollarSign className="w-5 h-5 text-green-600" />
                                <span className="text-sm text-muted-foreground">Pagamento ao editor:</span>
                            </div>
                            <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                                R$ {editorEarningsPerVideo.toFixed(2)}
                            </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                            💡 O valor será creditado imediatamente na carteira do editor
                        </p>
                    </div>

                    <div className="flex gap-3">
                        <Button
                            onClick={() => setAction('idle')}
                            variant="outline"
                            className="flex-1"
                            disabled={submitting}
                        >
                            Voltar
                        </Button>
                        <Button
                            onClick={handleApprove}
                            disabled={submitting}
                            className="flex-1 bg-green-600 hover:bg-green-700"
                        >
                            {submitting ? (
                                <span className="flex items-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Aprovando...
                                </span>
                            ) : (
                                'Confirmar Aprovação'
                            )}
                        </Button>
                    </div>
                </div>
            )}

            {/* =====================================================
          FORMULÁRIO DE REVISÃO
      ===================================================== */}
            {action === 'revision' && (
                <div className="border-2 border-orange-300 dark:border-orange-700 rounded-xl p-6 bg-orange-50 dark:bg-orange-900/20 space-y-4">
                    <h4 className="font-bold text-orange-800 dark:text-orange-200 flex items-center gap-2">
                        <XCircle className="w-5 h-5" />
                        Solicitar Correções
                    </h4>

                    <div>
                        <label className="block text-sm font-medium mb-2 text-foreground">
                            Descreva todas as alterações necessárias *
                        </label>
                        <textarea
                            value={revisionNotes}
                            onChange={(e) => setRevisionNotes(e.target.value)}
                            placeholder="Liste todos os ajustes que o editor precisa fazer:&#10;&#10;1. Trocar a música de fundo&#10;2. Ajustar o corte no minuto 2:30&#10;3. Adicionar mais zoom no produto&#10;..."
                            rows={6}
                            className="w-full px-4 py-3 border-2 border-input rounded-lg bg-background focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 resize-none"
                            required
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                            💡 Seja específico para evitar mal-entendidos e agilizar a correção
                        </p>
                    </div>

                    {/* Aviso de Pagamento */}
                    {needsPaymentForRevision && (
                        <div className="bg-amber-100 dark:bg-amber-900/30 border-2 border-amber-300 dark:border-amber-700 rounded-lg p-4">
                            <div className="flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">
                                        Revisões extras necessárias
                                    </p>
                                    <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                                        Você já usou suas {FREE_REVISIONS} revisões gratuitas.
                                        Para solicitar mais revisões, será cobrado <strong>R$ {extraRevisionCost.toFixed(2)}</strong> (+20% do valor do vídeo).
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex gap-3">
                        <Button
                            onClick={() => {
                                setAction('idle');
                                setRevisionNotes('');
                            }}
                            variant="outline"
                            className="flex-1"
                            disabled={submitting}
                        >
                            Voltar
                        </Button>
                        <Button
                            onClick={handleRequestRevision}
                            disabled={submitting || !revisionNotes.trim()}
                            className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
                        >
                            {submitting ? (
                                <span className="flex items-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Enviando...
                                </span>
                            ) : needsPaymentForRevision ? (
                                'Pagar e Solicitar'
                            ) : (
                                'Solicitar Revisão'
                            )}
                        </Button>
                    </div>
                </div>
            )}

            {/* =====================================================
          MODAL DE PAGAMENTO POR REVISÕES EXTRAS
      ===================================================== */}
            {showPaymentModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-card border border-border rounded-xl max-w-md w-full p-6 space-y-5 shadow-xl">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                                <DollarSign className="w-8 h-8 text-amber-600 dark:text-amber-400" />
                            </div>
                            <h3 className="text-xl font-bold text-foreground">
                                Revisões Extras
                            </h3>
                            <p className="text-sm text-muted-foreground mt-2">
                                Você usou suas {FREE_REVISIONS} revisões gratuitas incluídas no pacote.
                            </p>
                        </div>

                        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-foreground">Pacote de 2 revisões extras:</span>
                                <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                                    R$ {extraRevisionCost.toFixed(2)}
                                </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">
                                20% do valor do vídeo • Válido para este vídeo
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <Button
                                onClick={() => setShowPaymentModal(false)}
                                variant="outline"
                                className="flex-1"
                                disabled={submitting}
                            >
                                Cancelar
                            </Button>
                            <Button
                                onClick={handlePayForRevisions}
                                disabled={submitting}
                                className="flex-1 bg-primary hover:bg-primary/90"
                            >
                                {submitting ? (
                                    <span className="flex items-center gap-2">
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Processando...
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-2">
                                        <DollarSign className="w-4 h-4" />
                                        Pagar Agora
                                    </span>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
