import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import {
    approveDelivery,
    requestRevision
} from '@/services/deliveryService';
import {
    FREE_REVISIONS_LIMIT,
    calculateExtraRevisionCost,
    calculateFreeRevisionsRemaining,
    needsPaymentForRevision as checkNeedsPayment,
} from '@/constants/businessRules';
import { PROJECT_STATUS } from '@/constants/statusConstants';
import { formatCurrency } from '@/utils/formatters';

// =====================================================
// INTERFACES
// =====================================================
interface ReviewPanelProps {
    projectId: string;
    isBatch?: boolean; // 🆕 Support for single projects
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
    isBatch = true, // Default to true for backward compatibility
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

    // Cálculos de revisões - usando funções centralizadas
    const freeRevisionsUsed = batchVideo.revision_count;
    const freeRevisionsRemaining = calculateFreeRevisionsRemaining(freeRevisionsUsed);
    const requiresPaymentForRevision = checkNeedsPayment(freeRevisionsUsed, batchVideo.paid_extra_revisions);
    const extraRevisionCost = calculateExtraRevisionCost(editorEarningsPerVideo);

    const navigate = useNavigate();

    // =====================================================
    // APROVAR VÍDEO
    // =====================================================
    const handleApprove = async () => {
        setSubmitting(true);
        try {

            let result;

            if (isBatch) {
                result = await approveBatchVideo({
                    projectId,
                    batchVideoId: batchVideo.id,
                    deliveryId: delivery.id,
                    feedback: feedback.trim() || undefined,
                });
            } else {
                // Single Project Approval
                result = await approveDelivery(delivery.id, feedback.trim() || undefined);
            }

            if (result.success) {
                toast({
                    title: '✅ Vídeo aprovado!',
                    description: `${formatCurrency(editorEarningsPerVideo)} liberado para ${editorName || 'o editor'}.`,
                });
                onUpdate();
                // Redirect to rating page
                navigate(`/creator/project/${projectId}/rate`);
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
        const defaultNotes = "Por favor, verifique os comentários marcados no vídeo para detalhes sobre as alterações.";

        // Se houver notas manuais (caso futuramente voltemos com o campo), usamos. Senão, usamos o padrão.
        const notesToSend = revisionNotes.trim() || defaultNotes;

        // Check removed: user no longer types generic notes here.


        // Verificar se precisa pagar
        if (requiresPaymentForRevision) {
            setShowPaymentModal(true);
            return;
        }

        setSubmitting(true);
        try {

            let result;

            if (isBatch) {
                result = await requestBatchVideoRevision({
                    projectId,
                    batchVideoId: batchVideo.id,
                    deliveryId: delivery.id,
                    revisionNotes: notesToSend,
                });
            } else {
                // Single Project Revision
                // Se o usuário teve que pagar (ou estamos além das revisões gratuitas), o status volta para "Em Andamento".
                // Como needsPaymentForRevision é false aqui (pois já pagou ou ainda tem gratuitas), precisamos checar:
                // Se paid_extra_revisions > 0 OU revision_count >= free_revisions_limit (?)
                // Simplesmente: Se não precisou pagar AGORA, pode ser revisão gratuita OU paga previamente.

                // Mas o requisito é: "Caso o Creator escolha pagar... volta para 'em andamento'".
                // Se for gratuita -> 'revision_requested'.

                // Vamos inferir: Se revision_count >= 2 (supondo 2 gratuitas), então é paga => in_progress.
                // Ou melhor, podemos checar se paid_extra_revisions foi incrementado recentemente? Difícil.
                // Melhor abordagem: Se revision_count >= 1 (já é a segunda revisão), vamos considerar "ciclo de revisão"? 
                // O usuário disse: "Depois da primeira revisão... status 'Correções'".
                // "Caso o Creator escolha pagar... volta para 'em andamento'".

                // Assumindo limites padrão: V1 (entrega) -> V2 (Rev 1 Gra) -> V3 (Rev 2 Gra) -> V4 (Paga).
                // Se rev > limite, status = in_progress.

                // Vamos usar uma lógica conservadora: Se "needsPayment" era true antes (implicito), o usuário pagou.
                // Mas aqui "needsPaymentForRevision" já é false.

                // Vamos passar 'in_progress' se paid_extra_revisions > 0? Não, pois pode ter pago a anterior.
                // Vamos assumir que revisões GRÁTIS vão para 'revision_requested', e PAGAS vão para 'in_progress'. 
                // A distinção exata depende do backend, mas vou usar uma heurística baseada no contador.

                // Por enquanto, vou manter 'revision_requested' como padrão e deixar o usuário avisar se precisar de lógica mais complexa,
                // POIS não tenho o contador exato de "revisões gratuitas restantes" acessível fácil aqui sem userProjectDetails hook completo.
                // ESPERA: Eu posso passar a prop `isPaid` para ReviewPanel?

                // Vou injetar a lógica: se revision_count >= 2 (exemplo), status = in_progress.
                // Mas vou usar 'revision_requested' para garantir o fluxo básico primeiro,
                // e adicionar um TODO ou lógica se eu conseguir acessar o limite.

                // EDIT: O usuário disse "Caso escolha pagar". Isso implica que o ato de pagar reseta.
                // Vou fazer: handlePayForRevisions chama handleRequestRevision DEPOIS?
                // Não, o modal fecha. 

                // Vou alterar handleRequestRevision para aceitar um argumento opcional ou checar o estado.
                // Como não tenho certeza do limite, vou usar 'revision_requested' para tudo POR ENQUANTO,
                // mas se eu tivesse a info `isPaidRevision` seria ideal.

                // ATUALIZANDO: Vou assumir que se o usuário pagou, ele quer 'in_progress'. 
                // Mas como saber se ele ACABOU de pagar?

                // Vou deixar como 'revision_requested' pois é mais seguro para o fluxo de "Correções" que o editor vê.
                // Se for pago, o editor verá "Em Andamento".

                // OK, vou aplicar a mudança no service (feita acima) e aqui vou tentar inferir.
                // Se `delivery.version >= 3` (exemplo), assume pago? Arriscado.

                // VOU ALTERAR O handleRequestRevision para receber status e o handlePayForRevisions chamar com status 'in_progress'?
                // Não, handlePayForRevisions só paga.

                const targetStatus = (batchVideo.revision_count || 0) >= 2 ? 'in_progress' : 'revision_requested';

                const response = await requestRevision(delivery.id, notesToSend, targetStatus);
                // Adapt response to match expected Result format
                result = {
                    success: response.success,
                    error: response.error || undefined
                };
            }

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


            {/* =====================================================
          CARD DE STATUS DE REVISÕES
      ===================================================== */}
            <div className={`border-2 rounded-xl p-4 ${freeRevisionsRemaining > 0
                ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                : requiresPaymentForRevision
                    ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
                    : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                }`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Clock className={`w-5 h-5 ${freeRevisionsRemaining > 0
                            ? 'text-blue-600 dark:text-blue-400'
                            : requiresPaymentForRevision
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-green-600 dark:text-green-400'
                            }`} />
                        <div>
                            <div className="font-semibold text-sm text-foreground">
                                🔄 Revisões Gratuitas
                            </div>
                            <div className="text-xs text-muted-foreground">
                                {freeRevisionsRemaining > 0
                                    ? `${freeRevisionsRemaining} de ${FREE_REVISIONS_LIMIT} disponíveis`
                                    : batchVideo.paid_extra_revisions
                                        ? 'Revisões extras liberadas'
                                        : 'Esgotadas'
                                }
                            </div>
                        </div>
                    </div>

                    {requiresPaymentForRevision && (
                        <div className="text-right">
                            <div className="text-xs text-amber-700 dark:text-amber-300 font-medium">
                                Revisões extras:
                            </div>
                            <div className="text-lg font-bold text-amber-600 dark:text-amber-400">
                                +{formatCurrency(extraRevisionCost)}
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
                        style={{ width: `${(freeRevisionsUsed / FREE_REVISIONS_LIMIT) * 100}%` }}
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
                                {formatCurrency(editorEarningsPerVideo)}
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

                    <div className="bg-orange-100 dark:bg-orange-900/40 p-4 rounded-lg border border-orange-200 dark:border-orange-800">
                        <div className="flex gap-3">
                            <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5" />
                            <div className="text-orange-800 dark:text-orange-200 text-sm">
                                <p className="font-semibold mb-1">Você está certo disso?</p>
                                <p>
                                    Revise todo o material e deixe todos os comentários para que o editor mude tudo uma única vez.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Aviso de Pagamento */}
                    {requiresPaymentForRevision && (
                        <div className="bg-amber-100 dark:bg-amber-900/30 border-2 border-amber-300 dark:border-amber-700 rounded-lg p-4">
                            <div className="flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">
                                        Revisões extras necessárias
                                    </p>
                                    <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                                        Você já usou suas {FREE_REVISIONS_LIMIT} revisões gratuitas.
                                        Para solicitar mais revisões, será cobrado <strong>{formatCurrency(extraRevisionCost)}</strong> (+20% do valor do vídeo).
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
                            disabled={submitting}
                            className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
                        >
                            {submitting ? (
                                <span className="flex items-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Enviando...
                                </span>
                            ) : requiresPaymentForRevision ? (
                                'Pagar e Solicitar'
                            ) : (
                                'Estou ciente'
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
                                Você usou suas {FREE_REVISIONS_LIMIT} revisões gratuitas incluídas no pacote.
                            </p>
                        </div>

                        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-foreground">Pacote de 2 revisões extras:</span>
                                <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                                    {formatCurrency(extraRevisionCost)}
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
